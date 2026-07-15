import { apiClient } from "../../../shared/api/client";

export type UserNotification = {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  ctaLink?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
};

export type UserNotificationList = {
  items: UserNotification[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
};

export async function getMyNotifications(page = 1, pageSize = 10, isRead?: boolean) {
  const response = await apiClient.get<UserNotificationList>("/Notifications", {
    params: { page, pageSize, isRead },
  });

  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await apiClient.get<{ unreadCount: number }>("/Notifications/unread-count");
  return response.data.unreadCount;
}

export async function markNotificationRead(notificationId: number) {
  await apiClient.put(`/Notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  await apiClient.put("/Notifications/read-all");
}
