import { apiClient } from "../../../shared/api/client";

export type PublicAllServicePostingSelectedService = {
  id: number;
  allServiceCategoryId: number;
  allServiceSubCategoryId: number;
  allServiceDetailedCategoryId: number;
  categoryName: string;
  categorySlug: string;
  subCategoryName: string;
  subCategorySlug: string;
  detailedCategoryName: string;
  detailedCategorySlug: string;
};

export type PublicAllServicePostingLocation = {
  label?: string | null;
  formattedAddress?: string | null;
  streetAddress?: string | null;
  suite?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  isPrimary?: boolean;
};

export type PublicAllServicePricingPackage = {
  serviceName: string;
  priceText: string;
  description?: string | null;
};

export type PublicAllServicePosting = {
  id: number;
  userId: number;
  providerType: string;
  businessName: string;
  tagline?: string | null;
  businessImageUrl?: string | null;
  primaryServiceLocation: string;
  serviceLocations: PublicAllServicePostingLocation[];
  allServiceCategoryId: number;
  allServiceCategoryName: string;
  allServiceCategorySlug: string;
  serviceName: string;
  experienceYears: number;
  description: string;
  workingMode: string;
  openDays?: string[];
  pricingPackages?: PublicAllServicePricingPackage[];
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  packageCode?: string;
  status: string;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  selectedServices: PublicAllServicePostingSelectedService[];
};

export type PublicAllServicePostingList = {
  items: PublicAllServicePosting[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type PublicAllServicePostingQuery = {
  categoryId?: number;
  category?: string;
  service?: string;
  detail?: string;
  detailIds?: string;
  subCategory?: string;
  city?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export async function getPublicAllServicePostings(query: PublicAllServicePostingQuery) {
  const response = await apiClient.get<PublicAllServicePostingList>("/AllServicePostings", {
    params: {
      categoryId: query.categoryId || undefined,
      category: query.category || undefined,
      service: query.service || undefined,
      detail: query.detail || undefined,
      detailIds: query.detailIds || undefined,
      subCategory: query.subCategory || undefined,
      city: query.city || undefined,
      page: query.page || 1,
      pageSize: query.pageSize || 6,
    },
    timeout: 10000,
  });

  return response.data;
}

export async function getPublicAllServicePosting(postingId: number) {
  const response = await apiClient.get<PublicAllServicePosting>(`/AllServicePostings/${postingId}`, {
    timeout: 10000,
  });

  return response.data;
}

export async function getMyAllServicePostings(query: PublicAllServicePostingQuery) {
  const response = await apiClient.get<PublicAllServicePostingList>("/AllServicePostings/mine", {
    params: {
      category: query.category || undefined,
      subCategory: query.subCategory || undefined,
      search: query.search || undefined,
      status: query.status || undefined,
      page: query.page || 1,
      pageSize: query.pageSize || 10,
    },
    timeout: 15000,
  });

  return response.data;
}
