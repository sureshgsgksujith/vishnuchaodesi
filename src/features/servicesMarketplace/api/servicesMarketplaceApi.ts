import { apiClient } from "../../../shared/api/client";

export type ServicesMarketplaceCapabilities = {
  module: "ServicesMarketplace";
  apiVersion: "v1";
  enabled: boolean;
  customerEnabled: boolean;
  providerEnabled: boolean;
  adminEnabled: boolean;
  permissions: string[];
};

export async function getServicesMarketplaceCapabilities() {
  return (
    await apiClient.get<ServicesMarketplaceCapabilities>(
      "/services/v1/capabilities",
    )
  ).data;
}

export type CatalogService = {
  service: { id: string; name: string; shortDescription?: string | null };
  subCategoryName: string;
  categoryName: string;
};
export type ServiceabilityDecision = {
  isServiceable: boolean;
  code: string;
  reason: string;
  areaId?: string | null;
  areaName?: string | null;
};
export async function getMarketplaceServices() {
  return (
    await apiClient.get<{ items: CatalogService[] }>("/services/v1/catalog", {
      params: { pageSize: 100 },
    })
  ).data.items;
}
export async function checkServiceability(payload: {
  serviceId: string;
  countryCode: string;
  administrativeArea?: string;
  locality?: string;
  postalCode?: string;
}) {
  return (
    await apiClient.post<ServiceabilityDecision>(
      "/services/v1/serviceability/check",
      payload,
    )
  ).data;
}

export type DiscoverySubCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
};
export type DiscoveryCategory = DiscoverySubCategory & {
  subCategories: DiscoverySubCategory[];
};
export type DiscoveryService = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  subCategoryId: string;
  subCategoryName: string;
  categoryId: string;
  categoryName: string;
  estimatedDurationMinutes?: number | null;
};
export type DiscoveryPage = {
  items: DiscoveryService[];
  page: number;
  pageSize: number;
  totalCount: number;
  unavailableReason?: string | null;
};
export type DiscoveryOption = {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  durationMinutes?: number | null;
};
export type DiscoveryDetail = {
  service: DiscoveryService;
  description?: string | null;
  inclusionsJson?: string | null;
  exclusionsJson?: string | null;
  preparationInstructions?: string | null;
  faqJson?: string | null;
  estimatedDurationMinutes?: number | null;
  packages: DiscoveryOption[];
  addOns: DiscoveryOption[];
};
export type QuoteResult = {
  quoteId: string;
  expiresAtUtc: string;
  price: {
    currencyCode: string;
    subtotalAmount: number;
    discountAmount: number;
    feeAmount: number;
    taxAmount: number;
    totalAmount: number;
    lines: { code: string; label: string; amount: number }[];
  };
};
export async function getDiscoveryCategories() {
  return (
    await apiClient.get<DiscoveryCategory[]>(
      "/services/v1/discovery/categories",
    )
  ).data;
}
export async function searchDiscoveryServices(
  params: Record<string, string | number | undefined>,
) {
  return (
    await apiClient.get<DiscoveryPage>("/services/v1/discovery/services", {
      params,
    })
  ).data;
}
export async function getDiscoveryService(id: string) {
  return (
    await apiClient.get<DiscoveryDetail>(
      `/services/v1/discovery/services/${id}`,
    )
  ).data;
}
export async function createServicesQuote(payload: {
  serviceId: string;
  packageId?: string | null;
  areaId?: string | null;
  quantity: number;
  durationMinutes?: number | null;
  scheduledAtUtc: string;
  isEmergency: boolean;
  currencyCode: string;
  addOns: { addOnId: string; quantity: number }[];
  discountReference?: string | null;
  approvedAdditionalWorkAmount: number;
}) {
  return (await apiClient.post<QuoteResult>("/services/v1/quotes", payload))
    .data;
}
export type ServiceSlot = {
  startAtUtc: string;
  endAtUtc: string;
  remainingCapacity: number;
  isInstant: boolean;
};
export type ServiceSlotSearch = {
  slots: ServiceSlot[];
  unavailableCode?: string | null;
  unavailableReason?: string | null;
  timeZoneId: string;
};
export async function searchServiceSlots(params: {
  serviceId: string;
  areaId: string;
  date: string;
  asap?: boolean;
}) {
  return (
    await apiClient.get<ServiceSlotSearch>("/services/v1/slots", { params })
  ).data;
}
export type ServiceSlotHold = {
  holdId: string;
  startAtUtc: string;
  endAtUtc: string;
  expiresAtUtc: string;
  status: string;
  rowVersion: string;
};
export async function holdServiceSlot(payload: {
  serviceId: string;
  areaId: string;
  startAtUtc: string;
  isInstant: boolean;
}) {
  return (
    await apiClient.post<ServiceSlotHold>("/services/v1/slots/holds", payload)
  ).data;
}
export async function confirmServiceSlot(hold: ServiceSlotHold) {
  return (
    await apiClient.post<ServiceSlotHold>(
      `/services/v1/slots/holds/${hold.holdId}/confirm`,
      { rowVersion: hold.rowVersion },
    )
  ).data;
}
export type BookingSummary = {
  id: string;
  referenceNumber: string;
  status: string;
  requestedStartAtUtc: string;
  requestedEndAtUtc: string;
  serviceName: string;
  currencyCode: string;
  totalAmount: number;
  createdAtUtc: string;
};
export type BookingDetail = {
  summary: BookingSummary;
  address: {
    reference?: string | null;
    line1: string;
    line2?: string | null;
    locality: string;
    administrativeArea: string;
    postalCode: string;
    countryCode: string;
  };
  customerNotes?: string | null;
  serviceSnapshotJson: string;
  packageSnapshotJson?: string | null;
  addOnsSnapshotJson: string;
  priceSnapshotJson: string;
};
export type BookingCreation = {
  created: boolean;
  code: string;
  reason: string;
  booking?: BookingDetail | null;
  replacementQuote?: QuoteResult | null;
};
export async function createServiceBooking(payload: object) {
  return (
    await apiClient.post<BookingCreation>("/services/v1/bookings", payload)
  ).data;
}
export async function getServiceBookings() {
  return (await apiClient.get<BookingSummary[]>("/services/v1/bookings")).data;
}
export async function getServiceBooking(id: string) {
  return (await apiClient.get<BookingDetail>(`/services/v1/bookings/${id}`))
    .data;
}

