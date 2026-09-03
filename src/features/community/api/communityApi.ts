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
  return (await apiClient.get<{ flags: Record<string, boolean> }>("/community/features")).data.flags;
}

export type Page<T> = { items: T[]; page: number; pageSize: number; totalCount: number };
export type CursorPage<T> = { items: T[]; nextCursor?: string; hasMore: boolean };
export type CommunityGroup = { id: number; publicId: string; name: string; slug: string; visibility: string; status: string; description?: string; city?: string; state?: string; country?: string; memberCount: number; ownerUserId: number; currentUserRole?: string };
export type CommunityGroupMember = { id: number; userId: number; displayName: string; role: string; membershipStatus: string; joinedAtUtc: string };
export type CommunityPost = { id: number; groupId: number; authorName: string; postType: string; title?: string; body?: string; linkUrl?:string; mediaJson?:string; commentCount: number; reactionCount: number; publishedAtUtc?: string; createdAtUtc: string };
export type CommunityConversation = { id: number; conversationType: string; status: string; title?: string; groupId?: number; unreadCount: number; lastMessageAtUtc?: string; canAccept: boolean };
export type CommunityMessage = { id: number; conversationId: number; senderName: string; body?: string; sentAtUtc: string };
export type CommunityEvent = { id: number; title: string; eventMode: string; status: string; city?: string; state?: string; country?: string; venueName?: string; startAtUtc: string; endAtUtc: string; capacity?: number; confirmedCount: number; isPaid: boolean; currency: string };
export type CommunityTicket = { id:number;name:string;price:number;currency:string;capacity?:number;soldCount:number;salesEndAtUtc?:string };
export type CommunityRegistration = { id:number;status:string;totalAmount:number;currency:string;checkInTokens:string[] };
export type InvitationFunction = { id: number; name: string; startAtUtc: string; endAtUtc: string; timeZone: string; venueName?: string; address?: string; mapUrl?: string; dressCode?: string };
export type CommunityInvitationDetail = { id: number; invitationType: string; title: string; message?: string; hostDetails?: string; templateCode: string; themeCode: string; visibility: string; status: string; rsvpDeadlineUtc: string; functions: InvitationFunction[] };

