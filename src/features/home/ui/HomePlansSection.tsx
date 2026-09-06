import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { getPricingPlans, selectPricingPlan, type PricingPlan } from "../../pricing/api/pricingApi";
import { useCurrentCountry } from "../../../shared/hooks/useCurrentCountry";
import { formatCurrencyAmount } from "../../../shared/utils/currency";

type PlanCode = "FREE" | "STANDARD" | "PREMIUM" | "PREMIUM_PLUS";

type HomePlanCard = {
  code: PlanCode;
  title: string;
  tagline: string;
  price: number;
  audience: string;
  features: string[];
  isFeatured?: boolean;
};

type HomePlanView = HomePlanCard & {
  apiPlan?: PricingPlan;
};

type PlanLimitKey = "listingLimit" | "eventLimit" | "jobLimit" | "couponLimit";

const fallbackPlans: HomePlanCard[] = [
  {
    code: "FREE",
    title: "FreePLAN",
    tagline: "For getting started",
    price: 0,
    audience: "Single user",
    features: ["1 Listing", "6 month(s) duration", "1 Events", "1 Jobs", "User Dashboard"],
  },
  {
    code: "STANDARD",
    title: "StandardPLAN",
    tagline: "Perfect for small teams",
    price: 9,
    audience: "Startup business",
    features: ["1 Listing", "5 year(s) duration", "Get direct leads", "Email notification(leads)", "Verified listing"],
  },
  {
    code: "PREMIUM",
    title: "PremiumPLAN",
    tagline: "Best value for large teams",
    price: 19,
    audience: "Medium business",
    features: ["25 Listings", "8 year(s) duration", "25 Jobs", "Email notification(leads)", "Review control"],
  },
  {
    code: "PREMIUM_PLUS",
    title: "Premium PlusPLAN",
    tagline: "Made for enterprises",
    price: 20,
    audience: "Made for enterprises",
    features: ["Unlimited Listing", "10 year(s) duration", "Unlimited Jobs", "Trusted listing", "Special offers"],
    isFeatured: true,
  },
];

const fallbackLimits: Record<PlanCode, Record<PlanLimitKey, number>> = {
  FREE: { listingLimit: 1, eventLimit: 1, jobLimit: 1, couponLimit: 1 },
  STANDARD: { listingLimit: 1, eventLimit: 1, jobLimit: 1, couponLimit: 1 },
  PREMIUM: { listingLimit: 25, eventLimit: 25, jobLimit: 25, couponLimit: 25 },
  PREMIUM_PLUS: { listingLimit: -1, eventLimit: -1, jobLimit: -1, couponLimit: -1 },
};

function formatLimit(value?: number) {
  if (value === undefined) return "-";
  return value < 0 ? "Unlimited" : String(value);
}

function getPlanLimit(plan: HomePlanView, key: PlanLimitKey) {
  return formatLimit(plan.apiPlan?.[key] ?? fallbackLimits[plan.code][key]);
}

function getPlanPriceLabel(plan: HomePlanView, currentCountry: string | null) {
  return plan.price === 0 ? "FREE" : formatCurrencyAmount(plan.price, currentCountry);
}

