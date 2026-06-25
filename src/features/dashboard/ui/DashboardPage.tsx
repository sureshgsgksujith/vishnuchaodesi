import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../utils/profileStorage";
import { getMyListings, type ListingSummary } from "../api/listingsApi";
import { getMyEventTicketBookings, type EventTicketBooking } from "../api/eventTicketsApi";
import {
  getMyRequirementEnquiries,
  type RequirementEnquiry,
} from "../../listing/api/requirementsApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import {
  dashboardBlogPosts,
  dashboardCoupons,
  dashboardNotifications,
  followingUsers,
  sentReviews,
} from "../mock/dashboardMockData";
import "../styles/dashboardPage.css";

export default function DashboardPage() {
  const [identity, setIdentity] = useState(getStoredDashboardIdentity());
  const [listingTotalCount, setListingTotalCount] = useState(0);
  const [listingItems, setListingItems] = useState<ListingSummary[]>([]);
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [enquiries, setEnquiries] = useState<RequirementEnquiry[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingEventBookings, setIsLoadingEventBookings] = useState(true);
  const [isLoadingEnquiries, setIsLoadingEnquiries] = useState(true);
  const fullName = identity.fullName;
  const isDashboardLoading = isLoadingListings || isLoadingEventBookings || isLoadingEnquiries;

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredDashboardIdentity());

    window.addEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
    return () =>
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
  }, []);

  useEffect(() => {
    let isActive = true;

    setIsLoadingListings(true);

    getMyListings("", 1, 1000)
      .then((result) => {
        if (isActive) {
          const nextItems = result.items || [];
          setListingTotalCount(Math.max(result.totalCount || 0, nextItems.length));
          setListingItems(nextItems);
        }
      })
      .catch(() => {
        if (isActive) {
          setListingTotalCount(0);
          setListingItems([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingListings(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setIsLoadingEventBookings(true);

    getMyEventTicketBookings()
      .then((bookings) => {
        if (isActive) {
          setEventBookings(bookings || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setEventBookings([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingEventBookings(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setIsLoadingEnquiries(true);

    getMyRequirementEnquiries()
      .then((items) => {
        if (isActive) {
          setEnquiries(items || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setEnquiries([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingEnquiries(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const totalTicketPayments = useMemo(
    () => eventBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    [eventBookings],
  );
  const paidTicketBookingCount = useMemo(
    () => eventBookings.filter((booking) => isPaidBooking(booking.paymentStatus)).length,
    [eventBookings],
  );

  const listingMetrics = useMemo(() => buildListingMetrics(listingItems), [listingItems]);
  const activeFollowings = useMemo(
    () => followingUsers.filter((user) => user.isFollowing).length,
    [],
  );
  const reviewCount = useMemo(
    () => sentReviews.length + listingItems.reduce((sum, listing) => sum + (listing.totalReviews || listing.reviews?.length || 0), 0),
    [listingItems],
  );

  const summaryCards = useMemo(
    () => [
      {
        eyebrow: "Listings",
        title: "All Listings",
        count: formatDashboardCount(listingTotalCount),
        description: "Manage your business listings",
        href: "/dashboard/all-listing",
        icon: "/template-17/images/icon/shop.png",
        tone: "green",
      },
      {
        eyebrow: "Classifieds",
        title: "Ads Posts",
        count: formatDashboardCount(listingMetrics.classifieds),
        description: "Post and manage local ads",
        href: "/dashboard/ad-posts",
        icon: "/template-17/images/icon/ads.png",
        tone: "blue",
      },
      {
        eyebrow: "Careers",
        title: "Jobs",
        count: formatDashboardCount(listingMetrics.jobs),
        description: "Track jobs and applicants",
        href: "/dashboard/jobs",
        icon: "/template-17/images/icon/employee.png",
        tone: "slate",
      },
      {
        eyebrow: "Store",
        title: "Products",
        count: formatDashboardCount(listingMetrics.products),
        description: "Manage product posts",
        href: "/dashboard/products",
        icon: "/template-17/images/icon/cart.png",
        tone: "orange",
      },
      {
        eyebrow: "Bookings",
        title: "Event Tickets",
        count: formatDashboardCount(eventBookings.length),
        description: `${formatCurrencyAmount(totalTicketPayments)} paid`,
        href: "/dashboard/my-service-bookings",
        icon: "/template-17/images/icon/calendar.png",
        tone: "violet",
      },
      {
        eyebrow: "Content",
        title: "Blog Posts",
        count: formatDashboardCount(dashboardBlogPosts.length),
        description: "Create and update blog posts",
        href: "/dashboard/blog-posts",
        icon: "/template-17/images/icon/blog1.png",
        tone: "pink",
      },
      {
        eyebrow: "Offers",
        title: "Coupons",
        count: formatDashboardCount(dashboardCoupons.length),
        description: "Manage coupons and deals",
        href: "/dashboard/coupons",
        icon: "/template-17/images/icon/coupons.png",
        tone: "amber",
      },
      {
        eyebrow: "Leads",
        title: "Enquiries",
        count: formatDashboardCount(enquiries.length),
        description: "View lead enquiry requests",
        href: "/dashboard/enquiry",
        icon: "/template-17/images/icon/tick.png",
        tone: "cyan",
      },
      {
        eyebrow: "Network",
        title: "Followings",
        count: formatDashboardCount(activeFollowings),
        description: "Listings and profiles you follow",
        href: "/dashboard/followings",
        icon: "/template-17/images/icon/dbl18.png",
        tone: "slate",
      },
      {
        eyebrow: "Feedback",
        title: "Reviews",
        count: formatDashboardCount(reviewCount),
        description: "View and manage reviews",
        href: "/dashboard/review",
        icon: "/template-17/images/icon/dbl13.png",
        tone: "green",
      },
      {
        eyebrow: "Updates",
        title: "Notifications",
        count: formatDashboardCount(dashboardNotifications.length),
        description: "Read account notifications",
        href: "/dashboard/notifications",
        icon: "/template-17/images/icon/dbl19.png",
        tone: "blue",
      },
      {
        eyebrow: "Billing",
        title: "Payments",
        count: formatDashboardCount(paidTicketBookingCount),
        description: `${formatCurrencyAmount(totalTicketPayments)} paid`,
        href: "/dashboard/payment",
        icon: "/template-17/images/icon/dbl9.png",
        tone: "orange",
      },
    ],
    [activeFollowings, enquiries.length, eventBookings.length, listingMetrics, listingTotalCount, paidTicketBookingCount, reviewCount, totalTicketPayments]
  );

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs customer-dashboard-main">
      <div className="ud-cen">
        <div className="cd-cen-intr">
          <div className="cd-cen-intr-inn">
            <h2>
              Welcom back, <b>{fullName}</b>
            </h2>
            <p>
              Stay up to date reports in your listing, products, events and blog
              reports here
            </p>
          </div>
        </div>

        {isDashboardLoading ? <DashboardLoadingOverlay /> : null}

        <div className="customer-dashboard-card-grid">
          {summaryCards.map((card) => (
            <div className={`customer-dashboard-card is-${card.tone}`} key={card.title}>
              <div className="customer-dashboard-card-copy">
                <h4>{card.eyebrow}</h4>
                <h2>{card.title}</h2>
                <span className="bnum">{card.count}</span>
                <p>{card.description}</p>
              </div>
              <span className="customer-dashboard-card-icon">
                <img src={card.icon} alt="" loading="lazy" />
              </span>
              <Link to={card.href} className="fclick">
                &nbsp;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DashboardLoadingOverlay() {
  return (
    <div className="customer-dashboard-loader" role="status" aria-live="polite">
      <div className="customer-dashboard-loader-card">
        <span className="customer-dashboard-loader-spinner" aria-hidden="true"></span>
        <strong>Loading dashboard</strong>
        <p>Getting your latest listings, payments, and enquiries.</p>
      </div>
    </div>
  );
}

function formatDashboardCount(value: number) {
  return Number.isFinite(value) ? value.toString().padStart(2, "0") : "00";
}

function buildListingMetrics(listings: ListingSummary[]) {
  return listings.reduce(
    (metrics, listing) => {
      if (isClassifiedListing(listing)) {
        metrics.classifieds += 1;
      }

      if (isJobsListing(listing)) {
        metrics.jobs += 1;
      }

      if (isProductListing(listing)) {
        metrics.products += 1;
      }

      return metrics;
    },
    { classifieds: 0, jobs: 0, products: 0 },
  );
}

function isClassifiedListing(listing: ListingSummary) {
  return listing.categoryName?.trim().toLowerCase() === "classifieds";
}

function isJobsListing(listing: ListingSummary) {
  return listing.categoryName?.trim().toLowerCase() === "jobs";
}

function isProductListing(listing: ListingSummary) {
  return matchesListingText(listing, [
    "product",
    "products",
    "electronics",
    "appliance",
    "furniture",
    "fashion",
    "books",
    "sports",
    "hobbies",
    "vehicles",
  ]);
}

function matchesListingText(listing: ListingSummary, needles: string[]) {
  const haystack = [
    listing.categoryName,
    listing.subCategory,
    listing.detailCategory,
    getRecordText(listing.propertyDetails, "listingKind"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return needles.some((needle) => haystack.includes(needle));
}

function getRecordText(record: Record<string, string | number | boolean | null> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

function isPaidBooking(status: string) {
  const normalized = status.trim().toLowerCase();

  return ["paid", "completed", "success", "succeeded"].includes(normalized);
}
