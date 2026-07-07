import { apiClient } from "../../../shared/api/client";

export type AllServicePostingPayload = {
  providerType: string;
  businessName: string;
  tagline?: string;
  primaryServiceLocation: string;
  allServiceCategoryId: number;
  serviceName: string;
  selectedDetailedCategoryIds: number[];
  experienceYears: number;
  timeZone: string;
  description: string;
  workingMode: string;
  openDays: string[];
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
