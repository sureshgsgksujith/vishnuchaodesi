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
  rejectionCount: number;
  rejectionReason?: string | null;
  lastRejectedAt?: string | null;
  canEdit: boolean;
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
  restaurantFoodDetails?: Record<string, string | number | boolean | string[] | null>;
  vehicleDetails?: Record<string, string | number | boolean | string[] | null>;
  restaurantMenuItems?: Array<Record<string, string | number | boolean | null>>;
  restaurantOperatingHours?: Array<Record<string, string | boolean | null>>;
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
    logoUrl?: string;
    coverBannerUrl?: string;
  };
  sellerInformation: Record<string, string | boolean | null>;
  settings: Record<string, string | number | boolean | null>;
  restaurantFoodDetails?: Record<string, string | number | boolean | string[] | null>;
  vehicleDetails?: Record<string, string | number | boolean | string[] | null>;
  restaurantMenuItems?: Array<Record<string, string | number | boolean | null>>;
  restaurantOperatingHours?: Array<Record<string, string | boolean | null>>;
};

export type ListingUploadFiles = {
  profileImageFile?: File | null;
  coverImageFile?: File | null;
  galleryFiles?: Array<{ file: File; marker: string }>;
  serviceFiles?: Array<{ file: File; marker: string }>;
  offerFiles?: Array<{ file: File; marker: string }>;
};

export async function getMyListings(search = "", page = 1, pageSize = 10) {
  const response = await apiClient.get<ListingListResponse>("/Listings/mine", {
    params: {
      page,
      pageSize,
      search: search || undefined,
    },
    timeout: 8000,
  });

  return response.data;
}

export async function getRealEstateListings(page = 1, pageSize = 4) {
  const response = await apiClient.get<ListingListResponse>("/Listings/real-estate", {
    params: {
      page,
      pageSize,
    },
    timeout: 8000,
  });

  return response.data;
}

export async function getRestaurantFoodListings(page = 1, pageSize = 4) {
  const response = await apiClient.get<ListingListResponse>("/Listings/restaurants-food", {
    params: {
      page,
      pageSize,
    },
    timeout: 8000,
  });

  return response.data;
}

export async function createListing(
  payload: UpsertListingPayload,
  files?: ListingUploadFiles
) {
  const body = buildListingRequestBody(payload, files);

  const url = body instanceof FormData ? "/Listings/form" : "/Listings";

  const response = await apiClient.post<ListingSummary>(
    url,
    body,
    getRequestConfig(body)
  );

  return response.data;
}

export async function getListing(listingId: number) {
  const response = await apiClient.get<ListingSummary>(`/Listings/${listingId}`);
  return response.data;
}

export async function updateListing(
  listingId: number,
  payload: UpsertListingPayload,
  files?: ListingUploadFiles
) {
  const body = buildListingRequestBody(payload, files);

  const url =
    body instanceof FormData
      ? `/Listings/${listingId}/form`
      : `/Listings/${listingId}`;

  const response = await apiClient.put<ListingSummary>(
    url,
    body,
    getRequestConfig(body)
  );

  return response.data;
}

export async function deleteListing(listingId: number) {
  await apiClient.delete(`/Listings/${listingId}`);
}

export function getListingApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Listings are taking too long to load. Please try again.";
    }

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

function buildListingRequestBody(
  payload: UpsertListingPayload,
  files?: ListingUploadFiles
): UpsertListingPayload | FormData {
  const hasFiles =
    !!files?.profileImageFile ||
    !!files?.coverImageFile ||
    !!files?.galleryFiles?.length ||
    !!files?.serviceFiles?.length ||
    !!files?.offerFiles?.length;

  if (!hasFiles) {
    return payload;
  }

  const formData = new FormData();

  formData.append("payload", JSON.stringify(payload));

  if (files?.profileImageFile) {
    formData.append("profileImageFile", files.profileImageFile);
  }

  if (files?.coverImageFile) {
    formData.append("coverImageFile", files.coverImageFile);
  }

  for (const item of files?.galleryFiles || []) {
    formData.append("galleryFiles", item.file);
    formData.append("galleryFileMarkers", item.marker);
  }

  for (const item of files?.serviceFiles || []) {
    formData.append("serviceFiles", item.file);
    formData.append("serviceFileMarkers", item.marker);
  }

  for (const item of files?.offerFiles || []) {
    formData.append("offerFiles", item.file);
    formData.append("offerFileMarkers", item.marker);
  }

  return formData;
}

function getRequestConfig(body: UpsertListingPayload | FormData) {
  if (body instanceof FormData) {
    return undefined;
  }

  return {
    headers: {
      "Content-Type": "application/json",
    },
  };
}
