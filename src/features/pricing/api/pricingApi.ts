import { apiClient } from "../../../shared/api/client";

export type PricingPlan = {
  id: number;
  code: string;
  name: string;
  tagline: string;
  price: number;
  currency: string;
  listingLimit: number;
  eventLimit: number;
  blogPostLimit: number;
  jobLimit: number;
  couponLimit: number;
  photoLimit: number;
  videoLimit: number;
  durationMonths: number;
  isHighlighted: boolean;
  canCreateDuplicateListing?: boolean;
  canShareSocialMedia?: boolean;
  canGetDirectLeads?: boolean;
  hasEmailNotificationLeads?: boolean;
  hasVerifiedListing?: boolean;
  hasTrustedListing?: boolean;
  hasSpecialOffers?: boolean;
  hasUserDashboard?: boolean;
  hasReviewControl?: boolean;
  hasAdminTips?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  features: string[];
};

export type PlanUsage = {
  plan: PricingPlan;
  listingCount: number;
  listingRemaining: number;
  canCreateListing: boolean;
  isPlanExpired?: boolean;
  requiresPlanSelection?: boolean;
  message?: string | null;
};

export async function getPricingPlans() {
  const response = await apiClient.get<PricingPlan[]>("/PricingPlans");
  return response.data;
}

export async function getMyPlanUsage() {
  const response = await apiClient.get<PlanUsage>("/PricingPlans/me");
  return response.data;
}

export type PlanPayment = { id: number; planCode: string; planName: string; paymentReference: string; paymentProvider: string; paymentStatus: string; subtotalAmount: number; couponCode?: string | null; discountAmount: number; totalAmount: number; currency: string; paidAt?: string | null; createdAt: string };

export async function selectPricingPlan(planCode: string, payment?: { paymentReference: string; paymentProvider: string; couponCode?: string }) {
  const response = await apiClient.post<PlanUsage>(`/PricingPlans/${planCode}/select`, payment || null);
  return response.data;
}

export async function getMyPlanPayments() {
  const response = await apiClient.get<PlanPayment[]>("/PricingPlans/payments/mine", { timeout: 10000 });
  return response.data;
}

export async function validatePricingCoupon(code: string, subtotal: number) {
  const response = await apiClient.get<{ code: string; discountAmount: number; discountText: string }>(`/EventTickets/coupons/${encodeURIComponent(code)}/validate`, { params: { subtotal }, timeout: 10000 });
  return response.data;
}
