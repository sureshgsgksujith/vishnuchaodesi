import { apiClient } from "../../../shared/api/client";

export type CommunityIdentity = {
  id: number;
  publicId: string;
  displayName: string;
};

export async function enterCommunity() {
  return (await apiClient.get<CommunityIdentity>("/community/me")).data;
}

export async function getCommunityFeatureFlags() {
  return (
    await apiClient.get<{ flags: Record<string, boolean> }>(
      "/community/features",
    )
  ).data.flags;
}

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};
export type CursorPage<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
};
export type CommunityGroup = {
  id: number;
  publicId: string;
  name: string;
  slug: string;
  visibility: string;
  status: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  languageCode?: string;
  rules?: string;
  joiningQuestionsJson?: string;
  memberCount: number;
  ownerUserId: number;
  currentUserRole?: string;
  currentUserRequestStatus?: string;
};
export type CommunityGroupMember = {
  id: number;
  userId: number;
  displayName: string;
  role: string;
  membershipStatus: string;
  joinedAtUtc: string;
};
export type CommunityPost = {
  id: number;
  groupId: number;
  authorUserId: number;
  authorName: string;
  postType: string;
  title?: string;
  body?: string;
  linkUrl?: string;
  mediaJson?: string;
  commentCount: number;
  reactionCount: number;
  publishedAtUtc?: string;
  createdAtUtc: string;
};
export type CommunityComment = {
  id: number;
  postId: number;
  authorUserId: number;
  authorName: string;
  parentCommentId?: number;
  body: string;
  depth: number;
  createdAtUtc: string;
};
export type CommunityConversation = {
  id: number;
  conversationType: string;
  status: string;
  title?: string;
  groupId?: number;
  unreadCount: number;
  lastMessageAtUtc?: string;
  canAccept: boolean;
  otherUserId?: number;
  canSendMessages: boolean;
};
export type CommunityUserSearchResult = {
  id: number;
  displayName: string;
  profileImageUrl?: string;
  isVerified: boolean;
  isCurrentUser?: boolean;
  directMessagePrivacy: "PUBLIC" | "PRIVATE";
  email?: string;
  phone?: string;
};
export type CommunityFriendProfile = {
  id: number;
  publicId: string;
  displayName: string;
  profileImageUrl?: string;
  isVerified: boolean;
  createdAtUtc: string;
  directMessagePrivacy: "PUBLIC" | "PRIVATE";
  connectionStatus: "NONE" | "REQUESTED" | "ACTIVE";
  conversationId?: number;
  canAccept: boolean;
  mutualGroups: { id: number; name: string; slug: string }[];
};
export type CommunityMessage = {
  id: number;
  conversationId: number;
  senderUserId: number;
  senderName: string;
  replyToMessageId?: number;
  messageType: string;
  body?: string;
  metadataJson?: string;
  sentAtUtc: string;
  editedAtUtc?: string;
};
export type CommunityEvent = {
  id: number;
  title: string;
  eventMode: string;
  status: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  venueName?: string;
  address?: string;
  postalCode?: string;
  startAtUtc: string;
  endAtUtc: string;
  registrationDeadlineUtc?: string;
  capacity?: number;
  confirmedCount: number;
  isPaid: boolean;
  currency: string;
  createdById: number;
  canManage: boolean;
  myRegistrationId?: number;
  myRegistrationStatus?: string;
};
export type CommunityEventRegistrationItem = {
  id: number;
  userId: number;
  displayName: string;
  registrationStatus: string;
  attendeeCount: number;
  totalAmount: number;
  currency: string;
  registeredAtUtc: string;
};
export type CommunityTicket = {
  id: number;
  name: string;
  price: number;
  currency: string;
  capacity?: number;
  soldCount: number;
  salesEndAtUtc?: string;
};
export type CommunityRegistration = {
  id: number;
  status: string;
  totalAmount: number;
  currency: string;
  checkInTokens: string[];
};
export type InvitationFunction = {
  id: number;
  name: string;
  startAtUtc: string;
  endAtUtc: string;
  timeZone: string;
  venueName?: string;
  address?: string;
  mapUrl?: string;
  dressCode?: string;
};
export type CommunityInvitationDetail = {
  id: number;
  invitationType: string;
  title: string;
  message?: string;
  hostDetails?: string;
  coverImageUrl?: string;
  templateCode: string;
  themeCode: string;
  visibility: string;
  status: string;
  rsvpDeadlineUtc: string;
  functions: InvitationFunction[];
};