export type ProviderProfile = {
  id: string;
  providerType: "INDIVIDUAL" | "BUSINESS";
  status: string;
  displayName: string;
  businessName?: string | null;
  email: string;
  phone: string;
  addressReference?: string | null;
  addressLine?: string | null;
  locality?: string | null;
  administrativeArea?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  profileSummary?: string | null;
  termsAcknowledged: boolean;
  sopAcknowledged: boolean;
  completionPercent: number;
  submittedAtUtc?: string | null;
  reviewedAtUtc?: string | null;
  decisionReason?: string | null;
  history: {
    fromStatus: string;
    toStatus: string;
    reason?: string | null;
    createdAtUtc: string;
  }[];
};
export type ProviderProfileInput = Omit<
  ProviderProfile,
  | "id"
  | "status"
  | "completionPercent"
  | "submittedAtUtc"
  | "reviewedAtUtc"
  | "decisionReason"
  | "history"
>;
export async function getProviderOnboarding() {
  return (
    await apiClient.get<ProviderProfile>("/services/v1/provider/onboarding")
  ).data;
}
export async function startProviderOnboarding() {
  return (
    await apiClient.post<ProviderProfile>(
      "/services/v1/provider/onboarding/start",
    )
  ).data;
}
export async function updateProviderOnboarding(payload: ProviderProfileInput) {
  return (
    await apiClient.put<ProviderProfile>(
      "/services/v1/provider/onboarding",
      payload,
    )
  ).data;
}
export async function submitProviderOnboarding() {
  return (
    await apiClient.post<ProviderProfile>(
      "/services/v1/provider/onboarding/submit",
    )
  ).data;
}
export type VerificationRequirement = {
  id: string;
  requirementId: string;
  code: string;
  displayName: string;
  description?: string | null;
  status: string;
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  expiryRequired: boolean;
  expiresAtUtc?: string | null;
  rejectionReason?: string | null;
  document?: {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    scanStatus: string;
    version: number;
  } | null;
};
export async function getProviderVerification() {
  return (
    await apiClient.get<VerificationRequirement[]>(
      "/services/v1/provider/verification",
    )
  ).data;
}
export async function uploadProviderVerification(
  id: string,
  file: File,
  expiresAtUtc?: string,
) {
  const data = new FormData();
  data.append("file", file);
  if (expiresAtUtc)
    data.append("expiresAtUtc", new Date(expiresAtUtc).toISOString());
  return (
    await apiClient.post<VerificationRequirement>(
      `/services/v1/provider/verification/${id}/documents`,
      data,
    )
  ).data;
}
export async function getProviderDocumentAccess(id: string) {
  return (
    await apiClient.post<{ token: string; expiresAtUtc: string }>(
      `/services/v1/provider/verification/documents/${id}/access`,
    )
  ).data;
}
export async function downloadProviderDocument(token: string) {
  return (
    await apiClient.get<Blob>(
      "/services/v1/provider/verification/documents/access",
      { params: { token }, responseType: "blob" },
    )
  ).data;
}
export type ProviderQualification = {
  publicId: string;
  serviceId: string;
  serviceName: string;
  status: string;
  experienceYears?: number | null;
  skillsSummary?: string | null;
  certificationSummary?: string | null;
  eligibilityReason?: string | null;
  eligibility: {
    isEligible: boolean;
    code: string;
    reason: string;
    unsatisfiedRequirements: string[];
  };
};
export type ProviderTraining = {
  publicId: string;
  code: string;
  title: string;
  description?: string | null;
  contentType: string;
  contentUrl?: string | null;
  contentBody?: string | null;
  version: string;
  isMandatory: boolean;
  requiresAcknowledgement: boolean;
  passingScore?: number | null;
  isAcknowledged: boolean;
  isCompleted: boolean;
  quizScore?: number | null;
};
export async function getProviderQualifications() {
  return (
    await apiClient.get<ProviderQualification[]>(
      "/services/v1/provider/qualifications",
    )
  ).data;
}
export async function saveProviderQualification(
  serviceId: string,
  payload: {
    experienceYears?: number | null;
    skillsSummary?: string | null;
    certificationSummary?: string | null;
  },
) {
  await apiClient.put(
    `/services/v1/provider/qualifications/${serviceId}`,
    payload,
  );
}
export async function getProviderTraining(serviceId: string) {
  return (
    await apiClient.get<ProviderTraining[]>(
      `/services/v1/provider/qualifications/${serviceId}/training`,
    )
  ).data;
}
export async function completeProviderTraining(moduleId: string) {
  await apiClient.post(
    `/services/v1/provider/qualifications/training/${moduleId}/complete`,
  );
}
export type ProviderAvailability = {
  publicId: string;
  timeZoneId: string;
  isOnline: boolean;
  minimumLeadTimeMinutes: number;
  maximumAdvanceBookingDays: number;
  isAdminSuspended: boolean;
  adminSuspensionReason?: string | null;
  coverage: {
    publicId: string;
    serviceId: string;
    serviceName: string;
    areaId: string;
    areaName: string;
    originLatitude?: number | null;
    originLongitude?: number | null;
    maximumRadiusKm?: number | null;
    isActive: boolean;
  }[];
  weekly: {
    publicId: string;
    serviceId?: string | null;
    dayOfWeek: number;
    startLocalTime: string;
    endLocalTime: string;
    isActive: boolean;
  }[];
  periods: {
    publicId: string;
    serviceId?: string | null;
    periodType: string;
    startAtUtc: string;
    endAtUtc: string;
    reason?: string | null;
    isAdminOverride: boolean;
  }[];
};
export type AvailabilityOptions = {
  services: { id: string; name: string }[];
  areas: {
    publicId: string;
    name: string;
    countryCode: string;
    administrativeArea?: string | null;
    locality?: string | null;
  }[];
};
export async function getProviderAvailability() {
  return (
    await apiClient.get<ProviderAvailability>(
      "/services/v1/provider/availability",
    )
  ).data;
}
export async function getProviderAvailabilityOptions() {
  return (
    await apiClient.get<AvailabilityOptions>(
      "/services/v1/provider/availability/options",
    )
  ).data;
}
export async function saveProviderSupplySettings(payload: object) {
  await apiClient.put("/services/v1/provider/availability/settings", payload);
}
export async function addProviderCoverage(payload: object) {
  await apiClient.post("/services/v1/provider/availability/coverage", payload);
}
export async function addProviderWeeklySchedule(payload: object) {
  await apiClient.post("/services/v1/provider/availability/weekly", payload);
}
export async function addProviderAvailabilityPeriod(payload: object) {
  await apiClient.post("/services/v1/provider/availability/periods", payload);
}
export async function deleteProviderWeeklySchedule(id: string) {
  await apiClient.delete(`/services/v1/provider/availability/weekly/${id}`);
}
export async function deleteProviderAvailabilityPeriod(id: string) {
  await apiClient.delete(`/services/v1/provider/availability/periods/${id}`);
}
export type ProviderJobOffer = {
  offerId: string;
  bookingId: string;
  bookingReference: string;
  serviceName: string;
  startAtUtc: string;
  endAtUtc: string;
  status: string;
  expiresAtUtc: string;
  rowVersion: string;
};
export async function getProviderJobOffers() {
  return (
    await apiClient.get<ProviderJobOffer[]>("/services/v1/provider/job-offers")
  ).data;
}
export async function respondProviderJobOffer(
  offer: ProviderJobOffer,
  accept: boolean,
  reasonCode: string,
  note?: string,
) {
  return (
    await apiClient.post(
      `/services/v1/provider/job-offers/${offer.offerId}/respond`,
      { accept, reasonCode, note, rowVersion: offer.rowVersion },
    )
  ).data;
}
export type ProviderJobSummary = { id: string; referenceNumber: string; status: string; requestedStartAtUtc: string; requestedEndAtUtc: string; serviceName: string };
export type ProviderJobDetail = ProviderJobSummary & { serviceSnapshot: Record<string, unknown>; packageSnapshot?: Record<string, unknown> | null; addOns?: unknown; customerNotes?: string | null; address?: { line1: string; line2?: string | null; locality: string; administrativeArea: string; postalCode: string; countryCode: string } | null; navigationUrl?: string | null; contactMethod: string; checklistPreview: string[]; rowVersion: string };
export async function getProviderJobs(view: "upcoming" | "today" | "history") { return (await apiClient.get<ProviderJobSummary[]>("/services/v1/provider/jobs", { params: { view } })).data; }
export async function getProviderJob(id: string) { return (await apiClient.get<ProviderJobDetail>(`/services/v1/provider/jobs/${id}`)).data; }
export async function updateProviderJobStatus(job: ProviderJobDetail, action: string, eventId: string) { return (await apiClient.post(`/services/v1/provider/jobs/${job.id}/status`, { action, reasonCode: action, rowVersion: job.rowVersion, eventId })).data; }
export async function contactJobCustomer(id: string) { return (await apiClient.post<{ method: string; message: string }>(`/services/v1/provider/jobs/${id}/contact`)).data; }
export type CustomerJobProgress = {
  status: string;
  provider?: { displayName: string } | null;
  etaAtUtc?: string | null;
  liveLocationAvailable: boolean;
};
export async function getServiceBookingProgress(id: string) {
  return (await apiClient.get<CustomerJobProgress>(`/services/v1/bookings/${id}/progress`)).data;
}
export type JobProofRequirement = { publicId: string; proofType: string; displayName: string; instructions?: string | null; isRequiredForCompletion: boolean; minimumCount: number; maximumCount: number; maximumFileSizeBytes: number; allowedExtensions: string[]; approvedCount: number };
export type JobProof = { publicId: string; proofType: string; status: string; fileName: string; contentType: string; sizeBytes: number; scanStatus: string; metadataStrippedByClient: boolean; capturedAtUtc: string; reviewReason?: string | null };
export async function getProviderJobProofs(bookingId: string) { return (await apiClient.get<{ requirements: JobProofRequirement[]; proofs: JobProof[] }>(`/services/v1/provider/jobs/${bookingId}/proofs`)).data; }
export async function uploadProviderJobProof(bookingId: string, requirementId: string, file: File, metadataStrippedByClient: boolean) { const body = new FormData(); body.append("requirementId", requirementId); body.append("file", file); body.append("metadataStrippedByClient", String(metadataStrippedByClient)); return (await apiClient.post<JobProof>(`/services/v1/provider/jobs/${bookingId}/proofs`, body)).data; }
export async function getCustomerJobProofs(bookingId: string) { return (await apiClient.get<JobProof[]>(`/services/v1/bookings/${bookingId}/proofs`)).data; }
export async function getCustomerJobProofAccess(bookingId: string, proofId: string) { return (await apiClient.post<{ token: string }>(`/services/v1/bookings/${bookingId}/proofs/${proofId}/access`)).data; }
export async function getProviderJobProofAccess(bookingId: string, proofId: string) { return (await apiClient.post<{ token: string }>(`/services/v1/provider/jobs/${bookingId}/proofs/${proofId}/access`)).data; }
export async function downloadJobProof(token: string) { return (await apiClient.get<Blob>("/services/v1/job-proofs/access", { params: { token }, responseType: "blob" })).data; }
export type AdditionalWorkProposal = { publicId: string; status: string; currencyCode: string; totalAmount: number; reason: string; notes?: string | null; proofPublicId?: string | null; expiresAtUtc: string; decidedAtUtc?: string | null; decisionReason?: string | null; lines: { lineType: string; description: string; quantity: number; durationMinutes?: number | null; unitPrice: number; totalAmount: number; pricingSource: string }[] };
export async function getProviderAdditionalWork(bookingId: string) { return (await apiClient.get<AdditionalWorkProposal[]>(`/services/v1/provider/jobs/${bookingId}/additional-work`)).data; }
export async function proposeAdditionalWork(bookingId: string, payload: { idempotencyKey: string; reason: string; notes?: string; proofPublicId?: string; lines: { lineType: string; description: string; quantity: number; durationMinutes?: number; unitPrice: number }[] }) { return (await apiClient.post<AdditionalWorkProposal>(`/services/v1/provider/jobs/${bookingId}/additional-work`, payload)).data; }
export async function getCustomerAdditionalWork(bookingId: string) { return (await apiClient.get<{ proposals: AdditionalWorkProposal[]; originalTotal: number; approvedAdditionalTotal: number; finalPayableTotal: number }>(`/services/v1/bookings/${bookingId}/additional-work`)).data; }
export async function decideAdditionalWork(bookingId: string, proposalId: string, approve: boolean, reason?: string) { return (await apiClient.post<AdditionalWorkProposal>(`/services/v1/bookings/${bookingId}/additional-work/${proposalId}/decision`, { approve, reason })).data; }
export type ServicesPayment = { publicId: string; gateway: string; paymentIntentReference?: string | null; providerReference?: string | null; amount: number; currencyCode: string; status: string; failureCode?: string | null; retryCount: number; nextRetryAtUtc?: string | null };
export async function createServicesPayment(bookingId: string, idempotencyKey: string, paymentToken?: string) { return (await apiClient.post<ServicesPayment>(`/services/v1/bookings/${bookingId}/payments/intent`, { idempotencyKey, paymentToken })).data; }
export type ServicesInvoice = { publicId: string; invoiceNumber: string; currencyCode: string; originalAmount: number; approvedAdditionalAmount: number; discountAmount: number; feeAmount: number; taxAmount: number; totalAmount: number; issuedAtUtc: string };
export async function getProviderCompletion(bookingId: string) { return (await apiClient.get<{ checklist: { publicId: string; title: string; instructions?: string; isRequired: boolean; isCompleted: boolean; providerNote?: string }[]; invoice?: ServicesInvoice | null }>(`/services/v1/provider/jobs/${bookingId}/completion`)).data; }
export async function updateCompletionChecklist(bookingId: string, itemId: string, isCompleted: boolean, note?: string) { await apiClient.put(`/services/v1/provider/jobs/${bookingId}/completion/checklist/${itemId}`, { isCompleted, note }); }
export async function completeProviderJob(bookingId: string, finalNotes: string, rowVersion: string, idempotencyKey: string) { return (await apiClient.post(`/services/v1/provider/jobs/${bookingId}/completion`, { finalNotes, rowVersion, idempotencyKey })).data; }
export async function getCustomerCompletion(bookingId: string) { return (await apiClient.get<{ confirmed: boolean; invoice?: ServicesInvoice | null }>(`/services/v1/bookings/${bookingId}/completion`)).data; }
export async function confirmCustomerCompletion(bookingId: string) { return (await apiClient.post(`/services/v1/bookings/${bookingId}/completion/confirm`)).data; }
export async function downloadServicesInvoice(id: string) { return (await apiClient.get<Blob>(`/services/v1/invoices/${id}/pdf`, { responseType: "blob" })).data; }
