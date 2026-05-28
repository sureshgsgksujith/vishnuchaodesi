import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  dashboardNavSections as menuSections,
  dashboardPrimaryNavItem as dashboardItem,
  type DashboardNavItem as MenuItem,
} from "../../dashboard/config/dashboardData";
import {
  clearStoredProfileSnapshot,
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../../dashboard/utils/profileStorage";
import { useLogoNavigationTarget } from "../../../shared/navigation/logoTarget";
import "../styles/customerHeader.css";

type ExploreItem = {
  label: string;
  href: string;
  icon: string;
};

const categoryLinks: ExploreItem[] = [
  {
    label: "All Services",
    href: "/all-category",
    icon: "/template-17/images/icon/shop.png",
  },
  {
    label: "Roommates & Rentals",
    href: "/all-listing?category=real-estate&subCategory=PG+%2F+Co-living",
    icon: "/template-17/images/icon/home.png",
  },
  {
    label: "Care Services",
    href: "/all-listing?category=care-services",
    icon: "/template-17/images/icon/expert.png",
  },
  {
    label: "Classified Ads",
    href: "/classifieds/index",
    icon: "/template-17/images/icon/ads.png",
  },
  {
    label: "Service Experts",
    href: "/service-experts/index",
    icon: "/template-17/images/icon/expert.png",
  },
  {
    label: "Jobs",
    href: "/jobs/index",
    icon: "/template-17/images/icon/employee.png",
  },
  {
    label: "Explore Travel",
    href: "/places/index",
    icon: "/template-17/images/places/icons/hot-air-balloon.png",
  },
  {
    label: "News & Magazines",
    href: "/news/index",
    icon: "/template-17/images/icon/news.png",
  },
  {
    label: "Events",
    href: "/events",
    icon: "/template-17/images/icon/calendar.png",
  },
  {
    label: "Products",
    href: "/products",
    icon: "/template-17/images/icon/cart.png",
  },
  {
    label: "Coupon & Deals",
    href: "/coupons",
    icon: "/template-17/images/icon/coupons.png",
  },
  {
    label: "Blogs",
    href: "/blog-posts",
    icon: "/template-17/images/icon/blog1.png",
  },
  {
    label: "Community",
    href: "/community",
    icon: "/template-17/images/icon/11.png",
  },
];

const exploreCategories = [
  { label: "Spa and Facial", href: "/all-listing", count: "05" },
  { label: "Wedding halls", href: "/all-listing", count: "00" },
  { label: "Automobiles", href: "/all-listing?category=vehicles", count: "03" },
  { label: "Restaurants", href: "/all-listing?category=restaurants-food", count: "03" },
  { label: "Roommates & Rentals", href: "/all-listing?category=real-estate&subCategory=PG+%2F+Co-living", count: "03" },
  { label: "Care Services", href: "/all-listing?category=care-services", count: "10" },
  { label: "Technology", href: "/all-listing", count: "04" },
  { label: "Pet shop", href: "/all-listing", count: "00" },
  { label: "Real Estate", href: "/all-listing?category=real-estate", count: "03" },
  { label: "Sports", href: "/all-listing", count: "00" },
  { label: "Hospitals", href: "/all-listing", count: "06" },
  { label: "Education", href: "/all-listing", count: "06" },
  { label: "Transportation", href: "/all-listing", count: "05" },
  { label: "Electricals", href: "/all-listing", count: "04" },
];

const notifications = [
  "Welcome back to Chao Desi",
  "Your profile is active",
  "New events available near you",
];

export default function UserHomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoTarget = useLogoNavigationTarget();

  const [showExplore, setShowExplore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [identity, setIdentity] = useState(getStoredDashboardIdentity());
  const { fullName, joinDate, profileImageUrl } = identity;

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

  const filteredCategories = useMemo(() => {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customer_token");
    localStorage.removeItem("userId");
    localStorage.removeItem("customerCode");
    localStorage.removeItem("fullName");
    localStorage.removeItem("userType");
    clearStoredProfileSnapshot();
    closeAllPopups();
    navigate("/home");
    window.location.reload();
  };

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
              width: 20,
              height: 20,
              objectFit: "contain",
              marginRight: 12,
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
            padding: mobile ? "10px 0" : "10px 16px",
            cursor: "pointer",
            color: "#304660",
            fontSize: 16,
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
          padding: mobile ? "10px 0" : "10px 16px",
          color: isActive(item.href) ? "#0b1a78" : "#304660",
          textDecoration: "none",
          fontSize: 16,
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
                      <li>
                        <Link to="/dashboard/listings/start">
                          <i className="material-icons">store</i>
                          {" "}Add your business
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="top-ser">
              <form className="filter_form" onSubmit={(e) => e.preventDefault()}>
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
                      type="button"
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
              <ul className="bl">
                <li>
                  <Link to="/dashboard/listings/start">Add Business</Link>
                </li>
              </ul>

              <div className="top-noti">
                <span
                  className="material-icons db-menu-noti"
                  onClick={() => {
                    setShowNotifications((prev) => !prev);
                    setShowExplore(false);
                    setShowProfileMenu(false);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <i id="noti-count">
                    {String(notifications.length).padStart(2, "0")}
                  </i>
                  notifications
                </span>

                <div
                  className="db-noti top-noti-win"
                  style={{
                    display: showNotifications ? "block" : "none",
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    zIndex: 99999,
                  }}
                >
                  <span
                    className="material-icons db-menu-clo"
                    onClick={() => setShowNotifications(false)}
                    style={{ cursor: "pointer" }}
                  >
                    close
                  </span>
                  <h4>Notifications</h4>
                  <ul id="all-notif-ul">
                    {notifications.map((item, index) => (
                      <li key={index}>
                        <div>{item}</div>
                      </li>
                    ))}
                  </ul>
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
                top: 0,
                right: 0,
                width: "380px",
                maxWidth: "100%",
                height: "100vh",
                overflowY: "auto",
                zIndex: 99999,
                background: "#fff",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.12)",
              }}
            >
              <span
                className="material-icons db-menu-clo"
                onClick={() => setShowProfileMenu(false)}
                style={{ cursor: "pointer" }}
              >
                close
              </span>

              <div className="ud-lhs-s1">
                <img src={profileImageUrl} alt="" loading="lazy" />
                <div className="ud-lhs-pro-bio">
                  <h4>{fullName}</h4>
                  <b>{joinDate}</b>
                  <Link
                    className="ud-lhs-view-pro"
                    to="/profile"
                    target="_blank"
                    onClick={closeAllPopups}
                  >
                    My Profile
                  </Link>
                </div>
              </div>

              <div style={{ padding: "8px 18px 0 18px" }}>
                <Link
                  to={dashboardItem.href!}
                  onClick={closeAllPopups}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#1536d2",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "14px 18px",
                    fontSize: 16,
                    fontWeight: 600,
                    boxShadow: "0 10px 22px rgba(21, 54, 210, 0.25)",
                  }}
                >
                  <img
                    src={dashboardItem.icon}
                    alt={dashboardItem.label}
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "contain",
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                  <span>{dashboardItem.label}</span>
                </Link>
              </div>

              {menuSections.map((section) => (
                <div className="ud-menu-sec" key={section.title}>
                  {section.title && (
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111827",
                        borderBottom: "1px solid #e5e7eb",
                        paddingBottom: 12,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {section.title}
                    </h4>
                  )}

                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {section.items.map((item) => (
                      <li key={item.label} style={{ marginBottom: 4 }}>
                        {renderMenuLink(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
                  <h4>Business</h4>
                  <ul>
                    <li>
                      <Link to="/dashboard/listings/start" onClick={closeAllPopups}>
                        Add Business
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
                    <li style={{ marginBottom: 6 }}>
                      <Link
                        to={dashboardItem.href!}
                        onClick={closeAllPopups}
                        style={{
                          textDecoration: "none",
                          color: "#1536d2",
                          fontWeight: 700,
                        }}
                      >
                        {dashboardItem.label}
                      </Link>
                    </li>

                    {menuSections.map((section) => (
                      <div key={section.title} style={{ marginBottom: 16 }}>
                        {section.title && (
                          <li
                            style={{
                              fontWeight: 700,
                              textTransform: "uppercase",
                              color: "#111827",
                              margin: "12px 0 8px 0",
                            }}
                          >
                            {section.title}
                          </li>
                        )}

                        {section.items.map((item) => (
                          <li key={item.label}>{renderMenuLink(item, true)}</li>
                        ))}
                      </div>
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
