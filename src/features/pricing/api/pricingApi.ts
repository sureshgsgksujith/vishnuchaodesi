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

export async function selectPricingPlan(planCode: string) {
  const response = await apiClient.post<PlanUsage>(`/PricingPlans/${planCode}/select`);
  return response.data;
}
