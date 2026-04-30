import axios from "axios";
import { apiClient } from "../../../shared/api/client";

export type ListingSummary = {
  id: number;
  userId: number;
  title: string;
  slug: string;
  description: string;
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  status: string;
  views: number;
  rating: number;
  createdAt: string;
  updatedAt?: string | null;
  sellerName?: string | null;
  city?: string | null;
  locality?: string | null;
  price?: number | null;
  primaryImageUrl?: string | null;
  propertyDetails?: Record<string, string | number | boolean | null>;
  priceDetails?: Record<string, string | number | boolean | null>;
  locationDetails?: Record<string, string | number | null>;
  sellerInformation?: Record<string, string | boolean | null>;
  settings?: Record<string, string | number | boolean | null>;
  imageUrls?: string[];
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
};

export type ListingListResponse = {
  items: ListingSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type UpsertListingPayload = {
  title: string;
  slug?: string;
  description: string;
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  propertyDetails: Record<string, string | number | boolean | null>;
  priceDetails: Record<string, string | number | boolean | null>;
  locationDetails: Record<string, string | number | null>;
  amenities: Record<string, boolean>;
  media: {
    imageUrls: string[];
    videoUrl?: string;
    virtualTourUrl?: string;
  };
  sellerInformation: Record<string, string | boolean | null>;
  settings: Record<string, string | number | boolean | null>;
};

export async function getMyListings(search = "") {
  const response = await apiClient.get<ListingListResponse>("/Listings/mine", {
    params: { page: 1, pageSize: 100, search: search || undefined },
  });
  return response.data;
}

export async function createListing(payload: UpsertListingPayload) {
  const response = await apiClient.post<ListingSummary>("/Listings", payload);
  return response.data;
}

export async function getListing(listingId: number) {
  const response = await apiClient.get<ListingSummary>(`/Listings/${listingId}`);
  return response.data;
}

export async function updateListing(listingId: number, payload: UpsertListingPayload) {
  const response = await apiClient.put<ListingSummary>(`/Listings/${listingId}`, payload);
  return response.data;
}

export async function deleteListing(listingId: number) {
  await apiClient.delete(`/Listings/${listingId}`);
}

export function getListingApiErrorMessage(error: unknown) {
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

  return "Request failed. Please try again.";
}
