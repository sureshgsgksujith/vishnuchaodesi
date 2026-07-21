import { apiClient } from "../../../shared/api/client";

export type AstrologyReport = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  price: number;
  currency: string;
  deliveryText: string;
  features: string[];
  displayOrder: number;
  isActive: boolean;
};

export type AstrologyRequestType = "Report" | "Consultation" | "Question";

export type AstrologyRequestPayload = {
  requestType: AstrologyRequestType;
  reportId?: number;
  providerPostingId?: number;
  service?: string;
  name: string;
  email?: string;
  phone: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  preferredTime?: string;
  message?: string;
};

export type AstrologyRequest = {
  id: number;
  referenceNumber: string;
  requestType: AstrologyRequestType;
  reportId?: number | null;
  reportTitle?: string | null;
  providerPostingId?: number | null;
  providerName?: string | null;
  requestedService?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  status: string;
  notificationStatus: string;
  createdAt: string;
};

export async function getAstrologyReports() {
  const response = await apiClient.get<AstrologyReport[]>("/Astrology/reports", { timeout: 10000 });
  return response.data;
}

export async function submitAstrologyRequest(payload: AstrologyRequestPayload) {
  const response = await apiClient.post<AstrologyRequest>("/Astrology/requests", payload, { timeout: 15000 });
  return response.data;
}

export async function getMyAstrologyRequests() {
  const response = await apiClient.get<AstrologyRequest[]>("/Astrology/requests/mine", { timeout: 10000 });
  return response.data;
}
