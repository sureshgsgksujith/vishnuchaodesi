import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  dashboardPrimaryNavItem as dashboardItem,
  type DashboardNavItem as MenuItem,
} from "../../dashboard/config/dashboardData";
import {
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../../dashboard/utils/profileStorage";
import {
  clearCustomerSession,
  getCustomerToken,
  isCustomerTokenExpired,
} from "../../auth/utils/customerSession";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "../../dashboard/api/notificationsApi";
import { useLogoNavigationTarget } from "../../../shared/navigation/logoTarget";
import { categoryLinks, useExploreCategories, type ExploreMenuLink } from "./exploreMenuData";
import "../styles/customerHeader.css";

const profileMenuItems: MenuItem[] = [
  {
    label: "My Profile",
    href: "/dashboard/my-profile",
    icon: "/template-17/images/icon/profile.png",
  },
  dashboardItem,
  {
    label: "Settings",
    href: "/dashboard/setting",
    icon: "/template-17/images/icon/dbl210.png",
  },
  {
    label: "Logout",
    icon: "/template-17/images/icon/dbl12.png",
    isLogout: true,
  },
];

type UserHomeHeaderProps = {
  hideAddAction?: boolean;
};

export default function UserHomeHeader({ hideAddAction = false }: UserHomeHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logoTarget = useLogoNavigationTarget();
  const isServicePage = [
    "/local-services",
    "/local-services.html",
    "/all-services",
    "/all-services.html",
    "/all-services-detailed",
    "/all-services-detailed.html",
  ].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const addActionLabel = isServicePage ? "Add Service" : "Add Business";
  const addActionHref = isServicePage ? "/dashboard/services/new" : "/dashboard/listings/start";

  const [showExplore, setShowExplore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const exploreCategories = useExploreCategories();

  const [identity, setIdentity] = useState(getStoredDashboardIdentity());
  const { fullName, joinDate, profileImageUrl } = identity;

  const loadNotifications = useCallback(() => {
    const token = getCustomerToken();

    if (!token || isCustomerTokenExpired(token)) {
      setNotifications([]);
      setNotificationTotal(0);
      setUnreadNotificationCount(0);
      setIsLoadingNotifications(false);
      return Promise.resolve();
    }

    setIsLoadingNotifications(true);

    return getMyNotifications(1, 5, false)
      .then((result) => {
        setNotifications(result.items || []);
        setNotificationTotal(result.totalCount || 0);
        setUnreadNotificationCount(result.unreadCount || 0);
      })
      .catch(() => {
        setNotifications([]);
        setNotificationTotal(0);
        setUnreadNotificationCount(0);
      })
      .finally(() => {
        setIsLoadingNotifications(false);
      });
  }, []);

  useEffect(() => {
    const handleOpenMobileMenu = () => setShowMobileMenu(true);

    window.addEventListener("chaodesi:open-mobile-menu", handleOpenMobileMenu);
    return () =>
      window.removeEventListener(
        "chaodesi:open-mobile-menu",
        handleOpenMobileMenu
      );
  }, []);

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredDashboardIdentity());

    window.addEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
    return () =>
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
  }, []);

  useEffect(() => {
    let isActive = true;

    loadNotifications().finally(() => {
      if (!isActive) {
        return;
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadNotifications, location.pathname]);

  useEffect(() => {
    function handleWindowFocus() {
      loadNotifications();
    }

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [loadNotifications]);

  const filteredCategories = useMemo<ExploreMenuLink[]>(() => {
    if (!searchText.trim()) return [];
    return categoryLinks.filter((item) =>
      item.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  const closeAllPopups = () => {
    setShowExplore(false);
    setShowNotifications(false);
    setShowProfileMenu(false);
    setShowMobileMenu(false);
  };

  function submitHeaderSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = searchText.trim();
    const params = new URLSearchParams();

    if (keyword) {
      params.set("search", keyword);
    }

    closeAllPopups();
    navigate(`/all-listing${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const handleLogout = () => {
    clearCustomerSession();
    closeAllPopups();
    navigate("/home");
    window.location.reload();
  };

  async function handleNotificationClick(notification: UserNotification) {
    if (!notification.isRead) {
      setNotifications((currentItems) => currentItems.filter((item) => item.id !== notification.id));
      setNotificationTotal((currentCount) => Math.max(0, currentCount - 1));
      setUnreadNotificationCount((currentCount) => Math.max(0, currentCount - 1));

      try {
        await markNotificationRead(notification.id);
      } catch {
        getMyNotifications(1, 5, false)
          .then((result) => {
            setNotifications(result.items || []);
            setNotificationTotal(result.totalCount || 0);
            setUnreadNotificationCount(result.unreadCount || 0);
          })
          .catch(() => undefined);
      }
    }

    setShowNotifications(false);
  }

  async function handleMarkAllNotificationsRead() {
    setNotifications([]);
    setNotificationTotal(0);
    setUnreadNotificationCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      getMyNotifications(1, 5, false)
        .then((result) => {
          setNotifications(result.items || []);
          setNotificationTotal(result.totalCount || 0);
          setUnreadNotificationCount(result.unreadCount || 0);
        })
        .catch(() => undefined);
    }
  }

  const isActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href;
  };

  const renderMenuLink = (item: MenuItem, mobile = false) => {
    const content = (
      <>
        {item.icon && (
          <img
            loading="lazy"
            src={item.icon}
            alt={item.label}
            style={{
              width: 18,
              height: 18,
              objectFit: "contain",
              marginRight: 10,
              flexShrink: 0,
            }}
          />
        )}
        <span>{item.label}</span>
      </>
    );

    if (item.isLogout) {
      return (
        <button
          type="button"
          onClick={handleLogout}
          className="chaodesi-menu-link"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            padding: mobile ? "8px 0" : "8px 14px",
            cursor: "pointer",
            color: "#304660",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {content}
        </button>
      );
    }

    if (!item.href) return null;

    return (
      <Link
        to={item.href}
        target={item.target || "_self"}
        onClick={closeAllPopups}
        className={
          isActive(item.href)
            ? "chaodesi-menu-link active"
            : "chaodesi-menu-link"
        }
        style={{
          display: "flex",
          alignItems: "center",
          padding: mobile ? "8px 0" : "8px 14px",
          color: isActive(item.href) ? "#0b1a78" : "#304660",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: isActive(item.href) ? 600 : 500,
          borderRadius: 10,
          background: isActive(item.href)
            ? "rgba(21, 54, 210, 0.08)"
            : "transparent",
        }}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className="hom-top chaodesi-customer-header">
      <div className="container">
        <div className="row">
          <div className="hom-nav db-open">
            <Link to={logoTarget} className="top-log">
              <img
                src="/template-17/images/home/logo-white.png"
                alt="Chao Desi"
                loading="eager"
                className="ic-logo"
              />
            </Link>

            <div
              className={showExplore ? "menu ani" : "menu"}
              onClick={() => {
                setShowExplore((prev) => !prev);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <h4>Explore</h4>
            </div>

            <div
              className={showExplore ? "chaodesi-pop-menu ani" : "chaodesi-pop-menu"}
              aria-hidden={!showExplore}
            >
              <div className="chaodesi-pop-inner">
                <div className="chaodesi-pop-grid">
                  <div className="chaodesi-explore-modules">
                    <ul>
                      {categoryLinks.map((item) => (
                        <li key={item.label}>
                          <Link
                            to={item.href}
                            onClick={closeAllPopups}
                          >
                            <img
                              src={item.icon}
                              alt={item.label}
                              loading="lazy"
                            />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="chaodesi-explore-categories">
                    <i
                      className="material-icons chaodesi-explore-close"
                      onClick={() => setShowExplore(false)}
                    >
                      close
                    </i>

                    <h4>All Categories</h4>

                    <ul>
                      {exploreCategories.map((item) => (
                        <li key={item.label}>
                          <Link
                            to={item.href}
                            onClick={closeAllPopups}
                          >
                            <span aria-hidden="true">&gt;</span>
                            <strong>{item.label}</strong>
                            <small>- {item.count}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="chaodesi-explore-cta">
                    <ul>
                      <li>
                        A few reasons you'll love Online Business Directory
                        <span>Call us on: +01 6214 6548</span>
                      </li>
                      <li>
                        <Link to="/post-your-ads">
                          <i className="material-icons">font_download</i>
                          {" "}Advertise with us
                        </Link>
                      </li>
                      {!hideAddAction ? (
                        <li>
                          <Link to={addActionHref}>
                            <i className="material-icons">store</i>
                            {" "}{isServicePage ? "Add your service" : "Add your business"}
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="top-ser">
              <form className="filter_form" onSubmit={submitHeaderSearch}>
                <ul>
                  <li className="sr-sea">
                    <input
                      type="text"
                      autoComplete="off"
                      id="top-select-search"
                      placeholder="What are you looking for?"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <ul
                      id="tser-res1"
                      className="tser-res tser-res2"
                      style={{ display: searchText.trim() ? "block" : "none" }}
                    >
                      {filteredCategories.length > 0 ? (
                        filteredCategories.slice(0, 6).map((item) => (
                          <li key={item.label}>
                            <div>
                              <h4>{item.label}</h4>
                              <span>Browse category</span>
                              <Link
                                to={item.href}
                                onClick={closeAllPopups}
                              ></Link>
                            </div>
                          </li>
                        ))
                      ) : searchText.trim() ? (
                        <li>
                          <div>
                            <h4>No results found</h4>
                            <span>Try another keyword</span>
                          </div>
                        </li>
                      ) : null}
                    </ul>
                  </li>
                  <li className="sbtn">
                    <button
                      type="submit"
                      className="btn btn-success"
                      id="top_filter_submit"
                    >
                      <i className="material-icons">&nbsp;</i>
                    </button>
                  </li>
                </ul>
              </form>
            </div>

            <div className="chaodesi-header-actions">
              {!hideAddAction ? (
                <ul className="bl">
                  <li>
                    <Link to={addActionHref}>{addActionLabel}</Link>
                  </li>
                </ul>
              ) : null}

              <div className="top-noti">
                <span
                  className="material-icons db-menu-noti"
                  onClick={() => {
                    setShowNotifications((prev) => {
                      const nextValue = !prev;
                      if (nextValue) {
                        loadNotifications();
                      }
                      return nextValue;
                    });
                    setShowExplore(false);
                    setShowProfileMenu(false);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {unreadNotificationCount > 0 ? (
                    <i id="noti-count">{String(unreadNotificationCount).padStart(2, "0")}</i>
                  ) : null}
                  notifications
                </span>

                <div
                  className="chaodesi-notification-dropdown"
                  style={{
                    display: showNotifications ? "block" : "none",
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 12px)",
                    zIndex: 99999,
                  }}
                >
                  <span
                    className="material-icons chaodesi-notification-close"
                    onClick={() => setShowNotifications(false)}
                    style={{ cursor: "pointer" }}
                  >
                    close
                  </span>
                  <div className="chaodesi-notification-head">
                    <h4>Notifications</h4>
                    {unreadNotificationCount > 0 ? (
                      <button type="button" onClick={handleMarkAllNotificationsRead}>
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  <ul id="all-notif-ul">
                    {isLoadingNotifications ? (
                      <li>
                        <div>Loading notifications...</div>
                      </li>
                    ) : notifications.length === 0 ? (
                      <li>
                        <div>No unread notifications.</div>
                      </li>
                    ) : (
                      notifications.map((item) => (
                      <li key={item.id} className={item.isRead ? "is-read" : "is-unread"}>
                        <div>
                          <Link
                            to={item.ctaLink || "/dashboard/notifications"}
                            onClick={() => handleNotificationClick(item)}
                          ></Link>
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                          <small>{formatNotificationTime(item.createdAt)}</small>
                        </div>
                      </li>
                      ))
                    )}
                  </ul>
                  {notificationTotal > notifications.length ? (
                    <Link
                      to="/dashboard/notifications?status=unread"
                      className="chaodesi-notification-all"
                      onClick={() => setShowNotifications(false)}
                    >
                      View all unread
                    </Link>
                  ) : null}
                  <Link
                    to="/dashboard/notifications?status=read"
                    className="chaodesi-notification-all"
                    onClick={() => setShowNotifications(false)}
                  >
                    View read notifications
                  </Link>
                </div>
              </div>

              <div className="al">
                <div
                  className="head-pro"
                  onClick={() => {
                    setShowProfileMenu(true);
                    setShowExplore(false);
                    setShowNotifications(false);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={profileImageUrl}
                    alt="User"
                    loading="lazy"
                    title="Go to dashboard"
                  />
                  <span className="fclick near-pro-cta"></span>
                </div>
              </div>
            </div>

            <div
              className="db-menu"
              style={{
                display: showProfileMenu ? "block" : "none",
                position: "fixed",
                top: 74,
                right: 18,
                bottom: "auto",
                width: "300px",
                maxWidth: "calc(100vw - 24px)",
                height: "auto",
                maxHeight: "calc(100vh - 92px)",
                overflowY: "auto",
                zIndex: 99999,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
              }}
            >
              <span
                className="material-icons db-menu-clo"
                onClick={() => setShowProfileMenu(false)}
                style={{ cursor: "pointer" }}
              >
                close
              </span>

              <div className="ud-lhs-s1" style={{ marginBottom: 8, padding: 8 }}>
                <img
                  src={profileImageUrl}
                  alt=""
                  loading="lazy"
                  style={{ width: 42, height: 42 }}
                />
                <div className="ud-lhs-pro-bio">
                  <h4 style={{ fontSize: 18, lineHeight: "20px", marginBottom: 2 }}>{fullName}</h4>
                  <b style={{ fontSize: 11, lineHeight: "14px" }}>{joinDate}</b>
                </div>
              </div>

              <div className="ud-menu-sec" style={{ marginTop: 0 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {profileMenuItems.map((item) => (
                    <li key={item.label} style={{ marginBottom: 4 }}>
                      {renderMenuLink(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mob-menu">
              <div
                className="mob-me-ic"
                onClick={() => setShowMobileMenu(true)}
                style={{ cursor: "pointer" }}
              >
                <i className="material-icons">menu</i>
              </div>

              <div
                className="mob-me-all"
                style={{
                  display: showMobileMenu ? "block" : "none",
                  position: "fixed",
                  right: 0,
                  top: 0,
                  height: "100vh",
                  width: "320px",
                  maxWidth: "100%",
                  overflowY: "auto",
                  zIndex: 99999,
                  background: "#fff",
                }}
              >
                <div
                  className="mob-me-clo"
                  onClick={() => setShowMobileMenu(false)}
                  style={{ cursor: "pointer" }}
                >
                  <i className="material-icons">close</i>
                </div>

                <div className="mv-pro ud-lhs-s1">
                  <img src={profileImageUrl} alt="" loading="lazy" />
                  <div className="ud-lhs-pro-bio">
                    <h4>{fullName}</h4>
                    <b>{joinDate}</b>
                  </div>
                </div>

                <div className="mv-cate">
                  <h4>{isServicePage ? "Service" : "Business"}</h4>
                  <ul>
                    <li>
                      <Link to={addActionHref} onClick={closeAllPopups}>
                        {addActionLabel}
                      </Link>
                    </li>
                  </ul>
                </div>

                <div className="mv-cate">
                  <h4>All Categories</h4>
                  <ul>
                    {categoryLinks.map((item) => (
                      <li key={item.label}>
                        <Link to={item.href} onClick={closeAllPopups}>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mv-cate">
                  <h4>Profile Menu</h4>
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {profileMenuItems.map((item) => (
                      <li key={item.label}>{renderMenuLink(item, true)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
