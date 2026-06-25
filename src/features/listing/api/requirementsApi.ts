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

export type RequirementEnquiry = {
  id: number;
  listingId?: number | null;
  leadType: string;
  listingTitle?: string | null;
  listingCategoryName?: string | null;
  listingSubCategory?: string | null;
  listingDetailCategory?: string | null;
  listingImageUrl?: string | null;
  city?: string | null;
  locality?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  categoryName?: string | null;
  pageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function submitRequirement(payload: RequirementPayload) {
  await apiClient.post("/Requirements", payload);
}

export async function getMyRequirementEnquiries() {
  const response = await apiClient.get<RequirementEnquiry[]>("/Requirements/mine", {
    timeout: 10000,
  });

  return response.data;
}
