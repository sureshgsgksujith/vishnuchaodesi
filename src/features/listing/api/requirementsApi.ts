import { apiClient } from "../../../shared/api/client";

export type RequirementPayload = {
  listingId?: number;
  listingTitle?: string;
  name: string;
  email: string;
  mobileNumber: string;
  message?: string;
  categoryName?: string;
  pageUrl?: string;
};

export async function submitRequirement(payload: RequirementPayload) {
  await apiClient.post("/Requirements", payload);
}