const mutation = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
export const communityApi = {
  groups: async (params?: Record<string, unknown>) => (await apiClient.get<Page<CommunityGroup>>("/community/groups", { params })).data,
  groupBySlug: async (slug: string) => (await apiClient.get<CommunityGroup>(`/community/groups/by-slug/${encodeURIComponent(slug)}`)).data,
  createGroup: async (body: unknown) => (await apiClient.post<CommunityGroup>("/community/groups", body, mutation())).data,
  joinGroup: async (id: number) => (await apiClient.post(`/community/groups/${id}/join`, {}, mutation())).data,
  leaveGroup: async (id: number) => apiClient.post(`/community/groups/${id}/leave`, {}, mutation()),
  groupMembers: async (id: number) => (await apiClient.get<Page<CommunityGroupMember>>(`/community/groups/${id}/members`, { params: { pageSize: 100 } })).data,
  groupRequests: async (id:number) => (await apiClient.get<Page<Record<string,unknown>>>(`/community/groups/${id}/requests`,{params:{pageSize:100}})).data,
  reviewGroupRequest: async (groupId:number,requestId:number,decision:"approve"|"reject",reason?:string) => apiClient.post(`/community/groups/${groupId}/requests/${requestId}/${decision}`,{reason},mutation()),
  setMemberRole: async (groupId:number,userId:number,role:string) => apiClient.put(`/community/groups/${groupId}/members/${userId}/role`,{role}),
  removeMember: async (groupId:number,userId:number) => apiClient.delete(`/community/groups/${groupId}/members/${userId}`),
  banMember: async (groupId:number,userId:number,reason:string) => apiClient.post(`/community/groups/${groupId}/members/${userId}/ban`,{reason},mutation()),
  posts: async (groupId: number, cursor?: string) => (await apiClient.get<CursorPage<CommunityPost>>(`/community/groups/${groupId}/posts`, { params: { cursor, limit: 30 } })).data,
  createPost: async (body: unknown) => (await apiClient.post<CommunityPost>("/community/posts", body, mutation())).data,
  uploadMedia: async (file:File,purpose:string,targetId?:number) => { const body=new FormData();body.append("file",file);body.append("purpose",purpose);if(targetId)body.append("targetId",String(targetId));return (await apiClient.post<{url:string;thumbnailUrl?:string;mediaType:string;originalFileName:string}>("/community/media",body,{headers:{"Idempotency-Key":crypto.randomUUID()}})).data; },
  react: async (id: number, reactionType = "LIKE") => apiClient.put(`/community/posts/${id}/reaction`, { reactionType }),
  comment: async (id: number, body: string, parentCommentId?: number) => apiClient.post(`/community/posts/${id}/comments`, { body, parentCommentId }, mutation()),
  conversations: async () => (await apiClient.get<CursorPage<CommunityConversation>>("/community/conversations", { params: { limit: 50 } })).data,
  messages: async (id: number) => (await apiClient.get<CursorPage<CommunityMessage>>(`/community/conversations/${id}/messages`, { params: { limit: 50 } })).data,
  sendMessage: async (conversationId: number, body: string) => (await apiClient.post<CommunityMessage>("/community/messages", { conversationId, messageType: "TEXT", body }, mutation())).data,
  startDirect: async (userId: number) => (await apiClient.post("/community/conversations/direct", { userId }, mutation())).data,
  acceptConversation: async (id: number) => apiClient.post(`/community/conversations/${id}/accept`, {}),
  events: async (params?: Record<string, unknown>) => (await apiClient.get<Page<CommunityEvent>>("/community/events", { params })).data,
  createEvent: async (body: unknown) => (await apiClient.post<CommunityEvent>("/community/events", body, mutation())).data,
  registerEvent: async (id: number, name: string) => (await apiClient.post(`/community/events/${id}/registrations`, { attendees: [{ name }] }, mutation())).data,
  eventTickets: async (id:number) => (await apiClient.get<CommunityTicket[]>(`/community/events/${id}/tickets`)).data,
  registerEventDetails: async (id:number,body:unknown) => (await apiClient.post<CommunityRegistration>(`/community/events/${id}/registrations`,body,mutation())).data,
  cancelEventRegistration: async (eventId:number,registrationId:number) => apiClient.post(`/community/events/${eventId}/registrations/${registrationId}/cancel`,{}),
  eventCheckIn: async (eventId:number,token:string) => (await apiClient.post(`/community/events/${eventId}/checkins`,{token},mutation())).data,
  invitations: async () => (await apiClient.get<Page<Record<string, unknown>>>("/community/invitations")).data,
  createInvitation: async (body: unknown) => (await apiClient.post<{ id: number; publicToken: string }>("/community/invitations", body, mutation())).data,
  publishInvitation: async (id: number) => apiClient.post(`/community/invitations/${id}/publish`, {}),
  invitation: async (id: number) => (await apiClient.get<CommunityInvitationDetail>(`/community/invitations/${id}`)).data,
  invitationGuests: async (id: number) => (await apiClient.get<Page<Record<string, unknown>>>(`/community/invitations/${id}/guests`, { params: { pageSize: 100 } })).data,
  addInvitationGuest: async (id: number, body: unknown) => (await apiClient.post<{ id: number; guestToken: string }>(`/community/invitations/${id}/guests`, body, mutation())).data,
  scheduleInvitationReminder: async (id: number, body: unknown) => (await apiClient.post(`/community/invitations/${id}/reminders`, body)).data,
  accessInvitation: async (body: unknown) => (await apiClient.post<Record<string, unknown>>("/community/invitations/access", body)).data,
  rsvpInvitation: async (id: number, body: unknown) => apiClient.post(`/community/invitations/${id}/rsvp`, body, mutation()),
  notifications: async () => (await apiClient.get<CursorPage<Record<string, unknown>>>("/community/notifications", { params: { limit: 50 } })).data,
  readNotification: async (id: number) => apiClient.put(`/community/notifications/${id}/read`),
  report: async (body:unknown) => (await apiClient.post("/community/reports",body,mutation())).data,
  reports: async () => (await apiClient.get<Page<Record<string,unknown>>>("/community/reports",{params:{pageSize:100}})).data,
  analytics: async () => (await apiClient.get<Record<string,unknown>[]>("/community/analytics")).data,
  createRegistry: async (body: unknown) => (await apiClient.post("/community/gift-registries", body)).data,
  giftRegistries: async () => (await apiClient.get<Page<Record<string, unknown>>>("/community/gift-registries")).data,
  giftRegistry: async (id:number) => (await apiClient.get<Record<string,unknown>>(`/community/gift-registries/${id}`)).data,
  addGiftRegistryItem: async (id:number,body:unknown) => (await apiClient.post(`/community/gift-registries/${id}/items`,body)).data,
  sendDirectGift: async (body:unknown) => (await apiClient.post("/community/gifts/direct",body,mutation())).data,
  discover: async (location?: {city?: string;state?: string;country?: string}) => (await apiClient.get<{ groups: CommunityGroup[]; events: CommunityEvent[] }>("/community/discover", { params: location })).data,
};

export async function discoverCommunityWithFallback(location?: {city?: string;state?: string;country?: string}) {
  const local = await communityApi.discover(location);
  if (!location?.city && !location?.state && !location?.country || local.groups.length || local.events.length) {
    return { ...local, isShowingAllCities: false };
  }

  const allCities = await communityApi.discover();
  return { ...allCities, isShowingAllCities: true };
}
