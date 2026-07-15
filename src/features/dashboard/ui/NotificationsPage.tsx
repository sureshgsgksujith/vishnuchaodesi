import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "../api/notificationsApi";
import "../styles/dashboardPage.css";

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") === "read" ? "read" : searchParams.get("status") === "unread" ? "unread" : "all";
  const [items, setItems] = useState<UserNotification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const pageSize = 10;

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setErrorMessage("");

    const isRead = status === "read" ? true : status === "unread" ? false : undefined;

    getMyNotifications(page, pageSize, isRead)
      .then((result) => {
        if (!isActive) return;
        setItems(result.items || []);
        setTotalCount(result.totalCount || 0);
        setUnreadCount(result.unreadCount || 0);
      })
      .catch(() => {
        if (!isActive) return;
        setItems([]);
        setTotalCount(0);
        setUnreadCount(0);
        setErrorMessage("Unable to load notifications right now.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageTitle = status === "read" ? "Read Notifications" : status === "unread" ? "Unread Notifications" : "All Notifications";

  function handleStatusChange(nextStatus: "all" | "unread" | "read") {
    setPage(1);
    if (nextStatus === "all") {
      setSearchParams({});
      return;
    }

    setSearchParams({ status: nextStatus });
  }

  async function handleRead(notification: UserNotification) {
    if (notification.isRead) return;

    setItems((currentItems) => currentItems.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setUnreadCount((currentCount) => Math.max(0, currentCount - 1));

    try {
      await markNotificationRead(notification.id);
    } catch {
      setItems((currentItems) => currentItems.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)));
      setUnreadCount((currentCount) => currentCount + 1);
    }
  }

  async function handleMarkAllRead() {
    setItems((currentItems) => currentItems.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      const result = await getMyNotifications(page, pageSize);
      setItems(result.items || []);
      setTotalCount(result.totalCount || 0);
      setUnreadCount(result.unreadCount || 0);
    }
  }

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Notifications</span>
        <div className="ud-cen-s2 customer-notifications-page">
          <div className="customer-notifications-head">
            <div>
              <h2>{pageTitle}</h2>
              <p>{unreadCount} unread of {totalCount} notifications</p>
            </div>
            {unreadCount > 0 ? (
              <button type="button" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>

          {errorMessage ? <div className="customer-notifications-alert">{errorMessage}</div> : null}

          <div className="customer-notifications-tabs">
            <button type="button" className={status === "all" ? "active" : ""} onClick={() => handleStatusChange("all")}>
              All
            </button>
            <button type="button" className={status === "unread" ? "active" : ""} onClick={() => handleStatusChange("unread")}>
              Unread
            </button>
            <button type="button" className={status === "read" ? "active" : ""} onClick={() => handleStatusChange("read")}>
              Read
            </button>
          </div>

          <div className="customer-notifications-list">
            {isLoading ? (
              <div className="customer-notifications-empty">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="customer-notifications-empty">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  to={item.ctaLink || "/dashboard/notifications"}
                  className={item.isRead ? "customer-notification-item is-read" : "customer-notification-item is-unread"}
                  onClick={() => handleRead(item)}
                >
                  <span className="material-icons">{item.isRead ? "notifications" : "notifications_active"}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{formatNotificationTime(item.createdAt)}</small>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="customer-notifications-pagination">
            <span>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
