import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const CONFIGURED_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function isLocalDevelopmentHost(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || /^10(?:\.\d{1,3}){3}$/.test(hostname)
    || /^192\.168(?:\.\d{1,3}){2}$/.test(hostname)
    || /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(hostname);
}

function resolveApiBaseUrl() {
  const url = new URL(CONFIGURED_API_BASE_URL);
  if (
    Platform.OS === 'web'
    && typeof window !== 'undefined'
    && isLocalDevelopmentHost(window.location.hostname)
    && isLocalDevelopmentHost(url.hostname)
  ) {
    // Keep browser API requests on the page's host so Lax cookies remain same-site.
    url.hostname = window.location.hostname;
  }
  return url.toString().replace(/\/+$/, '');
}

const API_BASE_URL = resolveApiBaseUrl();
const REFRESH_INTERVAL_MS = 10_000;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/${path}`, {
    ...options,
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || Object.values(payload).flat().join(' ');
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return payload;
}

async function apiPost(path, body, csrfToken) {
  return apiRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(body),
  });
}

function formatUpdated(value) {
  if (!value) return 'Update time unavailable';
  return `Checked ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getJourneyProgress(bus, routeStops, boardingStopId, destinationStopId) {
  const boardingStop = routeStops.find((stop) => stop.stop_id === boardingStopId) || routeStops[0];
  const destinationStop = routeStops.find((stop) => stop.stop_id === destinationStopId)
    || routeStops[routeStops.length - 1];
  const currentIndex = routeStops.findIndex((stop) => stop.stop_id === bus?.current_stop_id);
  const boardingIndex = routeStops.findIndex((stop) => stop.stop_id === boardingStop?.stop_id);
  const destinationIndex = routeStops.findIndex((stop) => stop.stop_id === destinationStop?.stop_id);

  if (currentIndex < 0 || boardingIndex < 0 || destinationIndex < boardingIndex) {
    return { state: 'unknown', label: 'Route position unavailable', targetStopId: null };
  }
  if (currentIndex > destinationIndex) {
    return { state: 'passed', label: `Passed ${destinationStop.stop_name}`, targetStopId: null };
  }
  if (currentIndex === destinationIndex) {
    return { state: 'arrived', label: `Reached ${destinationStop.stop_name}`, targetStopId: null };
  }
  if (currentIndex < boardingIndex) {
    return { state: 'approaching', label: `On the way to ${boardingStop.stop_name}`, targetStopId: boardingStop.stop_id };
  }
  if (currentIndex === boardingIndex) {
    return {
      state: 'at_source',
      label: `At ${boardingStop.stop_name}`,
      targetStopId: destinationIndex > boardingIndex ? destinationStop.stop_id : null,
    };
  }
  return { state: 'departed', label: `Departed ${boardingStop.stop_name}`, targetStopId: destinationStop.stop_id };
}

function formatArrivalTime(eta) {
  if (eta?.eta_minutes == null) return '';
  const updatedAt = eta.last_updated_at ? new Date(eta.last_updated_at).getTime() : Date.now();
  if (!Number.isFinite(updatedAt)) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(updatedAt + eta.eta_minutes * 60_000));
}

