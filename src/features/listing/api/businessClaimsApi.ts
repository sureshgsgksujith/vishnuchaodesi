import { apiClient } from "../../../shared/api/client";

export type BusinessClaimPayload = {
  listingId: number;
  roleAtBusiness: string;
  businessEmail: string;
  businessPhone: string;
  evidenceNotes: string;
};

export async function submitBusinessClaim(payload: BusinessClaimPayload) {
  const response = await apiClient.post("/business-claims", payload);
  return response.data;
}