export default function HomePlansSection() {
  const currentCountry = useCurrentCountry();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiPlans, setApiPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode | "">("");
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [activePlanSlide, setActivePlanSlide] = useState(0);
  const planSliderRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let isActive = true;

    getPricingPlans()
      .then((plans) => {
        if (isActive) {
          setApiPlans(plans);
        }
      })
      .catch(() => {
        if (isActive) {
          setApiPlans([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const plans = useMemo<HomePlanView[]>(() => {
    return fallbackPlans.map((fallbackPlan) => {
      const apiPlan = apiPlans.find((item) => item.code === fallbackPlan.code);

      return {
        ...fallbackPlan,
        tagline: apiPlan?.tagline || fallbackPlan.tagline,
        price: apiPlan?.price ?? fallbackPlan.price,
        features: apiPlan?.features?.length ? apiPlan.features : fallbackPlan.features,
        isFeatured: apiPlan?.isHighlighted ?? fallbackPlan.isFeatured,
        apiPlan,
      };
    });
  }, [apiPlans]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) || null,
    [plans, selectedPlanCode]
  );

  function startPlanCheckout(plan: HomePlanView) {
    if (!isCustomerAuthenticated()) {
      const returnUrl = `/pricing-details?plan=${encodeURIComponent(plan.code)}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!plan.apiPlan) {
      navigate(`/pricing-details?plan=${encodeURIComponent(plan.code)}`);
      return;
    }

    navigate("/dashboard/payment", { state: { checkoutPlan: plan.apiPlan } });
  }

  function openPlanPopup(plan: HomePlanView) {
    if (!isCustomerAuthenticated()) {
      const returnUrl = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setSelectedPlanCode(plan.code);
    setShowPaymentStep(false);
    setPlanMessage("");
  }

  function closePlanPopup() {
    if (isUpdatingPlan) {
      return;
    }

    setSelectedPlanCode("");
    setShowPaymentStep(false);
    setPlanMessage("");
  }

  async function updatePlan(plan: HomePlanView) {
    setIsUpdatingPlan(true);
    setPlanMessage("");

    try {
      await selectPricingPlan(plan.code);
      setShowPaymentStep(false);
      setPlanMessage(`${plan.title} updated successfully.`);
    } catch {
      setPlanMessage("Unable to update your plan. Please try again.");
    } finally {
      setIsUpdatingPlan(false);
    }
  }

  function handlePlanUpdate(plan: HomePlanView) {
    if (plan.price > 0 && !showPaymentStep) {
      setShowPaymentStep(true);
      setPlanMessage("");
      return;
    }

    void updatePlan(plan);
  }

  function movePlans(direction: -1 | 1) {
    const slider = planSliderRef.current;
    if (!slider) return;
    const next = (activePlanSlide + direction + plans.length) % plans.length;
    slider.children[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActivePlanSlide(next);
  }

  function syncPlanSlide() {
    const slider = planSliderRef.current;
    if (!slider) return;
    const center = slider.scrollLeft + slider.clientWidth / 2;
    const slides = Array.from(slider.children) as HTMLElement[];
    const closest = slides.reduce((best, slide, index) => {
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActivePlanSlide(closest.index);
  }

  return (
    <section className="pri">
      <div className="container">
        <div className="row">
          <div className="plac-det-tit-inn">
            <h2>Choose your plan</h2>
          </div>

          <div className="home-plans-carousel">
            <button type="button" className="home-plans-nav home-plans-prev" onClick={() => movePlans(-1)} aria-label="Previous plan">
              <i className="material-icons" aria-hidden="true">chevron_left</i>
            </button>
            <ul ref={planSliderRef} className="home-plans-track" onScroll={syncPlanSlide} aria-label="User plans">
              {plans.map((plan) => (
                <li key={plan.code}>
                  <div className={plan.isFeatured ? "pri-box pri-box-featured" : "pri-box"}>
                    <div className="c2">
                      <h4>{plan.title}</h4>
                      <p>{plan.tagline}</p>
                    </div>

                    <div className="c3">
                      <h2>
                        <span></span>
                        {getPlanPriceLabel(plan, currentCountry)}
                      </h2>
                      <p>{plan.audience}</p>
                    </div>

                    <div className="c5">
                      <a href="/dashboard/payment" className="cta1" onClick={(event) => { event.preventDefault(); startPlanCheckout(plan); }}>Get Start</a>
                      <button type="button" className="cta2 home-plan-know-more" onClick={() => openPlanPopup(plan)}>
                        Know more
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="home-plans-nav home-plans-next" onClick={() => movePlans(1)} aria-label="Next plan">
              <i className="material-icons" aria-hidden="true">chevron_right</i>
            </button>
            <div className="home-plans-dots" aria-hidden="true">
              {plans.map((plan, index) => <span key={plan.code} className={index === activePlanSlide ? "is-active" : ""} />)}
            </div>
          </div>
        </div>
      </div>

      {selectedPlan ? (
        <div className="home-plan-modal-backdrop" role="presentation" onClick={closePlanPopup}>
          <div
            className="home-plan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-plan-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="home-plan-modal-close" onClick={closePlanPopup} aria-label="Close plan details">
              <i className="material-icons">close</i>
            </button>

            <div className="home-plan-modal-head">
              <div>
                <h3 id="home-plan-modal-title">{selectedPlan.title}</h3>
                <p>{selectedPlan.tagline}</p>
              </div>
              <strong>{getPlanPriceLabel(selectedPlan, currentCountry)}</strong>
            </div>

            {showPaymentStep ? (
              <div className="home-plan-gateway">
                <h4>Demo payment gateway</h4>
                <p>This is a dummy payment screen for testing. No real card will be charged.</p>
                <div className="home-plan-gateway-grid">
                  <label>
                    Card number
                    <input value="4242 4242 4242 4242" readOnly />
                  </label>
                  <label>
                    Name
                    <input value="Demo Customer" readOnly />
                  </label>
                  <label>
                    Expiry
                    <input value="12/30" readOnly />
                  </label>
                  <label>
                    CVV
                    <input value="123" readOnly />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="home-plan-limits">
                  <span>Listings: {getPlanLimit(selectedPlan, "listingLimit")}</span>
                  <span>Events: {getPlanLimit(selectedPlan, "eventLimit")}</span>
                  <span>Jobs: {getPlanLimit(selectedPlan, "jobLimit")}</span>
                  <span>Coupons: {getPlanLimit(selectedPlan, "couponLimit")}</span>
                </div>

                <ul className="home-plan-feature-list">
                  {selectedPlan.features.map((feature) => (
                    <li key={feature}>
                      <i className="material-icons">check_circle</i>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {planMessage ? <div className="home-plan-message">{planMessage}</div> : null}

            <div className="home-plan-actions">
              <button type="button" className="home-plan-secondary" onClick={closePlanPopup} disabled={isUpdatingPlan}>
                {planMessage.includes("successfully") ? "Done" : "Cancel"}
              </button>
              {!planMessage.includes("successfully") ? (
                <button
                  type="button"
                  className="home-plan-primary"
                  onClick={() => handlePlanUpdate(selectedPlan)}
                  disabled={isUpdatingPlan}
                >
                  {isUpdatingPlan
                    ? "Updating..."
                    : showPaymentStep
                      ? `Pay ${getPlanPriceLabel(selectedPlan, currentCountry)} and update`
                      : selectedPlan.price > 0
                        ? "Continue to payment"
                        : "Update free plan"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
