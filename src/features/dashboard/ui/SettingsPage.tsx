import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyListings,
  type ListingSummary,
} from "../api/listingsApi";
import {
  getMyProfile,
  type UserProfileFormValues,
} from "../api/profileApi";
import {
  getMyPlanUsage,
  type PlanUsage,
} from "../../pricing/api/pricingApi";
import "../styles/settings.css";

type SettingTone = "green" | "blue" | "orange" | "violet" | "pink" | "cyan";

type SettingItem = {
  label: string;
  description: string;
  enabled: boolean;
  meta: string;
  tone: SettingTone;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfileFormValues | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);

    Promise.allSettled([
      getMyProfile(),
      getMyPlanUsage(),
      getMyListings("", 1, 1000),
    ])
      .then(([profileResult, planResult, listingsResult]) => {
        if (!isActive) {
          return;
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.profile);
        }

        if (planResult.status === "fulfilled") {
          setPlanUsage(planResult.value);
        }

        if (listingsResult.status === "fulfilled") {
          setListings(listingsResult.value.items || []);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const plan = planUsage?.plan;
  const metrics = useMemo(() => buildListingMetrics(listings), [listings]);
  const profileComplete = Boolean(
    profile?.fullName?.trim() &&
      profile?.email?.trim() &&
      profile?.mobileNumber?.trim(),
  );
  const accountActive = Boolean(profile) && !planUsage?.isPlanExpired;
  const reviewCount = useMemo(
    () =>
      listings.reduce(
        (sum, listing) =>
          sum + (listing.totalReviews || listing.reviews?.length || 0),
        0,
      ),
    [listings],
  );

  const settings = useMemo<SettingItem[]>(
    () => [
      {
        label: "Account status",
        description: "Customer account and plan access",
        enabled: accountActive,
        meta: planUsage?.isPlanExpired ? "Plan expired" : "Profile active",
        tone: "green",
      },
      {
        label: "Listing reviews",
        description: "Review control for business listings",
        enabled: Boolean(plan?.hasReviewControl || reviewCount > 0),
        meta: `${reviewCount} reviews`,
        tone: "blue",
      },
      {
        label: "Listing share",
        description: "Share listings on social channels",
        enabled: Boolean(plan?.canShareSocialMedia),
        meta: plan?.canShareSocialMedia ? "Included in plan" : "Not in plan",
        tone: "cyan",
      },
      {
        label: "Show profile on listing page",
        description: "Display your customer profile with listings",
        enabled: profileComplete,
        meta: profileComplete ? "Name, email and mobile ready" : "Profile incomplete",
        tone: "violet",
      },
      {
        label: "Job module",
        description: "Create and manage job related listings",
        enabled: metrics.jobs > 0 || Boolean(plan && plan.jobLimit !== 0),
        meta: `${metrics.jobs} jobs, limit ${formatLimit(plan?.jobLimit)}`,
        tone: "orange",
      },
      {
        label: "Service expert module",
        description: "Service profile and service listing access",
        enabled: Boolean(profile?.isPremiumServiceProvider || metrics.serviceExperts > 0),
        meta: `${metrics.serviceExperts} service listings`,
        tone: "pink",
      },
      {
        label: "Product module",
        description: "Product posts and marketplace visibility",
        enabled: metrics.products > 0 || Boolean(plan && plan.listingLimit !== 0),
        meta: `${metrics.products} products`,
        tone: "green",
      },
      {
        label: "Direct leads",
        description: "Receive quote and enquiry requests",
        enabled: Boolean(plan?.canGetDirectLeads),
        meta: plan?.canGetDirectLeads ? "Direct leads enabled" : "Upgrade required",
        tone: "blue",
      },
      {
        label: "Email lead notification",
        description: "Send new lead alerts to your email",
        enabled: Boolean(plan?.hasEmailNotificationLeads),
        meta: profile?.email || "Email not added",
        tone: "cyan",
      },
      {
        label: "Special offers",
        description: "Coupon and offer publishing tools",
        enabled: Boolean(plan?.hasSpecialOffers || (plan?.couponLimit ?? 0) !== 0),
        meta: `Coupon limit ${formatLimit(plan?.couponLimit)}`,
        tone: "orange",
      },
      {
        label: "Verified listing",
        description: "Verified badge for eligible listings",
        enabled: Boolean(plan?.hasVerifiedListing),
        meta: plan?.hasVerifiedListing ? "Badge active" : "Badge inactive",
        tone: "violet",
      },
      {
        label: "Trusted listing",
        description: "Trusted listing status and priority signals",
        enabled: Boolean(plan?.hasTrustedListing),
        meta: plan?.hasTrustedListing ? "Trust signal active" : "Trust signal inactive",
        tone: "pink",
      },
    ],
    [accountActive, metrics, plan, planUsage?.isPlanExpired, profile, profileComplete, reviewCount],
  );

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-settings-main">
      <div className="ud-cen dashboard-settings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Setting</span>

        {isLoading ? <SettingsLoadingOverlay /> : null}

        <section className="dashboard-settings-hero">
          <div>
            <span>Profile Setting</span>
            <h2>{plan?.name || "Customer dashboard settings"}</h2>
            <p>
              {profile?.fullName || "Customer"} account modules, plan benefits,
              and listing visibility are shown from your latest dashboard data.
            </p>
          </div>
          <div className="dashboard-settings-hero-status">
            <strong>{accountActive ? "Active" : "Inactive"}</strong>
            <small>{profileComplete ? "Profile complete" : "Profile needs details"}</small>
          </div>
        </section>

        <section className="dashboard-settings-summary" aria-label="Settings summary">
          <SummaryCard label="Plan" value={plan?.name || "-"} tone="green" />
          <SummaryCard label="Listings" value={String(listings.length)} tone="blue" />
          <SummaryCard
            label="Remaining"
            value={formatLimit(planUsage?.listingRemaining)}
            tone="orange"
          />
          <SummaryCard label="Reviews" value={String(reviewCount)} tone="violet" />
        </section>

        <section className="dashboard-settings-panel">
          <div className="dashboard-settings-panel-head">
            <div>
              <h2>Profile Setting</h2>
              <p>Dynamic status for your account, modules, leads and listing tools.</p>
            </div>
            <span>{settings.filter((item) => item.enabled).length} active</span>
          </div>

          <div className="dashboard-settings-grid">
            {settings.map((item) => (
              <article
                className={`dashboard-setting-card is-${item.tone} ${
                  item.enabled ? "is-active" : "is-inactive"
                }`}
                key={item.label}
              >
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <small>{item.meta}</small>
                </div>
                <span className="dashboard-setting-toggle" aria-hidden="true">
                  <i />
                </span>
                <strong>{item.enabled ? "Active" : "Inactive"}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: SettingTone;
}) {
  return (
    <article className={`dashboard-settings-summary-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SettingsLoadingOverlay() {
  return (
    <div className="dashboard-settings-loader" role="status" aria-live="polite">
      <div className="dashboard-settings-loader-card">
        <span className="dashboard-settings-loader-spinner" aria-hidden="true"></span>
        <strong>Loading settings</strong>
        <p>Getting your profile, plan, and listing module status.</p>
      </div>
    </div>
  );
}

function buildListingMetrics(listings: ListingSummary[]) {
  return listings.reduce(
    (metrics, listing) => {
      if (isJobsListing(listing)) {
        metrics.jobs += 1;
      }

      if (isProductListing(listing)) {
        metrics.products += 1;
      }

      if (isServiceExpertListing(listing)) {
        metrics.serviceExperts += 1;
      }

      return metrics;
    },
    { jobs: 0, products: 0, serviceExperts: 0 },
  );
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

function isServiceExpertListing(listing: ListingSummary) {
  return matchesListingText(listing, [
    "service",
    "services",
    "care",
    "beauty",
    "cleaning",
    "repair",
    "expert",
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

function getRecordText(
  record: Record<string, string | number | boolean | null> | undefined,
  key: string,
) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

function formatLimit(value: number | undefined) {
  if (value === undefined || value === null) {
    return "-";
  }

  if (value < 0) {
    return "Unlimited";
  }

  return String(value);
}
