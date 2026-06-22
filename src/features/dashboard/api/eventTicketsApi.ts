import axios from "axios";
import { apiClient } from "../../../shared/api/client";

export type EventTicketItem = {
  name: string;
  quantity: number;
  price: number;
};

export type EventTicketBooking = {
  id: number;
  bookingReference: string;
  listingId: number;
  eventTitle: string;
  venue?: string | null;
  city?: string | null;
  buyerName?: string | null;
  buyerEmail: string;
  buyerPhone?: string | null;
  subtotalAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentProvider: string;
  paymentStatus: string;
  bookingStatus: string;
  paidAt: string;
  createdAt: string;
  items: EventTicketItem[];
};

export async function getMyEventTicketBookings() {
  const response = await apiClient.get<EventTicketBooking[]>("/EventTickets/mine", {
    timeout: 10000,
  });

  return response.data;
}

export function getEventTicketApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load event ticket bookings.";
}