function formatEtaDuration(minutes) {
  if (minutes <= 0) return 'less than 1 min';
  const totalMinutes = Math.ceil(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return [
    hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '',
    remainingMinutes ? `${remainingMinutes} min` : '',
  ].filter(Boolean).join(' ');
}

function PhoneLoginModal({ visible, onClose, onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || step !== 'code' || secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((remaining) => remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, step, visible]);

  const sendCode = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { csrf_token: csrfToken } = await apiRequest('auth/csrf/');
      const result = await apiPost(
        'auth/otp/request/',
        { phone_number: phoneNumber.trim() },
        csrfToken,
      );
      setCode('');
      setStep('code');
      setSecondsLeft(result.expires_in);
      setMessage('Your one-minute code was printed to the backend terminal.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    setError('');
    try {
      const { csrf_token: csrfToken } = await apiRequest('auth/csrf/');
      await apiPost(
        'auth/otp/verify/',
        { phone_number: phoneNumber.trim(), code },
        csrfToken,
      );
      onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPhoneNumber('');
    setCode('');
    setStep('phone');
    setSecondsLeft(0);
    setMessage('');
    setError('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={reset}
      transparent
      visible={visible}
    >
      <View style={styles.loginModalBackdrop}>
        <View style={styles.loginModalCard}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sign in" onPress={reset} style={styles.loginModalClose}>
            <Text style={styles.loginModalCloseText}>×</Text>
          </Pressable>
          <Text style={styles.loginModalEyebrow}>SWAYAM YATRI</Text>
          <Text style={styles.loginModalTitle}>{step === 'phone' ? 'Sign in with your phone' : 'Enter your code'}</Text>
          <Text style={styles.loginModalCopy}>
            {step === 'phone'
              ? 'Enter your number in international format, including + and country code.'
              : `Code expires in ${secondsLeft}s.`}
          </Text>

          {step === 'phone' ? (
            <>
              <Text style={styles.loginInputLabel}>Phone number</Text>
              <TextInput
                autoComplete="tel"
                autoFocus
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="+919876543210"
                placeholderTextColor="#7b8c91"
                style={styles.loginInput}
                value={phoneNumber}
              />
              <Button disabled={busy || !phoneNumber.trim()} onPress={sendCode}>
                {busy ? 'Sending code…' : 'Send one-time code'}
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.loginInputLabel}>6-digit code</Text>
              <TextInput
                autoComplete="one-time-code"
                autoFocus
                editable={secondsLeft > 0}
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                placeholder="000000"
                placeholderTextColor="#7b8c91"
                style={styles.loginInput}
                value={code}
              />
              <Button disabled={busy || secondsLeft === 0 || code.length !== 6} onPress={verifyCode}>
                {busy ? 'Verifying…' : 'Verify and continue'}
              </Button>
              <Button disabled={busy || secondsLeft > 0} onPress={sendCode} secondary>
                {secondsLeft > 0 ? `Request another code in ${secondsLeft}s` : 'Send a new code'}
              </Button>
              <Pressable disabled={busy} onPress={() => { setStep('phone'); setCode(''); setMessage(''); setError(''); }} style={styles.loginChangePhone}>
                <Text style={styles.loginChangePhoneText}>Change phone number</Text>
              </Pressable>
            </>
          )}

          {message ? <Text accessibilityRole="status" style={styles.successText}>{message}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.loginDevNote}>Development sign-in only. No SMS is sent; codes appear in the backend terminal.</Text>
        </View>
      </View>
    </Modal>
  );
}

function Button({ children, onPress, secondary = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{children}</Text>
    </Pressable>
  );
}

function StopSelector({ label, stops, value, onChange, loading, onRetry }) {
  const [visible, setVisible] = useState(false);
  const selectedStop = stops.find((stop) => stop.stop_id === value);
  const openSelector = () => {
    if (stops.length) setVisible(true);
    else onRetry();
  };

  return (
    <View style={styles.stopSelector}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedStop?.stop_name || 'Any stop'}. Tap to choose.`}
        disabled={loading && !stops.length}
        onPress={openSelector}
        style={styles.stopSelectButton}
      >
        <Text numberOfLines={1} style={styles.stopSelectValue}>
          {loading && !stops.length ? 'Loading stops…' : selectedStop?.stop_name || 'Any stop'}
        </Text>
        <Text style={styles.stopSelectChevron}>{stops.length ? '⌄' : loading ? '…' : '↻'}</Text>
      </Pressable>
      {!stops.length && !loading && <Text style={styles.stopUnavailable}>Stops unavailable · tap to retry</Text>}
      <Modal
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close stop selection" onPress={() => setVisible(false)} style={styles.modalDismiss} />
          <View style={styles.stopPicker}>
            <View style={styles.stopPickerHeading}>
              <View>
                <Text style={styles.stopPickerTitle}>Choose {label.toLowerCase()} stop</Text>
                <Text style={styles.stopPickerCaption}>Select a stop for your journey</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {[
                { stop_id: '', stop_name: 'Any stop' },
                ...stops,
              ].map((stop) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: stop.stop_id === value }}
            key={stop.stop_id}
            onPress={() => {
              onChange(stop.stop_id);
              setVisible(false);
            }}
            style={[styles.stopOption, stop.stop_id === value && styles.stopOptionSelected]}
          >
            <Text style={[styles.stopOptionText, stop.stop_id === value && styles.stopOptionTextSelected]}>
              {stop.stop_name}
            </Text>
            {stop.stop_id === value && <Text style={styles.stopOptionCheck}>✓</Text>}
          </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RouteProgress({
  stops,
  bus,
  sourceStopId,
  destinationStopId,
  boardingStopId,
  currentStopSequence,
  stopEtas = {},
  onSelectStop,
}) {
  const firstStopId = sourceStopId || stops[0]?.stop_id;
  const lastStopId = destinationStopId || stops[stops.length - 1]?.stop_id;
  const sourceDistance = Number(
    stops.find((stop) => stop.stop_id === sourceStopId)?.distance_km
      ?? stops[0]?.distance_km
      ?? 0,
  );

  return (
    <View style={styles.progressPanel}>
      <View style={styles.progressHeading}>
        <Text style={styles.progressTitle}>Estimated stop arrivals</Text>
        <Text style={styles.progressSubtitle}>Tap a stop to board · times are estimates</Text>
      </View>
      {stops.map((stop, index) => {
        const isCurrentStop = stop.stop_id === bus?.current_stop_id;
        const stopEta = stopEtas[stop.stop_id];
        const arrivalLabel = !bus
          ? ''
          : isCurrentStop
            ? 'Bus here now'
            : currentStopSequence != null && stop.sequence < currentStopSequence
              ? 'Passed'
              : stopEta?.eta_minutes != null
                ? `ETA ${stopEta.arrival_time || 'unavailable'}`
                : stopEta?.error
                  ? 'ETA unavailable'
                  : stopEta
                    ? 'ETA unavailable'
                    : 'Calculating ETA';
        const isSource = stop.stop_id === firstStopId;
        const isDestination = stop.stop_id === lastStopId;
        const isBoardingStop = stop.stop_id === boardingStopId;
        const distanceFromSource = Number(stop.distance_km) - sourceDistance;
        const distanceLabel = distanceFromSource < 0
          ? `${Math.abs(distanceFromSource).toFixed(1)} km before source`
          : `${distanceFromSource.toFixed(1)} km from source`;
        const endpointLabel = isSource ? 'START' : isDestination ? 'END' : '';
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${stop.stop_name}, ${endpointLabel || `stop ${stop.sequence || index + 1}`}${isCurrentStop ? ', bus here' : ''}${isBoardingStop ? ', selected boarding stop' : ', select as boarding stop'}`}
            accessibilityState={{ selected: isBoardingStop }}
            key={stop.stop_id}
            onPress={() => onSelectStop(stop.stop_id)}
            style={[styles.progressStop, isBoardingStop && styles.progressStopSelected]}
          >
            <View style={styles.progressStep}>
              <Text style={styles.progressStepText}>{String(stop.sequence).padStart(2, '0')}</Text>
            </View>
            <View style={styles.progressRail}>
              {index > 0 ? <View style={styles.progressConnectorTop} /> : null}
              {index < stops.length - 1 ? <View style={styles.progressConnectorBottom} /> : null}
              <View style={[styles.progressDot, isSource && styles.progressDotSource, isCurrentStop && styles.progressDotCurrent]} />
              {isCurrentStop ? <Text style={styles.progressBus}>🚌</Text> : null}
            </View>
            <View style={styles.progressCopy}>
              <Text numberOfLines={1} style={styles.progressName}>{stop.stop_name}</Text>
              <Text style={styles.progressDistance}>
                {distanceLabel}{isCurrentStop ? ' · Bus here' : ''}
              </Text>
              {arrivalLabel ? <Text style={styles.progressArrival}>{arrivalLabel}</Text> : null}
            </View>
            <Text style={styles.progressStatus}>{isBoardingStop ? 'BOARDING' : endpointLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [query, setQuery] = useState('');
  const [originStopId, setOriginStopId] = useState('');
  const [destinationStopId, setDestinationStopId] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [selectedStopId, setSelectedStopId] = useState('');
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [busesLoaded, setBusesLoaded] = useState(false);
  const [etas, setEtas] = useState({});
  const [stopEtas, setStopEtas] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingStops, setLoadingStops] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [apiError, setApiError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const loadRoutes = useCallback(async (search = '', originId = '', destinationId = '') => {
    setLoadingRoutes(true);
    setApiError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (originId && destinationId) {
        params.set('origin_stop_id', originId);
        params.set('destination_stop_id', destinationId);
      }
      const queryString = params.toString();
      const result = await apiRequest(`routes/${queryString ? `?${queryString}` : ''}`);
      setRoutes(result.routes);
      return result.routes;
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  const loadStops = useCallback(async () => {
    setLoadingStops(true);
    try {
      const result = await apiRequest('stops/');
      setStops(result.stops);
    } catch (error) {
      setApiError(`Could not load stops: ${error.message}`);
    } finally {
      setLoadingStops(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes().then((routeResults) => {
      const firstRoute = routeResults?.[0];
      if (!firstRoute) return;
      setSelectedRoute(firstRoute);
      setLoadingRoute(true);
      apiRequest(`routes/${encodeURIComponent(firstRoute.route_id)}/`)
        .then((detail) => {
          setRouteDetail(detail);
          setSelectedStopId(detail.route_stops[0]?.stop_id || '');
        })
        .catch((error) => setApiError(error.message))
        .finally(() => setLoadingRoute(false));
    });
    loadStops();
  }, [loadRoutes, loadStops]);

  const selectRoute = async (route) => {
    setSelectedRoute(route);
    setRouteDetail(null);
    setBuses([]);
    setBusesLoaded(false);
    setEtas({});
    setLoadingRoute(true);
    setApiError('');
    try {
      const detail = await apiRequest(`routes/${encodeURIComponent(route.route_id)}/`);
      setRouteDetail(detail);
      const sourceOnRoute = detail.route_stops.some((stop) => stop.stop_id === originStopId);
      setSelectedStopId(sourceOnRoute ? originStopId : detail.route_stops[0]?.stop_id || '');
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    if (!selectedRoute) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const params = new URLSearchParams({ route_id: selectedRoute.route_id });
        if (destinationStopId) params.set('destination_stop_id', destinationStopId);
        const result = await apiRequest(`buses/live/?${params}`);
        if (!active) return;
        setBuses(result.buses);
        setSelectedBusId((currentId) => (
          result.buses.some((bus) => bus.bus_id === currentId)
            ? currentId
            : result.buses[0]?.bus_id || ''
        ));
        setBusesLoaded(true);
        setLastRefresh(new Date());
        setApiError('');
      } catch (error) {
        if (active) setApiError(error.message);
      }
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedRoute, destinationStopId]);

  useEffect(() => {
    if (!selectedStopId || buses.length === 0 || !routeDetail) {
      setEtas({});
      return undefined;
    }
    let active = true;
    Promise.all(
      buses.map(async (bus) => {
        const journey = getJourneyProgress(
          bus,
          routeDetail.route_stops,
          selectedStopId,
          destinationStopId,
        );
        if (!journey.targetStopId) {
          return [bus.bus_id, { ...journey, eta_minutes: null }];
        }
        try {
          const eta = await apiRequest(
            `buses/${encodeURIComponent(bus.bus_id)}/eta/?stop_id=${encodeURIComponent(journey.targetStopId)}`,
          );
          return [bus.bus_id, { ...eta, target_stop_id: journey.targetStopId }];
        } catch (error) {
          return [bus.bus_id, { error: error.message, target_stop_id: journey.targetStopId }];
        }
      }),
    ).then((results) => {
      if (active) setEtas(Object.fromEntries(results));
    });
    return () => {
      active = false;
    };
  }, [buses, selectedStopId, routeDetail, destinationStopId]);

  const selectedBus = buses.find((bus) => bus.bus_id === selectedBusId) || null;
  const isDemoData = routeDetail?.data_source !== 'live';
  const selectedBusEta = selectedBus ? etas[selectedBus.bus_id] : null;
  const selectedJourney = getJourneyProgress(
    selectedBus,
    routeDetail?.route_stops || [],
    selectedStopId,
    destinationStopId,
  );
  const arrivalTime = formatArrivalTime(selectedBusEta);
  const etaTargetStop = routeDetail?.route_stops?.find(
    (stop) => stop.stop_id === selectedBusEta?.target_stop_id,
  );
  const arrivalDetail = selectedBusEta?.eta_minutes != null && etaTargetStop
    ? `About ${formatEtaDuration(selectedBusEta.eta_minutes)} to ${etaTargetStop.stop_name}`
    : '';
  const arrivalLabel = arrivalTime
    || (selectedJourney.state === 'arrived'
      ? 'Trip complete'
      : selectedJourney.state === 'passed'
        ? 'Destination passed'
        : selectedJourney.state === 'at_source'
          ? 'At your boarding stop'
          : 'Arrival time unavailable');
  const originIndex = routeDetail?.route_stops.findIndex(
    (stop) => stop.stop_id === originStopId,
  ) ?? -1;
  const destinationIndex = routeDetail?.route_stops.findIndex(
    (stop) => stop.stop_id === destinationStopId,
  ) ?? -1;
  const routeStartIndex = originIndex >= 0 ? originIndex : 0;
  const routeEndIndex = destinationIndex >= 0
    ? destinationIndex
    : (routeDetail?.route_stops?.length || 0) - 1;
  const currentStopIndex = routeDetail?.route_stops?.findIndex(
    (stop) => stop.stop_id === selectedBus?.current_stop_id,
  ) ?? -1;
  const visibleStartIndex = currentStopIndex >= 0 && currentStopIndex < routeStartIndex
    ? currentStopIndex
    : routeStartIndex;
  const visibleStops = routeEndIndex >= visibleStartIndex
    ? routeDetail?.route_stops?.slice(visibleStartIndex, routeEndIndex + 1) || []
    : [];
  const currentStopSequence = routeDetail?.route_stops?.find(
    (stop) => stop.stop_id === selectedBus?.current_stop_id,
  )?.sequence ?? null;

  useEffect(() => {
    if (!selectedBus || !routeDetail?.route_stops?.length) {
      setStopEtas({});
      return undefined;
    }

    const routeStops = routeDetail.route_stops;
    const currentStopIndex = routeStops.findIndex((stop) => stop.stop_id === selectedBus.current_stop_id);
    const segmentStops = routeStops.slice(visibleStartIndex, routeEndIndex + 1);
    if (currentStopIndex < 0) {
      setStopEtas(Object.fromEntries(segmentStops.map((stop) => [stop.stop_id, { error: 'Bus position unavailable' }])));
      return undefined;
    }

    const upcomingStops = segmentStops.filter(
      (stop) => routeStops.findIndex((routeStop) => routeStop.stop_id === stop.stop_id) > currentStopIndex,
    );
    if (!upcomingStops.length) {
      setStopEtas({});
      return undefined;
    }

    let active = true;
    setStopEtas({});
    Promise.all(
      upcomingStops.map(async (stop) => {
        try {
          const eta = await apiRequest(
            `buses/${encodeURIComponent(selectedBus.bus_id)}/eta/?stop_id=${encodeURIComponent(stop.stop_id)}`,
          );
          return [stop.stop_id, { ...eta, arrival_time: formatArrivalTime(eta) }];
        } catch (error) {
          return [stop.stop_id, { error: error.message }];
        }
      }),
    ).then((entries) => {
      if (active) setStopEtas(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [
    selectedBus,
    routeDetail?.route_stops,
    visibleStartIndex,
    routeEndIndex,
  ]);

  const searchRoutes = async () => {
    if (Boolean(originStopId) !== Boolean(destinationStopId)) {
      setApiError('Choose both a source and destination, or clear both.');
      return;
    }
    const matches = await loadRoutes(query, originStopId, destinationStopId);
    if (matches?.length) {
      await selectRoute(matches[0]);
    } else {
      setSelectedRoute(null);
      setRouteDetail(null);
      setBuses([]);
      setSelectedBusId('');
      setBusesLoaded(false);
      setEtas({});
    }
  };

  const handleAccountPress = async () => {
    if (!authenticated) {
      setLoginVisible(true);
      return;
    }
    try {
      const { csrf_token: csrfToken } = await apiRequest('auth/csrf/');
      await apiPost('auth/logout/', {}, csrfToken);
      setAuthenticated(false);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8f6" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>s</Text></View>
            <Text style={styles.brand}>Swayam Yatri</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleAccountPress} style={styles.accountButton}>
            <Text style={styles.accountButtonText}>{authenticated ? 'Sign out' : 'Sign in'}</Text>
          </Pressable>
        </View>

        <View style={styles.intro}>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}><Text style={styles.eyebrowDot}>●</Text> YOUR EVERYDAY CITY GUIDE</Text>
            <Text style={styles.title}>Where are you headed today?</Text>
            <Text style={styles.muted}>Start with your bus. The rest of your city is just around the corner.</Text>
          </View>
          <View style={styles.introStats}>
            <Text style={styles.introStatIcon}>↗</Text>
            <View><Text style={styles.introStatTitle}>10 sec</Text><Text style={styles.introStatCaption}>Data check interval</Text></View>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.trackerHeading}>
            <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>↗</Text></View>
            <View style={styles.trackerHeadingCopy}>
              <Text style={styles.trackerTitle}>Find buses on your route</Text>
              <Text style={styles.trackerSubtitle}>Choose your stops to see available buses and where each one is.</Text>
            </View>
          </View>
          <StopSelector
            label="From"
            stops={stops}
            value={originStopId}
            onChange={setOriginStopId}
            loading={loadingStops}
            onRetry={loadStops}
          />
          <StopSelector
            label="To"
            stops={stops.filter((stop) => stop.stop_id !== originStopId)}
            value={destinationStopId}
            onChange={setDestinationStopId}
            loading={loadingStops}
            onRetry={loadStops}
          />
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Search bus routes"
              onChangeText={setQuery}
              onSubmitEditing={searchRoutes}
              placeholder="Search route number or name"
              placeholderTextColor="#7b8c91"
              returnKeyType="search"
              style={[styles.input, styles.searchInput]}
              value={query}
            />
            <Button
              disabled={loadingRoutes || Boolean(originStopId) !== Boolean(destinationStopId)}
              onPress={searchRoutes}
            >
              Find buses
            </Button>
          </View>
        </View>

        {apiError ? <Text accessibilityRole="alert" style={styles.errorText}>{apiError}</Text> : null}

        <View style={[styles.dashboardGrid, windowWidth >= 760 && selectedRoute && styles.dashboardGridWide]}>
        {selectedRoute && (
          <View style={[styles.routePanel, windowWidth >= 760 && styles.routePanelWide]}>
            <View style={styles.routeHeading}>
              <View style={styles.routeHeadingCopy}>
                <Text style={styles.sectionTitle}>{selectedRoute.route_name}</Text>
                <Text style={styles.muted}>{selectedRoute.stop_count} stops · {isDemoData ? `${buses.length} demo bus examples` : `${buses.length} bus${buses.length === 1 ? '' : 'es'} running`}</Text>
              </View>
              <View style={styles.routeMeta}>
                <View style={[styles.dataBadge, isDemoData && styles.dataBadgeDemo]}>
                  <Text style={[styles.dataBadgeText, isDemoData && styles.dataBadgeTextDemo]}>
                    {isDemoData ? 'DEMO DATA' : 'LIVE DATA'}
                  </Text>
                </View>
              </View>
            </View>
            {loadingRoute ? <ActivityIndicator color="#087e75" /> : null}
            {routeDetail && (
              <>
                <Text style={styles.fieldLabel}>Route progress</Text>
                <RouteProgress
                  stops={visibleStops}
                  bus={selectedBus}
                  sourceStopId={originStopId}
                  destinationStopId={destinationStopId}
                  boardingStopId={selectedStopId}
                  currentStopSequence={currentStopSequence}
                  stopEtas={stopEtas}
                  onSelectStop={setSelectedStopId}
                />

                {selectedBus && (
                  <View style={[styles.busStatusCard, isDemoData && styles.busStatusDemo]}>
                    <View style={styles.busStatusHeading}>
                      <Text style={styles.busStatusIcon}>🚌</Text>
                      <View style={styles.busStatusIdentity}>
                        <Text style={styles.busStatusEyebrow}>Selected bus</Text>
                        <Text style={styles.busStatusRegistration}>{selectedBus.bus_registration}</Text>
                      </View>
                      <View style={[styles.busStatusBadge, isDemoData && styles.busStatusBadgeDemo, selectedBus.is_stale && styles.busStatusBadgeStale]}>
                        <Text style={[styles.busStatusBadgeText, isDemoData && styles.busStatusBadgeTextDemo, selectedBus.is_stale && styles.busStatusBadgeTextStale]}>
                          {isDemoData ? 'Demo data' : selectedBus.is_stale ? 'Signal may be old' : 'Status available'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.busStatusArrivalPanel}>
                      <Text style={styles.busStatusArrivalLabel}>{selectedJourney.label}</Text>
                      <Text style={[styles.busStatusArrival, isDemoData && styles.busStatusArrivalDemo]}>
                        {arrivalLabel}
                      </Text>
                      {arrivalDetail ? <Text style={styles.busStatusArrivalDetail}>{arrivalDetail}</Text> : null}
                    </View>
                    <View style={styles.busStatusLocationRow}>
                      <Text style={styles.busStatusLocationMarker}>●</Text>
                      <View>
                        <Text style={styles.busStatusLocationLabel}>Bus is currently at</Text>
                        <Text style={styles.busStatusLocation}>{selectedBus.current_stop_name}</Text>
                      </View>
                    </View>
                    <View style={styles.busStatusFooter}>
                      <Text style={styles.busStatusFooterText}>Speed <Text style={styles.busStatusFooterStrong}>{selectedBus.speed_kmh} km/h</Text></Text>
                      {lastRefresh && <Text style={styles.busStatusFooterText}>Last checked {formatUpdated(lastRefresh)}</Text>}
                    </View>
                    {isDemoData && <Text style={styles.busStatusNote}>Example position and arrival estimate — not a live update.</Text>}
                  </View>
                )}

                {busesLoaded && buses.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{isDemoData ? 'No demo bus examples match' : 'No active bus reported'}</Text>
                    <Text style={styles.muted}>{isDemoData ? 'This demo has no scheduled timetable.' : 'Route stops remain available while bus data is unavailable.'}</Text>
                  </View>
                )}
                {buses.length > 0 && (
                  <View style={styles.activeBusHeading}>
                    <Text style={styles.fieldLabel}>{buses.length > 1 ? 'Other buses on this route' : 'Bus on this route'}</Text>
                    <Text style={styles.muted}>Tap a bus to view its status</Text>
                  </View>
                )}
                {buses.map((bus) => {
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: bus.bus_id === selectedBusId }}
                      key={bus.bus_id}
                      onPress={() => setSelectedBusId(bus.bus_id)}
                      style={[styles.activeBusCard, bus.bus_id === selectedBusId && styles.activeBusCardSelected]}
                    >
                      <Text style={styles.activeBusIcon}>🚌</Text>
                      <View style={styles.activeBusCopy}>
                        <Text style={styles.activeBusRegistration}>{bus.bus_registration}</Text>
                        <Text style={styles.activeBusStop}>Currently at {bus.current_stop_name}</Text>
                      </View>
                      <View style={styles.busSelectorMeta}>
                        <Text style={[styles.busSelectionLabel, bus.bus_id === selectedBusId && styles.busSelectionLabelSelected]}>
                          {bus.bus_id === selectedBusId ? 'Selected' : 'View status'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {!busesLoaded && !apiError ? <ActivityIndicator color="#357764" /> : null}

                <View style={styles.bottomInfo}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>₹</Text>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoLabel}>FARE INFORMATION</Text>
                      <Text style={styles.infoValue}>{routeDetail.fare_rule ? `From ₹${routeDetail.fare_rule.base_fare}` : 'Fare unavailable'}</Text>
                      <Text style={styles.infoCaption}>{routeDetail.fare_rule ? `₹${routeDetail.fare_rule.per_km_rate} per km · demo fare` : 'No fare rule provided'}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <View style={[styles.section, selectedRoute && windowWidth >= 760 && styles.routeListSide]}>
          <View style={styles.routeListHeading}>
            <View><Text style={styles.sectionTitle}>Routes and buses</Text><Text style={styles.muted}>{routes.length} options</Text></View>
            <Text style={styles.routeListIcon}>≋</Text>
          </View>
          {loadingRoutes ? <ActivityIndicator color="#357764" /> : null}
          {!loadingRoutes && routes.length === 0 ? (
            <Text style={styles.emptyStateText}>No routes serve those stops yet. Try another journey.</Text>
          ) : null}
          {routes.map((route) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: route.route_id === selectedRoute?.route_id }}
              key={route.route_id}
              onPress={() => selectRoute(route)}
              style={({ pressed }) => [
                styles.routeCard,
                route.route_id === selectedRoute?.route_id && styles.routeCardSelected,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.routeBadge}><Text style={styles.routeBadgeText}>{route.route_id.replace('route-', '')}</Text></View>
              <View style={styles.routeCopy}>
                <Text style={styles.routeName}>{route.route_name}</Text>
                <Text style={styles.muted}>
                  {isDemoData ? `${route.active_bus_count} bus examples` : `${route.active_bus_count} ${route.active_bus_count === 1 ? 'bus' : 'buses'}`} · {route.stop_count} stops
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
        </View>

        <View style={styles.discoverSection}>
          <Text style={styles.eyebrow}>MORE AROUND YOU</Text>
          <Text style={styles.discoverTitle}>Your city, all in one place.</Text>
          {[
            ['⌖', 'Places to explore', 'Landmarks, parks and useful places'],
            ['▤', 'Public services', 'Government offices and services'],
            ['✳', 'City updates', 'Announcements and helpful notices'],
          ].map(([icon, title, caption]) => (
            <View key={title} style={styles.discoverCard}>
              <Text style={styles.discoverIcon}>{icon}</Text>
              <View style={styles.discoverCopy}><Text style={styles.discoverName}>{title}</Text><Text style={styles.discoverCaption}>{caption}</Text></View>
              <Text style={styles.comingSoon}>COMING SOON</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Swayam Yatri · Useful city information, made simple.</Text>
      </ScrollView>
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavItem}><Text style={styles.bottomNavIcon}>↗</Text><Text style={styles.bottomNavText}>Bus</Text></View>
        <View style={styles.bottomNavItem}><Text style={styles.bottomNavIcon}>⌖</Text><Text style={styles.bottomNavText}>Explore</Text></View>
        <View style={styles.bottomNavItem}><Text style={styles.bottomNavIcon}>▤</Text><Text style={styles.bottomNavText}>Info</Text></View>
      </View>
      <PhoneLoginModal
        onAuthenticated={() => { setAuthenticated(true); setLoginVisible(false); }}
        onClose={() => setLoginVisible(false)}
        visible={loginVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fbfcfa' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24, gap: 16 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#e7ece8', borderBottomWidth: StyleSheet.hairlineWidth },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomRightRadius: 10, borderBottomLeftRadius: 3, backgroundColor: '#357764' },
  brandMarkText: { color: '#fff', fontFamily: 'Georgia', fontSize: 21, fontStyle: 'italic', fontWeight: '700' },
  brand: { color: '#20342f', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  accountButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 10 },
  accountButtonText: { color: '#285d4f', fontSize: 12, fontWeight: '800' },
  intro: { minHeight: 105, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9 },
  introCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#357764', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  eyebrowDot: { color: '#64a183', fontSize: 9 },
  title: { color: '#20342f', fontSize: 29, fontWeight: '700', letterSpacing: -1.2, lineHeight: 34, marginTop: 9 },
  muted: { color: '#788780', fontSize: 12, lineHeight: 18, marginTop: 4 },
  introStats: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderColor: '#e7ece8', borderWidth: 1, borderRadius: 10, backgroundColor: '#fff' },
  introStatIcon: { width: 30, height: 30, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e8f1ec', color: '#357764', fontSize: 19, lineHeight: 30, textAlign: 'center' },
  introStatTitle: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  introStatCaption: { color: '#788780', fontSize: 9, marginTop: 3 },
  hero: { overflow: 'hidden', borderColor: '#e6ece7', borderWidth: 1, borderRadius: 14, backgroundColor: '#fff', paddingBottom: 14 },
  trackerHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingTop: 15, paddingBottom: 12 },
  sectionIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#eaf3ed' },
  sectionIconText: { color: '#357764', fontSize: 19 },
  trackerHeadingCopy: { flex: 1 },
  trackerTitle: { color: '#20342f', fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  trackerSubtitle: { color: '#788780', fontSize: 10, lineHeight: 15, marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 15 },
  input: { backgroundColor: '#fff', borderColor: '#e8ede8', borderRadius: 8, borderWidth: 1, color: '#34443d', fontSize: 13, minHeight: 44, paddingHorizontal: 11 },
  searchInput: { flex: 1 },
  stopSelector: { marginTop: 7, paddingHorizontal: 15 },
  stopSelectButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderColor: '#e8ede8', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 11 },
  stopSelectValue: { flex: 1, color: '#34443d', fontSize: 13 },
  stopSelectChevron: { color: '#357764', fontSize: 19, fontWeight: '700' },
  stopUnavailable: { color: '#a56a2c', fontSize: 10, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#20342f88' },
  modalDismiss: { flex: 1 },
  stopPicker: { width: '100%', maxWidth: 600, maxHeight: '80%', alignSelf: 'center', borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#fbfcfa', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 },
  stopPickerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  stopPickerTitle: { color: '#20342f', fontSize: 17, fontWeight: '800' },
  stopPickerCaption: { color: '#788780', fontSize: 11, marginTop: 4 },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#e8f1ec' },
  modalCloseText: { color: '#285d4f', fontSize: 25, lineHeight: 28 },
  stopOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#e7ece8', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 7 },
  stopOptionSelected: { backgroundColor: '#e8f1ec' },
  stopOptionText: { color: '#34443d', fontSize: 13 },
  stopOptionTextSelected: { color: '#285d4f', fontWeight: '800' },
  stopOptionCheck: { color: '#357764', fontSize: 16, fontWeight: '800', paddingRight: 7 },
  button: { alignItems: 'center', backgroundColor: '#357764', borderRadius: 9, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  buttonSecondary: { backgroundColor: '#e8f1ec' },
  buttonSecondaryText: { color: '#285d4f' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  section: { gap: 8 },
  sectionTitle: { color: '#20342f', fontSize: 15, fontWeight: '800' },
  dashboardGrid: { gap: 12 },
  dashboardGridWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  routePanel: { gap: 10, borderColor: '#e6ece7', borderWidth: 1, borderRadius: 14, backgroundColor: '#fff', padding: 14 },
  routePanelWide: { flex: 1.55 },
  routeListSide: { flex: 0.8, minWidth: 250 },
  routeListHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  routeListIcon: { color: '#357764', fontSize: 24 },
  routeCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e6ece7', borderRadius: 9, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, padding: 9 },
  routeCardSelected: { borderColor: '#9fbea9', backgroundColor: '#f0f7f1' },
  cardPressed: { opacity: 0.8 },
  routeBadge: { alignItems: 'center', backgroundColor: '#e8f1ec', borderRadius: 9, height: 34, justifyContent: 'center', width: 34 },
  routeBadgeText: { color: '#357764', fontSize: 11, fontWeight: '900' },
  routeCopy: { flex: 1 },
  routeName: { color: '#20342f', fontSize: 12, fontWeight: '800' },
  chevron: { color: '#357764', fontSize: 24, paddingHorizontal: 5 },
  routeHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  routeHeadingCopy: { flex: 1, minWidth: 0 },
  routeMeta: { alignItems: 'flex-end', gap: 5 },
  dataBadge: { backgroundColor: '#eaf3ec', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  dataBadgeDemo: { backgroundColor: '#fff0dc' },
  dataBadgeText: { color: '#285d4f', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  dataBadgeTextDemo: { color: '#95622f' },
  fieldLabel: { color: '#20342f', fontSize: 12, fontWeight: '800', marginTop: 3 },
  progressPanel: { backgroundColor: '#f5f8f4', borderColor: '#e4eae4', borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 9 },
  progressHeading: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, paddingHorizontal: 5, paddingBottom: 5 },
  progressTitle: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  progressSubtitle: { color: '#788780', fontSize: 9 },
  progressStop: { alignItems: 'stretch', borderColor: 'transparent', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 59, paddingHorizontal: 5 },
  progressStopSelected: { backgroundColor: '#fff', borderColor: '#d7e7dc' },
  progressStep: { alignItems: 'flex-start', justifyContent: 'center', width: 28 },
  progressStepText: { color: '#73827a', fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressRail: { alignItems: 'center', justifyContent: 'center', position: 'relative', width: 18 },
  progressConnectorTop: { backgroundColor: '#b9d1c0', bottom: '50%', left: 7, position: 'absolute', top: 0, width: 3 },
  progressConnectorBottom: { backgroundColor: '#b9d1c0', bottom: 0, left: 7, position: 'absolute', top: '50%', width: 3 },
  progressDot: { backgroundColor: '#fff', borderColor: '#7da38a', borderRadius: 7, borderWidth: 3, height: 13, width: 13, zIndex: 1 },
  progressDotSource: { borderColor: '#357764' },
  progressDotCurrent: { backgroundColor: '#357764', borderColor: '#fff', height: 14, width: 14 },
  progressBus: { fontSize: 14, left: 12, position: 'absolute', top: '50%', transform: [{ translateY: -8 }], zIndex: 2 },
  progressCopy: { flex: 1, justifyContent: 'center', minWidth: 0 },
  progressName: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  progressDistance: { color: '#788780', fontSize: 9, marginTop: 3 },
  progressArrival: { color: '#26755e', fontSize: 9, fontWeight: '800', marginTop: 3 },
  progressStatus: { alignSelf: 'center', color: '#357764', fontSize: 7, fontWeight: '900', textAlign: 'right', width: 52 },
  emptyState: { backgroundColor: '#fff7f4', borderColor: '#f1d8d1', borderWidth: 1, borderRadius: 9, padding: 11 },
  emptyTitle: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  emptyStateText: { color: '#788780', fontSize: 12, lineHeight: 18, padding: 12 },
  activeBusHeading: { gap: 1 },
  activeBusCard: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderColor: '#e6ece7', borderWidth: 1, borderRadius: 9, backgroundColor: '#fff', paddingHorizontal: 9, paddingVertical: 7 },
  activeBusCardSelected: { borderColor: '#9fbea9', backgroundColor: '#f0f7f1' },
  activeBusIcon: { width: 29, height: 29, borderRadius: 8, overflow: 'hidden', backgroundColor: '#edf4ee', fontSize: 17, lineHeight: 29, textAlign: 'center' },
  activeBusCopy: { flex: 1 },
  activeBusRegistration: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  activeBusStop: { color: '#788780', fontSize: 9, marginTop: 3 },
  busSelectorMeta: { alignItems: 'flex-end' },
  busSelectionLabel: { color: '#788780', fontSize: 9, fontWeight: '700' },
  busSelectionLabelSelected: { color: '#357764' },
  busStatusCard: { borderColor: '#dce8df', borderWidth: 1, borderRadius: 11, backgroundColor: '#f5faf6', padding: 12 },
  busStatusDemo: { borderColor: '#efdfc8', backgroundColor: '#fff8ef' },
  busStatusHeading: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  busStatusIcon: { width: 38, height: 38, borderRadius: 11, overflow: 'hidden', backgroundColor: '#e4f0e7', fontSize: 21, lineHeight: 38, textAlign: 'center' },
  busStatusIdentity: { flex: 1, minWidth: 0 },
  busStatusEyebrow: { color: '#788780', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  busStatusRegistration: { color: '#20342f', fontSize: 13, fontWeight: '900', marginTop: 3 },
  busStatusBadge: { backgroundColor: '#eaf3ec', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6 },
  busStatusBadgeDemo: { backgroundColor: '#fff0dc' },
  busStatusBadgeStale: { backgroundColor: '#fff0dc' },
  busStatusBadgeText: { color: '#285d4f', fontSize: 7, fontWeight: '900', letterSpacing: 0.35 },
  busStatusBadgeTextDemo: { color: '#95622f' },
  busStatusBadgeTextStale: { color: '#95622f' },
  busStatusArrivalPanel: { borderColor: '#e8eee9', borderWidth: 1, borderRadius: 9, backgroundColor: '#ffffffd9', marginTop: 11, padding: 12 },
  busStatusArrivalLabel: { color: '#788780', fontSize: 10, fontWeight: '700' },
  busStatusArrival: { color: '#285d4f', fontSize: 23, fontWeight: '900', lineHeight: 28, marginTop: 3 },
  busStatusArrivalDemo: { color: '#95622f' },
  busStatusArrivalDetail: { color: '#788780', fontSize: 9, fontWeight: '700', marginTop: 4 },
  busStatusLocationRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  busStatusLocationMarker: { color: '#357764', fontSize: 12 },
  busStatusLocationLabel: { color: '#788780', fontSize: 9, fontWeight: '700' },
  busStatusLocation: { color: '#20342f', fontSize: 11, fontWeight: '800', lineHeight: 15, marginTop: 2 },
  busStatusFooter: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, marginTop: 9 },
  busStatusFooterText: { color: '#788780', fontSize: 8 },
  busStatusFooterStrong: { color: '#20342f', fontWeight: '900' },
  busStatusNote: { color: '#95622f', fontSize: 8, lineHeight: 12, marginTop: 7 },
  bottomInfo: { gap: 8, marginTop: 2 },
  infoCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: '#e7ece8', borderWidth: 1, borderRadius: 9, backgroundColor: '#fff', padding: 10 },
  infoIcon: { width: 32, height: 32, borderRadius: 9, overflow: 'hidden', backgroundColor: '#e8f1ec', color: '#357764', fontSize: 17, fontWeight: '800', lineHeight: 32, textAlign: 'center' },
  infoCopy: { flex: 1 },
  infoLabel: { color: '#788780', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  infoValue: { color: '#20342f', fontSize: 11, fontWeight: '800', marginTop: 3 },
  infoCaption: { color: '#788780', fontSize: 9, marginTop: 3 },
  panel: { backgroundColor: '#fff', borderColor: '#dce6e2', borderRadius: 16, borderWidth: 1, gap: 9, padding: 15 },
  loginModalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: '#20342f88', padding: 18 },
  loginModalCard: { width: '100%', maxWidth: 440, alignSelf: 'center', borderColor: '#e7ece8', borderWidth: 1, borderRadius: 16, backgroundColor: '#fff', padding: 20 },
  loginModalClose: { width: 34, height: 34, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#e8f1ec' },
  loginModalCloseText: { color: '#285d4f', fontSize: 23, lineHeight: 26 },
  loginModalEyebrow: { color: '#357764', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  loginModalTitle: { color: '#20342f', fontSize: 22, fontWeight: '800', marginTop: 10 },
  loginModalCopy: { color: '#788780', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  loginInputLabel: { color: '#20342f', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  loginInput: { minHeight: 46, borderColor: '#e8ede8', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', color: '#34443d', fontSize: 14, paddingHorizontal: 11 },
  loginChangePhone: { alignSelf: 'flex-start', paddingVertical: 8 },
  loginChangePhoneText: { color: '#285d4f', fontSize: 11, fontWeight: '800' },
  loginDevNote: { color: '#788780', fontSize: 10, lineHeight: 15, marginTop: 12 },
  errorText: { color: '#b33f35', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  successText: { color: '#087e75', fontSize: 12, lineHeight: 17 },
  loader: { marginVertical: 5 },
  discoverSection: { gap: 9, paddingVertical: 4 },
  discoverTitle: { color: '#20342f', fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  discoverCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: '#e7ece8', borderWidth: 1, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 9 },
  discoverIcon: { width: 32, height: 32, borderRadius: 9, overflow: 'hidden', backgroundColor: '#e8f1ec', color: '#357764', fontSize: 17, lineHeight: 32, textAlign: 'center' },
  discoverCopy: { flex: 1 },
  discoverName: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  discoverCaption: { color: '#788780', fontSize: 9, marginTop: 3 },
  comingSoon: { maxWidth: 75, color: '#a56a2c', fontSize: 7, fontWeight: '800', textAlign: 'right' },
  footer: { color: '#8d9992', fontSize: 9, paddingTop: 10, textAlign: 'center' },
  bottomNav: { minHeight: 59, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopColor: '#e6ece7', borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: '#fff' },
  bottomNavItem: { minWidth: 70, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 5 },
  bottomNavIcon: { color: '#357764', fontSize: 18, lineHeight: 21 },
  bottomNavText: { color: '#788780', fontSize: 9, fontWeight: '700' },
});