const mutation = () => ({
  headers: { "Idempotency-Key": crypto.randomUUID() },
});
export const communityApi = {
  groups: async (params?: Record<string, unknown>) =>
    (await apiClient.get<Page<CommunityGroup>>("/community/groups", { params }))
      .data,
  groupBySlug: async (slug: string) =>
    (
      await apiClient.get<CommunityGroup>(
        `/community/groups/by-slug/${encodeURIComponent(slug)}`,
      )
    ).data,
  createGroup: async (body: unknown) =>
    (
      await apiClient.post<CommunityGroup>(
        "/community/groups",
        body,
        mutation(),
      )
    ).data,
  joinGroup: async (id: number) =>
    (await apiClient.post(`/community/groups/${id}/join`, {}, mutation())).data,
  leaveGroup: async (id: number) =>
    apiClient.post(`/community/groups/${id}/leave`, {}, mutation()),
  setGroupVisibility: async (id: number, visibility: "PUBLIC" | "PRIVATE") =>
    (
      await apiClient.put<CommunityGroup>(
        `/community/groups/${id}/visibility`,
        { visibility },
      )
    ).data,
  groupChatPermission: async (id: number) =>
    (await apiClient.get<{ mode: "ALL_MEMBERS" | "ADMINS_ONLY" }>(`/community/groups/${id}/chat-permission`)).data,
  setGroupChatPermission: async (id: number, mode: "ALL_MEMBERS" | "ADMINS_ONLY") =>
    (await apiClient.put<{ mode: "ALL_MEMBERS" | "ADMINS_ONLY" }>(`/community/groups/${id}/chat-permission`, { mode })).data,
  updateGroup: async (id: number, body: unknown) =>
    (await apiClient.put<CommunityGroup>(`/community/groups/${id}`, body)).data,
  archiveGroup: async (id: number) =>
    apiClient.delete(`/community/groups/${id}`),
  groupMembers: async (id: number) =>
    (
      await apiClient.get<Page<CommunityGroupMember>>(
        `/community/groups/${id}/members`,
        { params: { pageSize: 100 } },
      )
    ).data,
  inviteGroupMember: async (groupId: number, userId: number) =>
    (
      await apiClient.post(
        `/community/groups/${groupId}/invitations`,
        { userId },
        mutation(),
      )
    ).data,
  groupRequests: async (id: number) =>
    (
      await apiClient.get<Page<Record<string, unknown>>>(
        `/community/groups/${id}/requests`,
        { params: { pageSize: 100 } },
      )
    ).data,
  reviewGroupRequest: async (
    groupId: number,
    requestId: number,
    decision: "approve" | "reject",
    reason?: string,
  ) =>
    apiClient.post(
      `/community/groups/${groupId}/requests/${requestId}/${decision}`,
      { reason },
      mutation(),
    ),
  setMemberRole: async (groupId: number, userId: number, role: string) =>
    apiClient.put(`/community/groups/${groupId}/members/${userId}/role`, {
      role,
    }),
  removeMember: async (groupId: number, userId: number) =>
    apiClient.delete(`/community/groups/${groupId}/members/${userId}`),
  banMember: async (groupId: number, userId: number, reason: string) =>
    apiClient.post(
      `/community/groups/${groupId}/members/${userId}/ban`,
      { reason },
      mutation(),
    ),
  posts: async (groupId: number, cursor?: string) =>
    (
      await apiClient.get<CursorPage<CommunityPost>>(
        `/community/groups/${groupId}/posts`,
        { params: { cursor, limit: 30 } },
      )
    ).data,
  createPost: async (body: unknown) =>
    (await apiClient.post<CommunityPost>("/community/posts", body, mutation()))
      .data,
  uploadMedia: async (file: File, purpose: string, targetId?: number) => {
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", purpose);
    if (targetId) body.append("targetId", String(targetId));
    return (
      await apiClient.post<{
        url: string;
        thumbnailUrl?: string;
        mediaType: string;
        sizeBytes: number;
        originalFileName: string;
      }>("/community/media", body, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).data;
  },
  react: async (id: number, reactionType = "LIKE") =>
    apiClient.put(`/community/posts/${id}/reaction`, { reactionType }),
  comment: async (id: number, body: string, parentCommentId?: number) =>
    apiClient.post(
      `/community/posts/${id}/comments`,
      { body, parentCommentId },
      mutation(),
    ),
  comments: async (id: number) =>
    (
      await apiClient.get<Page<CommunityComment>>(
        `/community/posts/${id}/comments`,
        { params: { pageSize: 100 } },
      )
    ).data,
  conversations: async () =>
    (
      await apiClient.get<CursorPage<CommunityConversation>>(
        "/community/conversations",
        { params: { limit: 50 } },
      )
    ).data,
  createGroupConversation: async (groupId: number, title: string) =>
    (
      await apiClient.post<{ id: number }>(
        "/community/conversations/group",
        { groupId, title, announcementOnly: false },
        mutation(),
      )
    ).data,
  messages: async (id: number) =>
    (
      await apiClient.get<CursorPage<CommunityMessage>>(
        `/community/conversations/${id}/messages`,
        { params: { limit: 50 } },
      )
    ).data,
  markConversationRead: async (id: number) =>
    apiClient.put(`/community/conversations/${id}/read`),
  messagingSettings: async () =>
    (
      await apiClient.get<{
        messageEditMinutes: number;
        messageDeleteMinutes: number;
      }>("/community/messaging/settings")
    ).data,
  sendMessage: async (
    conversationId: number,
    body: string,
    replyToMessageId?: number,
  ) =>
    (
      await apiClient.post<CommunityMessage>(
        "/community/messages",
        { conversationId, messageType: "TEXT", body, replyToMessageId },
        mutation(),
      )
    ).data,
  sendVoiceMessage: async (
    conversationId: number,
    url: string,
    durationSeconds: number,
    replyToMessageId?: number,
  ) =>
    (
      await apiClient.post<CommunityMessage>(
        "/community/messages",
        {
          conversationId,
          messageType: "AUDIO",
          replyToMessageId,
          metadataJson: JSON.stringify({ url, durationSeconds }),
        },
        mutation(),
      )
    ).data,
  sendAttachment: async (
    conversationId: number,
    messageType: "IMAGE" | "AUDIO" | "DOCUMENT",
    metadata: Record<string, unknown>,
    caption?: string,
    replyToMessageId?: number,
  ) =>
    (
      await apiClient.post<CommunityMessage>(
        "/community/messages",
        {
          conversationId,
          messageType,
          body: caption?.trim() || undefined,
          replyToMessageId,
          metadataJson: JSON.stringify(metadata),
        },
        mutation(),
      )
    ).data,
  sendLocation: async (
    conversationId: number,
    latitude: number,
    longitude: number,
    replyToMessageId?: number,
  ) =>
    (
      await apiClient.post<CommunityMessage>(
        "/community/messages",
        {
          conversationId,
          messageType: "LOCATION",
          body: "Shared location",
          replyToMessageId,
          metadataJson: JSON.stringify({
            latitude,
            longitude,
            mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
          }),
        },
        mutation(),
      )
    ).data,
  editMessage: async (id: number, body: string) =>
    (await apiClient.put(`/community/messages/${id}`, { body })).data,
  deleteMessage: async (id: number) =>
    apiClient.delete(`/community/messages/${id}`),
  startDirect: async (userId: number) =>
    (
      await apiClient.post(
        "/community/conversations/direct",
        { userId },
        mutation(),
      )
    ).data,
  searchUsers: async (query: string) =>
    (
      await apiClient.get<CommunityUserSearchResult[]>(
        "/community/users/search",
        { params: { query } },
      )
    ).data,
  friendProfile: async (id: number) =>
    (
      await apiClient.get<CommunityFriendProfile>(
        `/community/users/${id}/profile`,
      )
    ).data,
  setMessagingPrivacy: async (privacy: "PUBLIC" | "PRIVATE") =>
    (await apiClient.put("/community/me/messaging-privacy", { privacy })).data,
  messagingPrivacy: async () =>
    (
      await apiClient.get<{ directMessagePrivacy: "PUBLIC" | "PRIVATE" }>(
        "/community/me/messaging-privacy",
      )
    ).data,
  acceptConversation: async (id: number) =>
    apiClient.post(`/community/conversations/${id}/accept`, {}),
  events: async (params?: Record<string, unknown>) =>
    (await apiClient.get<Page<CommunityEvent>>("/community/events", { params }))
      .data,
  createEvent: async (body: unknown) =>
    (
      await apiClient.post<CommunityEvent>(
        "/community/events",
        body,
        mutation(),
      )
    ).data,
  createEventTicket: async (eventId: number, body: unknown) =>
    (
      await apiClient.post<{ id: number }>(
        `/community/events/${eventId}/tickets`,
        body,
      )
    ).data,
  updateEvent: async (id: number, body: unknown) =>
    (await apiClient.put<CommunityEvent>(`/community/events/${id}`, body)).data,
  deleteEvent: async (id: number) => apiClient.delete(`/community/events/${id}`),
  eventRegistrations: async (id: number) =>
    (
      await apiClient.get<Page<CommunityEventRegistrationItem>>(
        `/community/events/${id}/registrations`,
        { params: { page: 1, pageSize: 100 } },
      )
    ).data,
  refundEventRegistration: async (eventId: number, registrationId: number) =>
    apiClient.post(
      `/community/events/${eventId}/registrations/${registrationId}/refund`,
      { reason: "Removed by event organizer" },
      mutation(),
    ),
  registerEvent: async (id: number, name: string) =>
    (
      await apiClient.post(
        `/community/events/${id}/registrations`,
        { attendees: [{ name }] },
        mutation(),
      )
    ).data,
  eventTickets: async (id: number) =>
    (await apiClient.get<CommunityTicket[]>(`/community/events/${id}/tickets`))
      .data,
  myEventRegistration: async (id: number) =>
    (
      await apiClient.get<CommunityRegistration>(
        `/community/events/${id}/my-registration`,
      )
    ).data,
  registerEventDetails: async (id: number, body: unknown) =>
    (
      await apiClient.post<CommunityRegistration>(
        `/community/events/${id}/registrations`,
        body,
        mutation(),
      )
    ).data,
  cancelEventRegistration: async (eventId: number, registrationId: number) =>
    apiClient.post(
      `/community/events/${eventId}/registrations/${registrationId}/cancel`,
      {},
    ),
  eventCheckIn: async (eventId: number, token: string) =>
    (
      await apiClient.post(
        `/community/events/${eventId}/checkins`,
        { token },
        mutation(),
      )
    ).data,
  invitations: async () =>
    (
      await apiClient.get<Page<Record<string, unknown>>>(
        "/community/invitations",
      )
    ).data,
  createInvitation: async (body: unknown) =>
    (
      await apiClient.post<{ id: number; publicToken: string }>(
        "/community/invitations",
        body,
        mutation(),
      )
    ).data,
  updateInvitation: async (id: number, body: unknown) =>
    apiClient.put(`/community/invitations/${id}`, body),
  updateInvitationCover: async (id: number, coverImageUrl: string) =>
    apiClient.put(`/community/invitations/${id}/cover`, { coverImageUrl }),
  publishInvitation: async (id: number) =>
    apiClient.post(`/community/invitations/${id}/publish`, {}),
  invitation: async (id: number) =>
    (
      await apiClient.get<CommunityInvitationDetail>(
        `/community/invitations/${id}`,
      )
    ).data,
  invitationGuests: async (id: number) =>
    (
      await apiClient.get<Page<Record<string, unknown>>>(
        `/community/invitations/${id}/guests`,
        { params: { pageSize: 100 } },
      )
    ).data,
  addInvitationGuest: async (id: number, body: unknown) =>
    (
      await apiClient.post<{ id: number; guestToken: string }>(
        `/community/invitations/${id}/guests`,
        body,
        mutation(),
      )
    ).data,
  scheduleInvitationReminder: async (id: number, body: unknown) =>
    (await apiClient.post(`/community/invitations/${id}/reminders`, body)).data,
  accessInvitation: async (body: unknown) =>
    (
      await apiClient.post<Record<string, unknown>>(
        "/community/invitations/access",
        body,
      )
    ).data,
  rsvpInvitation: async (id: number, body: unknown) =>
    apiClient.post(`/community/invitations/${id}/rsvp`, body, mutation()),
  notifications: async () =>
    (
      await apiClient.get<CursorPage<Record<string, unknown>>>(
        "/community/notifications",
        { params: { limit: 50 } },
      )
    ).data,
  readNotification: async (id: number) =>
    apiClient.put(`/community/notifications/${id}/read`),
  report: async (body: unknown) =>
    (await apiClient.post("/community/reports", body, mutation())).data,
  reports: async () =>
    (
      await apiClient.get<Page<Record<string, unknown>>>("/community/reports", {
        params: { pageSize: 100 },
      })
    ).data,
  analytics: async () =>
    (await apiClient.get<Record<string, unknown>[]>("/community/analytics"))
      .data,
  createRegistry: async (body: unknown) =>
    (await apiClient.post<{ id: number }>("/community/gift-registries", body))
      .data,
  giftRegistries: async () =>
    (
      await apiClient.get<Page<Record<string, unknown>>>(
        "/community/gift-registries",
      )
    ).data,
  giftRegistry: async (id: number) =>
    (
      await apiClient.get<Record<string, unknown>>(
        `/community/gift-registries/${id}`,
      )
    ).data,
  addGiftRegistryItem: async (id: number, body: unknown) =>
    (await apiClient.post(`/community/gift-registries/${id}/items`, body)).data,
  updateGiftRegistry: async (id: number, body: unknown) =>
    (await apiClient.put(`/community/gift-registries/${id}`, body)).data,
  archiveGiftRegistry: async (id: number) =>
    apiClient.delete(`/community/gift-registries/${id}`),
  updateGiftItem: async (id: number, body: unknown) =>
    (await apiClient.put(`/community/gift-items/${id}`, body)).data,
  deleteGiftItem: async (id: number) =>
    apiClient.delete(`/community/gift-items/${id}`),
  discoverGiftRegistries: async () =>
    (
      await apiClient.get<Record<string, unknown>[]>(
        "/community/gift-registries/discover",
      )
    ).data,
  giftOrders: async () =>
    (await apiClient.get<Record<string, unknown>[]>("/community/gift-orders"))
      .data,
  reserveGiftItem: async (itemId: number, quantity = 1) =>
    (
      await apiClient.post(`/community/gift-items/${itemId}/reserve`, {
        quantity,
      })
    ).data,
  sendGiftItem: async (itemId: number, quantity = 1) =>
    (
      await apiClient.post(`/community/gift-items/${itemId}/send`, {
        quantity,
      })
    ).data,
  purchaseGiftOrder: async (id: number, paymentToken: string) =>
    apiClient.post(
      `/community/gift-orders/${id}/purchase`,
      { paymentToken },
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
    ),
  shipGiftOrder: async (
    id: number,
    carrier: string,
    trackingNumber: string,
    trackingUrl?: string,
  ) =>
    apiClient.post(`/community/gift-orders/${id}/ship`, {
      carrier,
      trackingNumber,
      trackingUrl,
    }),
  giftOrderAction: async (id: number, action: "delivered" | "received") =>
    apiClient.post(`/community/gift-orders/${id}/${action}`, {}),
  giftOrderReason: async (
    id: number,
    action: "cancel" | "dispute",
    reason: string,
  ) => apiClient.post(`/community/gift-orders/${id}/${action}`, { reason }),
  giftOrderReceipt: async (id: number) =>
    (await apiClient.get<Record<string, unknown>>(`/community/gift-orders/${id}/receipt`)).data,
  sendDirectGift: async (body: unknown) =>
    (await apiClient.post("/community/gifts/direct", body, mutation())).data,
  discover: async (location?: {
    city?: string;
    state?: string;
    country?: string;
  }) =>
    (
      await apiClient.get<{
        groups: CommunityGroup[];
        events: CommunityEvent[];
      }>("/community/discover", { params: location })
    ).data,
};

export async function discoverCommunityWithFallback(location?: {
  city?: string;
  state?: string;
  country?: string;
}) {
  const local = await communityApi.discover(location);
  if (
    (!location?.city && !location?.state && !location?.country) ||
    local.groups.length ||
    local.events.length
  ) {
    return { ...local, isShowingAllCities: false };
  }

  const allCities = await communityApi.discover();
  return { ...allCities, isShowingAllCities: true };
}
