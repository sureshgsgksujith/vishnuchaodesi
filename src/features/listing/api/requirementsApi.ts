import { apiClient } from "../../../shared/api/client";

export type RequirementPayload = {
  listingId?: number;
  listingTitle?: string;
  name: string;
  email?: string;
  mobileNumber: string;
  message?: string;
  categoryName?: string;
  pageUrl?: string;
  city?: string;
  desiredServices?: string[];
  matchingProviderIds?: number[];
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
  status: "New" | "Contacted" | "Qualified" | "Won" | "Lost";
  ownerNotes?: string | null;
  nextFollowUpAt?: string | null;
  updatedAt?: string | null;
  createdAt: string;
};

export async function submitRequirement(payload: RequirementPayload) {
  await apiClient.post("/Requirements", payload);
}

export async function updateRequirementPipeline(
  id: number,
  payload: Pick<RequirementEnquiry, "status" | "ownerNotes" | "nextFollowUpAt"> & { isRead?: boolean },
) {
  const response = await apiClient.patch<RequirementEnquiry>(`/Requirements/${id}/pipeline`, payload);
  return response.data;
}

export type ProviderInterestPayload = {
  providerId: number;
  name: string;
  email?: string;
  mobileNumber: string;
  message?: string;
  categoryName?: string;
  pageUrl?: string;
  city?: string;
  desiredServices?: string[];
};

export async function submitProviderInterest(payload: ProviderInterestPayload) {
  await apiClient.post("/Requirements/provider-interest", payload);
}

export type JobApplicationPayload = {
  listingId: number;
  name: string;
  email: string;
  mobileNumber: string;
  message?: string;
  pageUrl?: string;
  resume: File;
};

export async function submitJobApplication(payload: JobApplicationPayload) {
  const formData = new FormData();
  formData.append("listingId", String(payload.listingId));
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("mobileNumber", payload.mobileNumber);
  formData.append("message", payload.message || "");
  formData.append("pageUrl", payload.pageUrl || "");
  formData.append("resume", payload.resume);

  await apiClient.post("/Requirements/job-apply", formData);
}

export async function getMyRequirementEnquiries() {
  const response = await apiClient.get<RequirementEnquiry[]>("/Requirements/mine", {
    timeout: 10000,
  });

  return response.data;
}
