import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
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
    const result = await mockApi.verifyPayment(amount);
    return result;
  },
);

export const submitBooking = createAsyncThunk(
  "ticket/submitBooking",
  async (_, { getState }) => {
    const state = getState();
    const route = state.route.route;
    const conductor = state.conductor.profile;

    if (!route || !conductor) {
      throw new Error("Route or conductor details are missing");
    }

    const { boardingStop, destinationStop, passengerCounts, paymentMode } =
      state.ticket.draft;
    const fare = calculateFare(
      route,
      boardingStop,
      destinationStop,
      passengerCounts,
    );
    const ticket = {
      ticketId: nanoid(),
      passengerCounts,
      routeId: route.id,
      boardingStop,
      destinationStop,
      fare: fare.finalAmount,
      paymentMode,
      timestamp: new Date().toISOString(),
      conductorId: conductor.conductorId,
      busId: conductor.busId,
    };

    const response = await mockApi.submitTicketBooking(ticket);
    await storage.appendTicket(ticket);
    return { ticket, response };
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
  resetTicketState,
  hydrateHistory,
} = ticketSlice.actions;
export default ticketSlice.reducer;
