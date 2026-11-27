// File: src/components/PrintedTicketModal.js
// Purpose: Authentic MSRTC-style thermal receipt slip modal for ticket issuance and reprint.
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../constants/theme';

export const PrintedTicketModal = ({
  visible,
  ticket,
  onClose,
  isReprint = false,
}) => {
  if (!ticket) return null;

  const ticketNo = ticket.ticket_id || ticket.ticketId || 'TKT-102-LIVE';
  const busNumber = ticket.busNumber || ticket.bus_number || 'MH-30-AB-1234';
  const shiftId = ticket.shift_id || ticket.shiftId || 'shift-001';
  const conductor = ticket.conductorName || ticket.conductor_name || 'Conductor';
  const conductorId = ticket.conductorId || ticket.conductor_id || 'cond-1001';
  const routeName = ticket.routeName || ticket.route_name || 'Akola - Shegaon Corridor';
  const fromStop = ticket.source_stop || ticket.boardingStop || ticket.source_stop_id || 'Akola Stand';
  const toStop = ticket.dest_stop || ticket.destinationStop || ticket.dest_stop_id || 'Shegaon';
  const fare = ticket.total_fare || ticket.totalFare || ticket.fare || '0.00';
  const paymentMode = (ticket.payment_method || ticket.paymentMode || 'CASH').toUpperCase();
  const passengers = ticket.passenger_count || ticket.passengerCount || 1;
  const counts = ticket.passengerCounts || {};
  const formattedTime = ticket.timestamp
    ? new Date(ticket.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handleThermalPrint = () => {
    if (Platform.OS === 'web') {
      window.print?.();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Top Status Banner */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons
                name={isReprint ? 'printer-check' : 'printer'}
                size={20}
                color="#0f62fe"
              />
              <Text style={styles.modalHeaderText}>
                {isReprint ? 'Duplicate Passenger Slip (Reprint)' : 'Electronic Thermal Ticket Issued'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Thermal Receipt Paper */}
          <ScrollView
            contentContainerStyle={styles.receiptScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.thermalSlip}>
              {/* Paper Top Jagged Cut Effect */}
              <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - -</Text>

              {/* State Transport Corp Header */}
              <View style={styles.centerAlign}>
                <Text style={styles.corpHeader}>MAHARASHTRA STATE ROAD TRANSPORT</Text>
                <Text style={styles.corpSubHeader}>TRIXUL SMART ETM • AFC SYSTEM</Text>
                {isReprint && (
                  <View style={styles.reprintBadge}>
                    <Text style={styles.reprintText}>*** DUPLICATE COPY ***</Text>
                  </View>
                )}
              </View>

              <Text style={styles.dashedLine}>-------------------------------------------</Text>

              {/* Machine & Conductor Meta */}
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>BUS NO :</Text>
                <Text style={styles.monoValBold}>{busNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>SHIFT ID :</Text>
                <Text style={styles.monoVal}>{shiftId}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>CONDUCTOR :</Text>
                <Text style={styles.monoVal}>{conductor} ({conductorId})</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>CORRIDOR :</Text>
                <Text style={styles.monoVal}>{routeName}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>TICKET NO :</Text>
                <Text style={styles.monoValBold}>{ticketNo}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.monoKey}>DATE / TIME :</Text>
                <Text style={styles.monoVal}>{formattedTime}</Text>
              </View>

              <Text style={styles.dashedLine}>==========================================</Text>

              {/* Journey Staging */}
              <View style={styles.journeySection}>
                <View style={styles.journeyStopRow}>
                  <Text style={styles.journeyTag}>FROM :</Text>
                  <Text style={styles.journeyStopName}>{fromStop}</Text>
                </View>
                <View style={styles.journeyStopRow}>
                  <Text style={styles.journeyTag}>TO   :</Text>
                  <Text style={styles.journeyStopName}>{toStop}</Text>
                </View>
              </View>

              <Text style={styles.dashedLine}>------------------------------------------</Text>

              {/* Passenger Category Breakdown */}
              <View style={styles.passengerSection}>
                <Text style={styles.tableHeader}>PASSENGER BREAKDOWN</Text>
                {counts.adultMale > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCol}>Adult Male (Full)</Text>
                    <Text style={styles.tableColVal}>{counts.adultMale}</Text>
                  </View>
                )}
                {counts.women > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCol}>Mahila Sanman (50% Off)</Text>
                    <Text style={styles.tableColVal}>{counts.women}</Text>
                  </View>
                )}
                {counts.seniors > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCol}>Senior 75+ (Free Amrit)</Text>
                    <Text style={styles.tableColVal}>{counts.seniors}</Text>
                  </View>
                )}
                {counts.children > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCol}>Child (Half Fare)</Text>
                    <Text style={styles.tableColVal}>{counts.children}</Text>
                  </View>
                )}
                <View style={[styles.tableRow, styles.totalPaxRow]}>
                  <Text style={styles.tableColBold}>TOTAL PASSENGERS</Text>
                  <Text style={styles.tableColBoldVal}>{passengers}</Text>
                </View>
              </View>

              <Text style={styles.dashedLine}>=========================================</Text>

              {/* Fare Total */}
              <View style={styles.fareSection}>
                <View style={styles.totalFareRow}>
                  <Text style={styles.totalFareLabel}>TOTAL FARE :</Text>
                  <Text style={styles.totalFareAmount}>₹{Number(fare).toFixed(2)}</Text>
                </View>
                <View style={styles.paymentModeRow}>
                  <Text style={styles.monoKey}>PAYMENT MODE :</Text>
                  <Text style={styles.monoValBold}>{paymentMode} (VERIFIED)</Text>
                </View>
              </View>

              {/* QR Code / Barcode Simulation */}
              <View style={styles.qrSection}>
                <View style={styles.simulatedQrBox}>
                  <MaterialCommunityIcons name="qrcode" size={72} color="#1e293b" />
                </View>
                <Text style={styles.qrToken}>{ticketNo}</Text>
                <Text style={styles.authCode}>AUTH REF: TXN-AFCS-{Math.abs(ticketNo.hashCode ? ticketNo.hashCode() : 882914)}</Text>
              </View>

              {/* Footer Blessing */}
              <View style={styles.centerAlign}>
                <Text style={styles.footerMsg}>*** HAPPY JOURNEY ***</Text>
                <Text style={styles.footerNote}>Please retain ticket till end of journey.</Text>
                <Text style={styles.footerNote}>Complaints / Help: msrtc.maharashtra.gov.in</Text>
              </View>

              {/* Paper Bottom Jagged Cut */}
              <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - -</Text>
            </View>
          </ScrollView>

          {/* Action Footer Buttons */}
          <View style={styles.actionRow}>
            {Platform.OS === 'web' && (
              <Pressable
                onPress={handleThermalPrint}
                style={[styles.btn, styles.thermalPrintBtn]}
              >
                <MaterialCommunityIcons name="printer" size={16} color="#0f62fe" />
                <Text style={styles.thermalPrintBtnText}>Browser Print</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              style={[styles.btn, styles.doneBtn]}
            >
              <Text style={styles.doneBtnText}>Close & Ready Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#0f172a',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)' },
      default: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalHeaderText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  closeIconBtn: {
    padding: 4,
  },
  receiptScroll: {
    padding: spacing.md,
    alignItems: 'center',
  },
  thermalSlip: {
    width: '100%',
    backgroundColor: '#fafaf9', // Authentic receipt paper off-white
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' },
      default: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    }),
  },
  dashedLine: {
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    marginVertical: 4,
  },
  centerAlign: {
    alignItems: 'center',
    marginVertical: 4,
  },
  corpHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    fontSize: 12,
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  corpSubHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  reprintBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  reprintText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1.5,
  },
  monoKey: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  monoVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
  },
  monoValBold: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '900',
  },
  journeySection: {
    marginVertical: 4,
  },
  journeyStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  journeyTag: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    width: 60,
  },
  journeyStopName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
  },
  passengerSection: {
    marginVertical: 4,
  },
  tableHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1.5,
  },
  tableCol: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#334155',
  },
  tableColVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalPaxRow: {
    borderTopWidth: 1,
    borderColor: '#cbd5e1',
    paddingTop: 3,
    marginTop: 3,
  },
  tableColBold: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
  },
  tableColBoldVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  fareSection: {
    marginVertical: 4,
  },
  totalFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  totalFareLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalFareAmount: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  paymentModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  simulatedQrBox: {
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  qrToken: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  authCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  footerMsg: {
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  footerNote: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  thermalPrintBtn: {
    backgroundColor: '#0f62fe15',
    borderWidth: 1,
    borderColor: '#0f62fe',
  },
  thermalPrintBtnText: {
    color: '#0f62fe',
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#0f62fe',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
