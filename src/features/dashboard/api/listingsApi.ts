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
  amenities?: Record<string, boolean>;
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

export type ListingUploadFiles = {
  profileImageFile?: File | null;
  coverImageFile?: File | null;
  galleryFiles?: Array<{ file: File; marker: string }>;
};

export async function getMyListings(search = "") {
  const response = await apiClient.get<ListingListResponse>("/Listings/mine", {
    params: { page: 1, pageSize: 100, search: search || undefined },
  });
  return response.data;
}

export async function createListing(payload: UpsertListingPayload, files?: ListingUploadFiles) {
  const body = buildListingRequestBody(payload, files);
  const response = await apiClient.post<ListingSummary>("/Listings", body, getRequestConfig(body));
  return response.data;
}

export async function getListing(listingId: number) {
  const response = await apiClient.get<ListingSummary>(`/Listings/${listingId}`);
  return response.data;
}

export async function updateListing(listingId: number, payload: UpsertListingPayload, files?: ListingUploadFiles) {
  const body = buildListingRequestBody(payload, files);
  const response = await apiClient.put<ListingSummary>(`/Listings/${listingId}`, body, getRequestConfig(body));
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

function buildListingRequestBody(payload: UpsertListingPayload, files?: ListingUploadFiles) {
  if (!files?.profileImageFile && !files?.coverImageFile && !files?.galleryFiles?.length) {
    return payload;
  }

  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));

  if (files.profileImageFile) {
    formData.append("profileImageFile", files.profileImageFile);
  }

  if (files.coverImageFile) {
    formData.append("coverImageFile", files.coverImageFile);
  }

  for (const item of files.galleryFiles || []) {
    formData.append("galleryFiles", item.file);
    formData.append("galleryFileMarkers", item.marker);
  }

  return formData;
}

function getRequestConfig(body: UpsertListingPayload | FormData) {
  return body instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;
}
