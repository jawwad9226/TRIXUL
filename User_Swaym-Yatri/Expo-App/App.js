import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const REFRESH_INTERVAL_MS = 10_000;

async function apiRequest(path) {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/${path}`, {
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Request failed (${response.status})`);
  }
  return payload;
}

function formatUpdated(value) {
  if (!value) return 'Update time unavailable';
  return `Checked ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

function RouteProgress({ stops, bus, sourceStopId }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.progressRow}
    >
      {stops.map((stop, index) => {
        const isCurrentStop = stop.stop_id === bus?.current_stop_id;
        return (
          <View key={stop.stop_id} style={styles.progressStop}>
            <View style={styles.progressTrack}>
              {isCurrentStop ? (
                <Text accessibilityLabel={`${bus.bus_registration} is at ${stop.stop_name}`} style={styles.progressBus}>🚌</Text>
              ) : null}
              <View style={[styles.progressDot, isCurrentStop && styles.progressDotCurrent]} />
              {index < stops.length - 1 ? <View style={styles.progressConnector} /> : null}
            </View>
            <Text numberOfLines={1} style={styles.progressName}>{stop.stop_name}</Text>
            <Text style={styles.progressDistance}>{stop.distance_km} km</Text>
            {stop.stop_id === sourceStopId ? <Text style={styles.progressSource}>SOURCE</Text> : null}
            {isCurrentStop ? <Text style={styles.progressCurrent}>BUS HERE</Text> : null}
          </View>
        );
      })}
    </ScrollView>
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
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingStops, setLoadingStops] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [apiError, setApiError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

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
    if (!selectedStopId || buses.length === 0) {
      setEtas({});
      return undefined;
    }
    let active = true;
    Promise.all(
      buses.map(async (bus) => {
        try {
          const eta = await apiRequest(
            `buses/${encodeURIComponent(bus.bus_id)}/eta/?stop_id=${encodeURIComponent(selectedStopId)}`,
          );
          return [bus.bus_id, eta];
        } catch (error) {
          return [bus.bus_id, { error: error.message }];
        }
      }),
    ).then((results) => {
      if (active) setEtas(Object.fromEntries(results));
    });
    return () => {
      active = false;
    };
  }, [buses, selectedStopId]);

  const selectedBus = buses.find((bus) => bus.bus_id === selectedBusId) || null;
  const isDemoData = routeDetail?.data_source !== 'live';
  const destinationIndex = routeDetail?.route_stops.findIndex(
    (stop) => stop.stop_id === destinationStopId,
  ) ?? -1;
  const visibleStops = destinationIndex >= 0
    ? routeDetail.route_stops.slice(0, destinationIndex + 1)
    : routeDetail?.route_stops || [];
  const originIndex = routeDetail?.route_stops.findIndex(
    (stop) => stop.stop_id === originStopId,
  ) ?? -1;
  const boardingStops = destinationIndex >= 0
    ? routeDetail.route_stops.slice(Math.max(0, originIndex), destinationIndex + 1)
    : routeDetail?.route_stops || [];

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8f6" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>s</Text></View>
            <Text style={styles.brand}>Swayam Yatri</Text>
          </View>
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
              <View>
                <Text style={styles.sectionTitle}>{selectedRoute.route_name}</Text>
                <Text style={styles.muted}>{selectedRoute.stop_count} stops · {isDemoData ? `${buses.length} demo bus examples` : `${buses.length} bus${buses.length === 1 ? '' : 'es'} running`}</Text>
              </View>
              {lastRefresh && <Text style={styles.updated}>{formatUpdated(lastRefresh)}</Text>}
            </View>

            {loadingRoute ? <ActivityIndicator color="#087e75" /> : null}
            {routeDetail && (
              <>
                <View style={styles.demoNotice}>
                  <Text style={styles.demoNoticeText}>DEMO DATA · Bus locations and ETAs are illustrative, not live service information.</Text>
                </View>
                <Text style={styles.fieldLabel}>Journey stops · selected bus position</Text>
                <RouteProgress stops={visibleStops} bus={selectedBus} sourceStopId={originStopId} />

                {busesLoaded && buses.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{isDemoData ? 'No demo bus examples match' : 'No active bus reported'}</Text>
                    <Text style={styles.muted}>{isDemoData ? 'No scheduled timetable is available in this demo.' : 'Showing route stops while live service data is unavailable.'}</Text>
                  </View>
                )}
                {buses.length > 0 && (
                  <View style={styles.activeBusHeading}>
                    <Text style={styles.fieldLabel}>{isDemoData ? 'Demo bus examples' : 'Buses running now'}</Text>
                    <Text style={styles.muted}>Choose a bus to show its {isDemoData ? 'example' : 'current'} stop</Text>
                  </View>
                )}
                {buses.map((bus) => {
                  const eta = etas[bus.bus_id];
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
                        <Text style={styles.activeBusStop}>At {bus.current_stop_name}</Text>
                      </View>
                      <View style={styles.activeBusEta}>
                        <Text style={styles.activeBusEtaValue}>{eta?.eta_minutes == null ? 'ETA —' : `${eta.eta_minutes} min`}</Text>
                        <Text style={styles.activeBusSpeed}>{bus.speed_kmh} km/h</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {!busesLoaded && !apiError ? <ActivityIndicator color="#357764" /> : null}

                <Text style={styles.fieldLabel}>Choose your boarding stop</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopRow}>
                  {boardingStops.map((stop) => (
                    <Pressable
                      accessibilityRole="button"
                      key={stop.stop_id}
                      onPress={() => setSelectedStopId(stop.stop_id)}
                      style={[styles.stopChip, stop.stop_id === selectedStopId && styles.stopChipSelected]}
                    >
                      <Text style={[styles.stopChipText, stop.stop_id === selectedStopId && styles.stopChipTextSelected]}>
                        {stop.stop_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.bottomInfo}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>₹</Text>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoLabel}>FARE INFORMATION</Text>
                      <Text style={styles.infoValue}>{routeDetail.fare_rule ? `From ₹${routeDetail.fare_rule.base_fare}` : 'Fare unavailable'}</Text>
                      <Text style={styles.infoCaption}>{routeDetail.fare_rule ? `₹${routeDetail.fare_rule.per_km_rate} per km · demo fare` : 'No fare rule provided'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>◷</Text>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoLabel}>{isDemoData ? 'ILLUSTRATIVE ETA' : 'BUS ARRIVAL'}</Text>
                      <Text style={styles.infoValue}>{selectedBus ? `${selectedBus.bus_registration}: ${etas[selectedBus.bus_id]?.eta_minutes == null ? 'ETA unavailable' : `${etas[selectedBus.bus_id].eta_minutes} min`}` : isDemoData ? 'No matching demo bus' : 'Waiting for an active bus'}</Text>
                      <Text style={styles.infoCaption}>{selectedBus ? `${isDemoData ? 'Example estimate' : 'To'} ${routeDetail.route_stops.find((stop) => stop.stop_id === selectedStopId)?.stop_name || 'your stop'} · ${selectedBus.speed_kmh} km/h` : isDemoData ? 'Demo fixture data only' : 'No live bus currently active'}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.refreshNote}>Bus list refreshes every 10 seconds. This demo API returns fixture data.</Text>
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
                <Text style={styles.muted}>{route.active_bus_count} {route.active_bus_count === 1 ? 'bus' : 'buses'} · {route.stop_count} stops</Text>
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
  updated: { color: '#628875', fontSize: 9, textAlign: 'right' },
  demoNotice: { backgroundColor: '#fff4e8', borderRadius: 9, padding: 10 },
  demoNoticeText: { color: '#a56a2c', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  fieldLabel: { color: '#20342f', fontSize: 12, fontWeight: '800', marginTop: 3 },
  progressRow: { backgroundColor: '#f5f8f4', borderColor: '#e4eae4', borderRadius: 10, borderWidth: 1, minHeight: 154, paddingHorizontal: 12, paddingTop: 43, paddingBottom: 10 },
  progressStop: { width: 120 },
  progressTrack: { alignItems: 'center', flexDirection: 'row', height: 17 },
  progressDot: { backgroundColor: '#fff', borderColor: '#7da38a', borderRadius: 7, borderWidth: 3, height: 14, width: 14, zIndex: 1 },
  progressDotCurrent: { backgroundColor: '#357764', borderColor: '#357764' },
  progressConnector: { backgroundColor: '#c8d8cb', flex: 1, height: 3 },
  progressBus: { bottom: 20, fontSize: 19, left: -8, position: 'absolute', zIndex: 2 },
  progressName: { color: '#20342f', fontSize: 10, fontWeight: '800', marginTop: 8, maxWidth: 110 },
  progressDistance: { color: '#788780', fontSize: 9, marginTop: 3 },
  progressSource: { color: '#a76b35', fontSize: 9, fontWeight: '900', marginTop: 4 },
  progressCurrent: { color: '#357764', fontSize: 8, fontWeight: '900', marginTop: 4 },
  stopRow: { gap: 8, paddingVertical: 3 },
  stopChip: { backgroundColor: '#fff', borderColor: '#e8ede8', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  stopChipSelected: { backgroundColor: '#357764', borderColor: '#357764' },
  stopChipText: { color: '#34443d', fontSize: 11, fontWeight: '700' },
  stopChipTextSelected: { color: '#fff' },
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
  activeBusEta: { alignItems: 'flex-end' },
  activeBusEtaValue: { color: '#20342f', fontSize: 11, fontWeight: '800' },
  activeBusSpeed: { color: '#788780', fontSize: 9, marginTop: 3 },
  bottomInfo: { gap: 8, marginTop: 2 },
  infoCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: '#e7ece8', borderWidth: 1, borderRadius: 9, backgroundColor: '#fff', padding: 10 },
  infoIcon: { width: 32, height: 32, borderRadius: 9, overflow: 'hidden', backgroundColor: '#e8f1ec', color: '#357764', fontSize: 17, fontWeight: '800', lineHeight: 32, textAlign: 'center' },
  infoCopy: { flex: 1 },
  infoLabel: { color: '#788780', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  infoValue: { color: '#20342f', fontSize: 11, fontWeight: '800', marginTop: 3 },
  infoCaption: { color: '#788780', fontSize: 9, marginTop: 3 },
  refreshNote: { color: '#788780', fontSize: 9, textAlign: 'center', paddingHorizontal: 8 },
  panel: { backgroundColor: '#fff', borderColor: '#dce6e2', borderRadius: 16, borderWidth: 1, gap: 9, padding: 15 },
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
