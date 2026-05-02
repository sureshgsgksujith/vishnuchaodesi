import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../../dashboard/components/DashboardFooter";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import {
  getMyPlanUsage,
  getPricingPlans,
  selectPricingPlan,
  type PlanUsage,
  type PricingPlan,
} from "../api/pricingApi";
import "./pricingDetails.css";

export default function PricingDetailsPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = isCustomerAuthenticated();
  const pricingState = location.state as
    | {
        pendingListingDraft?: unknown;
        returnTo?: string;
      }
    | null;
  const returnTo = pricingState?.returnTo;
  const hasPendingListingDraft = Boolean(pricingState?.pendingListingDraft && returnTo);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getPricingPlans(),
      isAuthenticated ? getMyPlanUsage().catch(() => null) : Promise.resolve(null),
    ])
      .then(([planItems, usageData]) => {
        if (!isActive) return;
        setPlans(planItems);
        setUsage(usageData);
      })
      .catch(() => {
        if (isActive) {
          setMessage("Unable to load pricing plans.");
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
  }, [isAuthenticated]);

  const activePlanCode = usage?.plan?.code;

  const usageText = useMemo(() => {
    if (!usage) return "";
    if (usage.listingRemaining < 0) {
      return `${usage.listingCount} listing(s) used. Unlimited remaining.`;
    }
    return `${usage.listingCount} listing(s) used. ${usage.listingRemaining} remaining.`;
  }, [usage]);

  async function handlePlanAction(plan: PricingPlan) {
    if (!isAuthenticated) {
      navigate(`/login?login=register&plan=${encodeURIComponent(plan.code)}`);
      return;
    }

    const continueToPendingListing = () => {
      if (!returnTo) {
        return false;
      }

      navigate(returnTo, {
        state: {
          pendingListingDraft: pricingState?.pendingListingDraft,
          pricingConfirmed: true,
        },
      });
      return true;
    };

    if (activePlanCode !== plan.code) {
      setIsSelecting(plan.code);
      setMessage("");
      try {
        const nextUsage = await selectPricingPlan(plan.code);
        setUsage(nextUsage);
        if (!nextUsage.canCreateListing) {
          setMessage("This plan has reached the listing limit. Choose a higher plan to save this listing.");
          return;
        }
        if (continueToPendingListing()) {
          return;
        }
      } catch {
        setMessage("Unable to update your plan.");
      } finally {
        setIsSelecting("");
      }
      return;
    }

    if (hasPendingListingDraft && usage && !usage.canCreateListing) {
      setMessage("Your current plan has reached the listing limit. Choose a higher plan to save this listing.");
      return;
    }

    if (continueToPendingListing()) {
      return;
    }

    if (usage?.canCreateListing) {
      navigate("/dashboard/listings/start");
      return;
    }

    setMessage("Your current plan has reached the listing limit. Choose a higher plan to add more listings.");
  }

  return (
    <>
      <UserHomeHeader />
      <main className="pricing-page">
        <section className="pricing-hero">
          <h1>
            Choose your <span>Pricing Plan</span>
          </h1>
          <p>Pick a plan to control listings, media, and account features dynamically.</p>
          {hasPendingListingDraft ? (
            <div className="pricing-usage">
              <strong>Plan required before saving</strong>
              <span>Select a plan to continue saving your listing.</span>
            </div>
          ) : null}
          {usage ? (
            <div className="pricing-usage">
              <strong>Current plan: {usage.plan.name}</strong>
              <span>{usageText}</span>
            </div>
          ) : null}
          {message ? <div className="pricing-alert">{message}</div> : null}
        </section>

        <section className="pricing-grid" aria-label="Pricing plans">
          {isLoading ? <div className="pricing-loading">Loading plans...</div> : null}
          {plans.map((plan) => {
            const isActive = activePlanCode === plan.code;
            return (
              <article className={`pricing-card ${plan.isHighlighted ? "pricing-card-featured" : ""}`} key={plan.code}>
                <div className="pricing-card-head">
                  <h2>{plan.name}</h2>
                  <p>{plan.tagline}</p>
                </div>
                <div className="pricing-card-body">
                  <div className="pricing-price">
                    {plan.price === 0 ? "FREE" : `$${plan.price}`}
                  </div>
                  <p>{plan.code === "FREE" ? "Single user" : plan.isHighlighted ? "Made for enterprises" : "Business plan"}</p>
                  <button
                    type="button"
                    className="pricing-action"
                    onClick={() => handlePlanAction(plan)}
                    disabled={isSelecting === plan.code}
                  >
                    {isSelecting === plan.code
                      ? "Updating..."
                      : hasPendingListingDraft
                        ? isActive
                          ? "Continue to save"
                          : "Select and save"
                        : isActive
                          ? "Add listing"
                          : "Select plan"}
                  </button>
                  {isActive ? <span className="pricing-active">Active plan</span> : null}
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <i className="material-icons">check_circle</i>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </section>

        <div className="pricing-dashboard-link">
          <Link to="/dashboard/payment">View payment and plan details</Link>
        </div>
      </main>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}
