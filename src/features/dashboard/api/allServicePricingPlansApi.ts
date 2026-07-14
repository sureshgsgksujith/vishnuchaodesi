import { apiClient } from "../../../shared/api/client";

export type AllServicePricingPlan = {
  id: number;
  code: string;
  name: string;
  tagline: string;
  price: number;
  currency: string;
  durationDays: number;
  photoLimit: number;
  videoLimit: number;
  serviceAreaLimit: number;
  leadLimit: number;
  features: string[];
  displayOrder: number;
  isHighlighted: boolean;
  isActive: boolean;
};

export async function getAllServicePricingPlans() {
  const response = await apiClient.get<AllServicePricingPlan[]>("/AllServicePricingPlans");
  return response.data;
}
