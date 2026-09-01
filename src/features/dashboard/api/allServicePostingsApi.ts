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
  paymentReference?: string;
  paymentProvider?: string;
  couponCode?: string;
  saveAsDraft: boolean;
};

export type AllServicePosting = AllServicePostingPayload & {
  id: number;
  userId: number;
  allServiceCategoryName: string;
  allServiceCategorySlug: string;
  status: string;
  isAvailable: boolean;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  paymentStatus: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paidAt?: string | null;
};

export async function createAllServicePosting(payload: AllServicePostingPayload) {
  const response = await apiClient.post<AllServicePosting>("/AllServicePostings", payload, {
    timeout: 15000,
  });

  return response.data;
}

export async function getMyAllServicePostings() {
  const response = await apiClient.get<{ items: AllServicePosting[] }>("/AllServicePostings/mine", { params: { page: 1, pageSize: 100 }, timeout: 10000 });
  return response.data.items || [];
}

export async function updateMyAllServicePostingAvailability(
  postingId: number,
  payload: { openDays: string[]; workingMode?: string },
) {
  const response = await apiClient.put<AllServicePosting>(
    `/AllServicePostings/mine/${postingId}/availability`,
    payload,
    { timeout: 10000 },
  );
  return response.data;
}

export async function setMyAllServicePostingActive(postingId: number, isActive: boolean) {
  const response = await apiClient.put<AllServicePosting>(
    `/AllServicePostings/mine/${postingId}/active`,
    { isActive },
    { timeout: 10000 },
  );
  return response.data;
}

export async function deleteMyAllServicePosting(postingId: number) {
  await apiClient.delete(`/AllServicePostings/mine/${postingId}`, { timeout: 10000 });
}

export async function validateAllServiceCoupon(code: string, planCode: string) {
  const response = await apiClient.get<{ code: string; discountAmount: number; totalAmount: number; currency: string }>(`/AllServicePostings/coupons/${encodeURIComponent(code)}/validate`, { params: { planCode }, timeout: 10000 });
  return response.data;
}
