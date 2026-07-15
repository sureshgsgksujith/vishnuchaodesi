import axios from "axios";
import { apiClient } from "../../../shared/api/client";

export type ArtistTour = {
  id: number;
  artistName: string;
  tourTitle: string;
  slug: string;
  startDate: string;
  endDate?: string | null;
  tourCities: string;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  country: string;
  description: string;
  imageUrl: string;
  ticketUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
};

export type ArtistTourList = {
  items: ArtistTour[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type UpsertArtistTourPayload = {
  artistName: string;
  tourTitle: string;
  startDate: string;
  endDate?: string | null;
  tourCities: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  description: string;
  imageUrl?: string;
  ticketUrl?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
};

export async function getArtistTours(page = 1, pageSize = 12, search = "") {
  const response = await apiClient.get<ArtistTourList>("/ArtistTours", {
    params: { page, pageSize, search: search || undefined },
  });

  return response.data;
}

export async function getArtistTour(tourId: number) {
  const response = await apiClient.get<ArtistTour>(`/ArtistTours/${tourId}`);
  return response.data;
}

export async function createArtistTour(payload: UpsertArtistTourPayload) {
  const response = await apiClient.post<ArtistTour>("/ArtistTours", payload);
  return response.data;
}

export function getArtistTourApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Unable to complete the artist tour request right now.";
}
