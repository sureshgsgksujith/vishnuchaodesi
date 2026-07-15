import { apiClient } from "../../../shared/api/client";

export type AllServicePostingLocation = {
  label?: string;
  formattedAddress: string;
  streetAddress?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  isPrimary?: boolean;
};

export type AllServicePricingPackage = {
  serviceName: string;
  priceText: string;
  description?: string;
};

export type AllServicePostingPayload = {
  providerType: string;
  businessName: string;
  tagline?: string;
  businessImageUrl?: string;
  primaryServiceLocation: string;
  serviceLocations?: AllServicePostingLocation[];
  allServiceCategoryId: number;
  serviceName: string;
  selectedDetailedCategoryIds: number[];
  experienceYears: number;
  timeZone: string;
  description: string;
  workingMode: string;
  openDays: string[];
  pricingPackages?: AllServicePricingPackage[];
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  verificationMethod: string;
  isPhoneVerified: boolean;
  packageCode: string;
  saveAsDraft: boolean;
};

export type AllServicePosting = AllServicePostingPayload & {
  id: number;
  userId: number;
  allServiceCategoryName: string;
  allServiceCategorySlug: string;
  status: string;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export async function createAllServicePosting(payload: AllServicePostingPayload) {
  const response = await apiClient.post<AllServicePosting>("/AllServicePostings", payload, {
    timeout: 15000,
  });

  return response.data;
}
