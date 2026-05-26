// File: src/store/slices/ticketSlice.js
// Purpose: Owns ticket booking draft state, payment state, and local history.
// Imports: mock API, storage, and fare helpers.
// Behavior: Booking screens dispatch here and receive the updated ticket state.
import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";

import { storage } from "../../services/storage";
import { calculateFare } from "../../utils/fare";

const emptyCounts = { women: 0, seniors: 0, children: 0, adultMale: 1 };

const initialState = {
  draft: {
    boardingStop: "",
    destinationStop: "",
    passengerCounts: emptyCounts,
    paymentMode: "cash",
  },
  paymentStatus: "idle",
  bookingStatus: "idle",
  bookingError: null,
  history: [],
  currentTicket: null,
  lastPaymentReference: null,
};

export const verifyOnlinePayment = createAsyncThunk(
  "ticket/verifyPayment",
  async (amount) => {
    // In a real app this would call a payment gateway.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { status: amount > 0 ? "success" : "failed", referenceId: `PAY-${Date.now()}` };
  },
);

export const submitBooking = createAsyncThunk(
  "ticket/submitBooking",
  async (ticketData, { getState }) => {
    const state = getState();
    const route = state.route.route;

    const { boardingStop, destinationStop, passengerCounts, paymentMode } =
      state.ticket.draft;
    const fare = calculateFare(
      route,
      boardingStop,
      destinationStop,
      passengerCounts,
    );
    const ticket = {
      ticketId: ticketData.ticket_id || nanoid(),
      passengerCounts,
      routeId: route?.route_id || "unknown_route",
      boardingStop,
      destinationStop,
      fare: fare.finalAmount,
      paymentMode,
      timestamp: new Date().toISOString(),
    };

    await storage.appendTicket(ticket);
    return { ticket };
  },
);

const ticketSlice = createSlice({
  name: "ticket",
  initialState,
  reducers: {
    updateDraft(state, action) {
      state.draft = { ...state.draft, ...action.payload };
    },
    updatePassengerCounts(state, action) {
      state.draft.passengerCounts = {
        ...state.draft.passengerCounts,
        ...action.payload,
      };
    },
    setPaymentMode(state, action) {
      state.draft.paymentMode = action.payload;
      state.paymentStatus = "idle";
    },
    clearBookingStops(state) {
      state.draft.destinationStop = "";
      state.draft.passengerCounts = { ...emptyCounts };
      state.paymentStatus = "idle";
      state.bookingStatus = "idle";
      state.bookingError = null;
      state.currentTicket = null;
    },
    resetTicketState(state) {
      state.paymentStatus = "idle";
      state.bookingStatus = "idle";
      state.bookingError = null;
      state.currentTicket = null;
      state.lastPaymentReference = null;
    },
    hydrateHistory(state, action) {
      state.history = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyOnlinePayment.pending, (state) => {
        state.paymentStatus = "pending";
      })
      .addCase(verifyOnlinePayment.fulfilled, (state, action) => {
        state.paymentStatus =
          action.payload.status === "success" ? "success" : "failed";
        state.lastPaymentReference = action.payload.referenceId;
      })
      .addCase(verifyOnlinePayment.rejected, (state) => {
        state.paymentStatus = "failed";
      })
      .addCase(submitBooking.pending, (state) => {
        state.bookingStatus = "pending";
        state.bookingError = null;
      })
      .addCase(submitBooking.fulfilled, (state, action) => {
        state.bookingStatus = "success";
        state.currentTicket = action.payload.ticket;
        state.history = [action.payload.ticket, ...state.history];
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.bookingStatus = "failed";
        state.bookingError = action.error.message ?? "Ticket booking failed";
      });
  },
});

export const {
  updateDraft,
  updatePassengerCounts,
  setPaymentMode,
  clearBookingStops,
  resetTicketState,
  hydrateHistory,
} = ticketSlice.actions;
export default ticketSlice.reducer;
