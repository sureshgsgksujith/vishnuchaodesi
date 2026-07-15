import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../api/allServiceDirectoryApi";
import { getPublicAllServicePostings, type PublicAllServicePosting } from "../api/allServicePostingsApi";
import { submitProviderInterest, submitRequirement } from "../../listing/api/requirementsApi";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import "../styles/allServices.css";

type DetailOption = {
  key: string;
  id: number;
  name: string;
  slug: string;
  subCategoryName: string;
};

type MatchedService = {
  category: AllServiceCategoryOption | null;
  subCategory: AllServiceSubCategoryOption | null;
  detail: DetailOption;
  options: DetailOption[];
};

type QuoteStep = "details" | "verify" | "matched";

type QuoteFormState = {
  name: string;
  city: string;
  email: string;
  phoneCode: string;
  phone: string;
  description: string;
  otherProviders: boolean;
  consent: boolean;
};

const providerPageSize = 6;

const initialQuoteForm: QuoteFormState = {
  name: "",
  city: "",
  email: "",
  phoneCode: "+1",
  phone: "",
  description: "",
  otherProviders: true,
  consent: false,
};

export default function AllServicesDetailedPage() {
  const [searchParams] = useSearchParams();
  const { activeCity, activeLocationLabel } = useHomeSelectedLocation();
  const requestedDetailSlug = cleanServiceName(searchParams.get("detail"));
  const requestedCategory = cleanServiceName(searchParams.get("category"));
  const requestedSubCategory = cleanServiceName(searchParams.get("subCategory"));
  const requestedCategoryId = Number(searchParams.get("categoryId") || 0);
  const hasCategoryRequest = Boolean(requestedCategory || requestedCategoryId);
  const requestedService = cleanServiceName(searchParams.get("service")) || (hasCategoryRequest ? "" : "Tax Consultants");
  const cityLabel = activeLocationLabel || "Ashburn, VA";

  const [categories, setCategories] = useState<AllServiceCategoryOption[]>([]);
  const [loadMessage, setLoadMessage] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [providerPage, setProviderPage] = useState(1);
  const [providers, setProviders] = useState<PublicAllServicePosting[]>([]);
  const [providerTotalCount, setProviderTotalCount] = useState(0);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [providerLoadError, setProviderLoadError] = useState("");
  const [providerScopeMessage, setProviderScopeMessage] = useState("");
  const [quoteStep, setQuoteStep] = useState<QuoteStep>("details");
  const [quoteForm, setQuoteForm] = useState<QuoteFormState>(initialQuoteForm);
  const [quoteVerificationMethod, setQuoteVerificationMethod] = useState<"" | "sms" | "call">("");
  const [quoteGeneratedOtp, setQuoteGeneratedOtp] = useState("");
  const [quoteOtp, setQuoteOtp] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false);
  const [interestedProviderId, setInterestedProviderId] = useState<number | null>(null);
  const [interestedMessage, setInterestedMessage] = useState("");
  const [interestedError, setInterestedError] = useState("");

  useEffect(() => {
    let isActive = true;
    getAllServiceDirectoryTree()
      .then((items) => {
        if (!isActive) return;
        setCategories(items);
        setLoadMessage("");
      })
      .catch(() => {
        if (!isActive) return;
        setCategories([]);
        setLoadMessage("Unable to load live related services. Showing the selected service only.");
      });

    return () => {
      isActive = false;
    };
  }, []);

  const matched = useMemo(
    () => resolveService(categories, {
      service: requestedService,
      detailSlug: requestedDetailSlug,
      category: requestedCategory,
      subCategory: requestedSubCategory,
      categoryId: requestedCategoryId,
    }),
    [categories, requestedCategory, requestedCategoryId, requestedDetailSlug, requestedService, requestedSubCategory],
  );

  useEffect(() => {
    setSelectedKeys([matched.detail.key]);
    setServiceSearch("");
    setFormError("");
    setProviderPage(1);
  }, [matched.detail.key]);

  const selectedServices = useMemo(
    () => matched.options.filter((option) => selectedKeys.includes(option.key)),
    [matched.options, selectedKeys],
  );
  const selectedDetailIds = useMemo(
    () => selectedServices.map((option) => option.id).filter((id) => id > 0).join(","),
    [selectedServices],
  );
  const selectedServiceNames = useMemo(
    () => selectedServices.map((option) => option.name).join("|"),
    [selectedServices],
  );

  useEffect(() => {
    let isActive = true;

    setIsLoadingProviders(true);
    setProviderLoadError("");
    setProviderScopeMessage("");

    const baseQuery = {
      categoryId: matched.category?.id,
      category: matched.category?.name || requestedCategory,
      page: providerPage,
      pageSize: providerPageSize,
    };
    const serviceQuery = {
      ...baseQuery,
      service: selectedServices.length === 1 ? selectedServices[0].name : matched.detail.name,
      detail: selectedServices.length === 1 ? selectedServices[0].slug : matched.detail.slug,
      detailIds: selectedDetailIds,
    };

    (async () => {
      let result = await getPublicAllServicePostings({
        ...serviceQuery,
        city: activeCity || undefined,
      });
      let scopeMessage = "";

      if (result.totalCount === 0 && activeCity) {
        result = await getPublicAllServicePostings(serviceQuery);
        if (result.totalCount > 0) {
          scopeMessage = `No ${matched.detail.name} providers are posted in ${cityLabel} yet. Showing matching providers from other service areas.`;
        }
      }

      if (result.totalCount === 0 && !selectedDetailIds) {
        result = await getPublicAllServicePostings(baseQuery);
        if (result.totalCount > 0) {
          scopeMessage = `No exact ${matched.detail.name} providers are posted yet. Showing related ${matched.category?.name || "service"} providers.`;
        }
      }

      return { result, scopeMessage };
    })()
      .then(({ result, scopeMessage }) => {
        if (!isActive) return;
        setProviders(result.items);
        setProviderTotalCount(result.totalCount);
        setProviderScopeMessage(scopeMessage);
      })
      .catch(() => {
        if (!isActive) return;
        setProviders([]);
        setProviderTotalCount(0);
        setProviderScopeMessage("");
        setProviderLoadError("Unable to load posted providers right now.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProviders(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    activeCity,
    matched.category?.id,
    matched.category?.name,
    matched.detail.name,
    matched.detail.slug,
    providerPage,
    requestedCategory,
    selectedDetailIds,
    selectedServiceNames,
  ]);

  const visibleOptions = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return matched.options;
    return matched.options.filter((option) =>
      `${option.name} ${option.subCategoryName}`.toLowerCase().includes(query),
    );
  }, [matched.options, serviceSearch]);

  const providerPageCount = Math.max(1, Math.ceil(providerTotalCount / providerPageSize));

  function toggleService(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
    setFormError("");
    setProviderPage(1);
  }

  function startQuote() {
    if (!selectedKeys.length) {
      setFormError("Please select at least one service type.");
      return;
    }

    setFormError("");
    setQuoteStep("details");
    const storedCustomer = getStoredCustomerQuoteInfo();
    setQuoteForm((current) => ({
      ...current,
      city: current.city || cityLabel,
      name: current.name || storedCustomer.name,
      email: current.email || storedCustomer.email,
      phoneCode: current.phoneCode || storedCustomer.phoneCode,
      phone: current.phone || storedCustomer.phone,
    }));
    setQuoteVerificationMethod("");
    setQuoteGeneratedOtp("");
    setQuoteOtp("");
    setQuoteError("");
    setInterestedProviderId(null);
    setInterestedMessage("");
    setInterestedError("");
    setIsQuoteOpen(true);
  }

  function updateQuoteForm(updates: Partial<QuoteFormState>) {
    setQuoteForm((current) => ({ ...current, ...updates }));
    setQuoteError("");
  }

  function submitQuoteDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateQuoteForm()) {
      return;
    }

    setQuoteStep("verify");
    setQuoteError("");
  }

  function validateQuoteForm() {
    if (!quoteForm.name.trim()) {
      setQuoteError("Enter your name.");
      return false;
    }

    if (!quoteForm.city.trim()) {
      setQuoteError("Enter your city.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteForm.email.trim())) {
      setQuoteError("Enter a valid email address.");
      return false;
    }

    if (cleanPhone(quoteForm.phone).length < 7) {
      setQuoteError("Enter a valid contact number.");
      return false;
    }

    if (!quoteForm.consent) {
      setQuoteError("Please agree to be contacted before continuing.");
      return false;
    }

    return true;
  }

  function chooseQuoteVerificationMethod(method: "sms" | "call") {
    setQuoteVerificationMethod(method);
    setQuoteGeneratedOtp(createDemoOtp());
    setQuoteOtp("");
    setQuoteError("");
  }

  function resendQuoteOtp() {
    if (!quoteVerificationMethod) {
      setQuoteError("Select SMS or Call to receive OTP.");
      return;
    }

    setQuoteGeneratedOtp(createDemoOtp());
    setQuoteOtp("");
    setQuoteError("");
  }

  async function verifyAndSubmitQuote() {
    if (!quoteVerificationMethod) {
      setQuoteError("Select SMS or Call to receive OTP.");
      return;
    }

    if (!quoteGeneratedOtp) {
      setQuoteError("Click Get OTP before verification.");
      return;
    }

    if (quoteOtp.trim() !== quoteGeneratedOtp) {
      setQuoteError("OTP does not match. Enter the OTP shown above.");
      return;
    }

    try {
      setIsQuoteSubmitting(true);
      setQuoteError("");
      await submitRequirement({
        name: quoteForm.name.trim(),
        email: quoteForm.email.trim(),
        mobileNumber: `${quoteForm.phoneCode} ${quoteForm.phone.trim()}`,
        categoryName: matched.category?.name || matched.detail.name,
        city: quoteForm.city.trim(),
        desiredServices: selectedServices.length ? selectedServices.map((item) => item.name) : [matched.detail.name],
        matchingProviderIds: providers.slice(0, 10).map((provider) => provider.id),
        message: buildQuoteRequirementMessage({
          city: quoteForm.city,
          description: quoteForm.description,
          services: selectedServices.length ? selectedServices.map((item) => item.name) : [matched.detail.name],
          otherProviders: quoteForm.otherProviders,
          verificationMethod: quoteVerificationMethod,
        }),
        pageUrl: window.location.href,
      });
      setQuoteStep("matched");
    } catch {
      setQuoteError("Unable to submit your requirement right now. Please try again.");
    } finally {
      setIsQuoteSubmitting(false);
    }
  }

  async function submitInterestedProvider(provider: PublicAllServicePosting) {
    if (interestedProviderId) {
      return;
    }

    try {
      setInterestedProviderId(provider.id);
      setInterestedMessage("");
      setInterestedError("");
      await submitProviderInterest({
        providerId: provider.id,
        name: quoteForm.name.trim(),
        email: quoteForm.email.trim(),
        mobileNumber: `${quoteForm.phoneCode} ${quoteForm.phone.trim()}`,
        categoryName: matched.category?.name || matched.detail.name,
        city: quoteForm.city.trim() || cityLabel,
        desiredServices: selectedServices.length ? selectedServices.map((item) => item.name) : [matched.detail.name],
        message: buildQuoteRequirementMessage({
          city: quoteForm.city || cityLabel,
          description: quoteForm.description,
          services: selectedServices.length ? selectedServices.map((item) => item.name) : [matched.detail.name],
          otherProviders: quoteForm.otherProviders,
          verificationMethod: quoteVerificationMethod || "sms",
        }),
        pageUrl: window.location.href,
      });
      setIsQuoteOpen(false);
      setQuoteStep("details");
    } catch (error) {
      setInterestedError(getApiErrorMessage(error, "Unable to send interest email right now. Please try again."));
    } finally {
      setInterestedProviderId(null);
    }
  }

  return (
    <>
      <CustomerHeader />
      <main className="service-quote-react-page" data-theme={getCategoryTheme(matched.category?.name || requestedCategory)}>
        <nav className="sq-subnav-react" aria-label="Related services">
          <div className="all-services-container sq-subnav-react-inner">
            <Link to="/all-services" className="sq-subnav-home" title="All Services">
              <i className="material-icons">home</i>
            </Link>
            <div className="sq-subnav-links-react">
              {matched.options.slice(0, 10).map((option) => (
                <Link
                  className={option.key === matched.detail.key ? "active" : ""}
                  to={buildDetailHref(option, matched.category)}
                  key={option.key}
                >
                  {option.name}
                </Link>
              ))}
            </div>
            <Link to="/dashboard/services/new" className="sq-list-biz-btn-react">List Your Business</Link>
          </div>
        </nav>

        <section className="sq-hero-react">
          <div className="all-services-container">
            <div className="sq-hero-grid-react">
              <div className="sq-hero-left-react">
                <nav className="all-services-crumb sq-detail-crumb" aria-label="breadcrumb">
                  <Link to="/home">Home</Link>
                  <span>/</span>
                  <Link to="/all-services">All Services</Link>
                  <span>/</span>
                  <b>{matched.detail.name}</b>
                </nav>
                <h1>{matched.detail.name} Services</h1>
                <p>
                  Tell us more about your requirement so that we can connect you to the right{" "}
                  <strong>{matched.detail.name}</strong> in <strong>{cityLabel}</strong>.
                </p>
                {loadMessage ? <div className="sq-inline-note">{loadMessage}</div> : null}
                <div className="sq-hero-providers-react">
                  {isLoadingProviders ? (
                    <div className="sq-provider-status-react">
                      <span className="all-services-location-spinner" aria-hidden="true"></span>
                      Loading posted providers...
                    </div>
                  ) : null}

                  {!isLoadingProviders && providerLoadError ? (
                    <div className="sq-provider-status-react">{providerLoadError}</div>
                  ) : null}

                  {!isLoadingProviders && !providerLoadError && providerScopeMessage ? (
                    <div className="sq-provider-status-react sq-provider-scope-note-react">{providerScopeMessage}</div>
                  ) : null}

                  {!isLoadingProviders && !providerLoadError && !providers.length ? (
                    <div className="sq-provider-status-react">
                      No posted providers found for {matched.detail.name} in {cityLabel}.
                    </div>
                  ) : null}

                  {!isLoadingProviders && providers.map((provider, index) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      fallbackServiceName={matched.detail.name}
                      className={index % 2 === 0 ? "drift-right" : "drift-left"}
                    />
                  ))}

                  {!isLoadingProviders && providerTotalCount > providerPageSize ? (
                    <div className="sq-provider-pagination-react">
                      <button type="button" onClick={() => setProviderPage((page) => Math.max(1, page - 1))} disabled={providerPage <= 1}>
                        Previous
                      </button>
                      <span>Page {providerPage} of {providerPageCount}</span>
                      <button type="button" onClick={() => setProviderPage((page) => Math.min(providerPageCount, page + 1))} disabled={providerPage >= providerPageCount}>
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="sq-quote-card-react">
                <h2>What <span>{matched.category?.name || matched.detail.name}</span> are you looking for?</h2>
                <label className="sq-search-box-react">
                  <i className="material-icons">search</i>
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(event) => setServiceSearch(event.target.value)}
                    placeholder="Search service type"
                  />
                </label>
                <div className="sq-check-list-react">
                  {visibleOptions.map((option) => {
                    const checked = selectedKeys.includes(option.key);
                    return (
                      <label className={checked ? "is-checked" : ""} key={option.key}>
                        <input type="checkbox" checked={checked} onChange={() => toggleService(option.key)} />
                        <span className="sq-check-box-react" />
                        <span>{option.name}</span>
                      </label>
                    );
                  })}
                </div>
                {formError ? <div className="sq-form-error">{formError}</div> : null}
                <button type="button" className="sq-btn-get-started-react" onClick={startQuote}>Get Started</button>
              </aside>
            </div>
          </div>
        </section>

        <section className="sq-detail-support">
          <div className="all-services-container">
            <div className="sq-detail-support-grid">
              <article>
                <h2>Compare {matched.detail.name} providers near {cityLabel}</h2>
                <p>Submit one request and let matching providers respond with availability, pricing, and next steps.</p>
              </article>
              <article>
                <h3>Selected services</h3>
                <div className="sq-selected-tags">
                  {(selectedServices.length ? selectedServices : [matched.detail]).map((option) => (
                    <span key={option.key}>{option.name}</span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>

      {isQuoteOpen ? (
        <div className="sq-modal-backdrop-react" role="dialog" aria-modal="true">
          {quoteStep === "details" ? (
            <form className="sq-modal-react" onSubmit={submitQuoteDetails}>
              <button type="button" className="sq-modal-close-react" aria-label="Close" onClick={() => setIsQuoteOpen(false)}>x</button>
              <h4>Get Quote From {matched.detail.name}</h4>
              <p>Quickly compare and find the best local deals.</p>
              <label>Name <span>*</span><input type="text" name="name" value={quoteForm.name} onChange={(event) => updateQuoteForm({ name: event.target.value })} placeholder="Your full name" /></label>
              <label>City <span>*</span><input type="text" name="city" value={quoteForm.city} onChange={(event) => updateQuoteForm({ city: event.target.value })} /></label>
              <label>Email <span>*</span><input type="email" name="email" value={quoteForm.email} onChange={(event) => updateQuoteForm({ email: event.target.value })} placeholder="Email address" /></label>
              <label>Contact Number <span>*</span></label>
              <div className="sq-phone-row-react">
                <select name="phone_code" value={quoteForm.phoneCode} onChange={(event) => updateQuoteForm({ phoneCode: event.target.value })}>
                  <option value="+1">+1 US</option>
                  <option value="+1 CA">+1 CA</option>
                  <option value="+91">+91 IN</option>
                </select>
                <input type="tel" name="phone" value={quoteForm.phone} onChange={(event) => updateQuoteForm({ phone: event.target.value })} placeholder="Contact number" />
              </div>
              <label>Description<textarea name="description" rows={3} value={quoteForm.description} onChange={(event) => updateQuoteForm({ description: event.target.value })} placeholder="Tell us more about your requirement..." /></label>
              <label className="sq-check-react"><input type="checkbox" checked={quoteForm.otherProviders} onChange={(event) => updateQuoteForm({ otherProviders: event.target.checked })} /><span>I also wish to get quotes from other service providers.</span></label>
              <label className="sq-check-react"><input type="checkbox" checked={quoteForm.consent} onChange={(event) => updateQuoteForm({ consent: event.target.checked })} /><span>I agree to be contacted by Chao Desi via call, SMS, or WhatsApp.</span></label>
              {quoteError ? <div className="sq-form-error">{quoteError}</div> : null}
              <button type="submit" className="sq-btn-get-started-react">Continue</button>
            </form>
          ) : null}

          {quoteStep === "verify" ? (
            <div className="sq-modal-react sq-otp-modal-react">
              <button type="button" className="sq-modal-close-react" aria-label="Close" onClick={() => setIsQuoteOpen(false)}>x</button>
              <h4>Get Matched with the Right Expert for Your Needs</h4>
              <div className="sq-otp-panel-react">
                <p>Hi, please verify your phone number</p>
                <label>Send OTP as</label>
                <div className="sq-otp-methods-react" role="radiogroup" aria-label="Send OTP as">
                  <label><input type="radio" checked={quoteVerificationMethod === "sms"} onChange={() => chooseQuoteVerificationMethod("sms")} /> SMS</label>
                  <label><input type="radio" checked={quoteVerificationMethod === "call"} onChange={() => chooseQuoteVerificationMethod("call")} /> Call</label>
                </div>
                <button type="button" className="sq-otp-primary-react" onClick={resendQuoteOtp}>Get OTP</button>
                {quoteGeneratedOtp ? (
                  <p className="sq-otp-note-react">
                    Demo OTP sent by {quoteVerificationMethod === "sms" ? "SMS" : "Call"} to {quoteForm.phoneCode} {quoteForm.phone}: <strong>{quoteGeneratedOtp}</strong>
                  </p>
                ) : null}
                <p>Start receiving responses by verifying your number. Verified numbers add authenticity and help providers contact you with their best quotes.</p>
                <label>Verification Code<input type="text" inputMode="numeric" value={quoteOtp} onChange={(event) => setQuoteOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter OTP" /></label>
                {quoteError ? <div className="sq-form-error">{quoteError}</div> : null}
                <div className="sq-otp-actions-react">
                  <button type="button" className="sq-otp-primary-react" onClick={verifyAndSubmitQuote} disabled={isQuoteSubmitting}>
                    {isQuoteSubmitting ? "Submitting..." : "Verify & Submit"}
                  </button>
                  <button type="button" className="sq-otp-secondary-react" onClick={resendQuoteOtp}>Resend</button>
                  <button type="button" className="sq-otp-link-react" onClick={() => setQuoteStep("details")}>Change Phone Number</button>
                </div>
              </div>
            </div>
          ) : null}

          {quoteStep === "matched" ? (
            <MatchedQuoteModal
              selectedServices={selectedServices.length ? selectedServices : [matched.detail]}
              providers={providers}
              onClose={() => setIsQuoteOpen(false)}
              onInterested={submitInterestedProvider}
              interestedProviderId={interestedProviderId}
              interestedMessage={interestedMessage}
              interestedError={interestedError}
            />
          ) : null}
        </div>
      ) : null}

      <HomeFooterSection />
    </>
  );
}

function ProviderCard({
  provider,
  fallbackServiceName,
  className,
}: {
  provider: PublicAllServicePosting;
  fallbackServiceName: string;
  className: string;
}) {
  const services = getProviderServiceNames(provider);
  const primaryService = services[0] || provider.serviceName || fallbackServiceName;
  const extraCount = Math.max(services.length - 1, 0);

  return (
    <article className={`sq-hero-provider-card-react ${className}`}>
      <div className="sq-provider-media-react">
        {provider.businessImageUrl ? (
          <img className="sq-hero-provider-image-react" src={provider.businessImageUrl} alt="" />
        ) : (
          <div className="sq-hero-provider-avatar-react">{getProviderInitial(provider.businessName)}</div>
        )}
        <span>{provider.allServiceCategoryName}</span>
      </div>
      <div className="sq-provider-body-react">
        <div className="sq-provider-title-row-react">
          <h4>{provider.businessName}</h4>
          <span className="sq-provider-verified-react">
            <i className="material-icons">verified</i>
            Verified
          </span>
        </div>
        {provider.tagline ? <p className="sq-provider-tagline-react">{provider.tagline}</p> : null}
        <div className="sq-hero-provider-meta-react">
          <span><i className="material-icons">location_on</i>{getProviderLocation(provider)}</span>
          <span><i className="material-icons">phone</i>{formatProviderPhone(provider)}</span>
        </div>
        <div className="sq-provider-card-footer-react">
          <p>
            <strong>{primaryService}</strong>
            {extraCount > 0 ? <span>+ {extraCount} more</span> : null}
          </p>
          <Link to={`/local-service-details/${provider.id}?service=${encodeURIComponent(primaryService)}`}>View details</Link>
        </div>
      </div>
    </article>
  );
}

function MatchedQuoteModal({
  selectedServices,
  providers,
  onClose,
  onInterested,
  interestedProviderId,
  interestedMessage,
  interestedError,
}: {
  selectedServices: DetailOption[];
  providers: PublicAllServicePosting[];
  onClose: () => void;
  onInterested: (provider: PublicAllServicePosting) => void | Promise<void>;
  interestedProviderId: number | null;
  interestedMessage: string;
  interestedError: string;
}) {
  const recommendedProviders = providers.slice(0, 3);
  const desiredServices = selectedServices.map((service) => service.name).join(", ");

  return (
    <div className="sq-modal-react sq-matched-modal-react">
      <button type="button" className="sq-modal-close-react" aria-label="Close" onClick={onClose}>x</button>
      <div className="sq-matched-panel-react">
        <i className="material-icons" aria-hidden="true">thumb_up</i>
        <p>We are matching your service request. Providers will get in touch with you shortly to assist with your needs.</p>
        <div className="sq-matched-service-react">Your desired service: {desiredServices}</div>
      </div>
      <div className="sq-recommended-panel-react">
        <h4>Businesses Recommended for You</h4>
        <p>Here are some similar businesses you might find useful to enquire.</p>
        {recommendedProviders.length ? (
          recommendedProviders.map((provider) => (
            <div className="sq-recommended-business-react" key={provider.id}>
              <strong>{provider.businessName}</strong>
              <span>{getProviderLocation(provider)}</span>
              <button type="button" onClick={() => onInterested(provider)} disabled={interestedProviderId === provider.id}>
                {interestedProviderId === provider.id ? "Sending..." : "I'm Interested"}
              </button>
            </div>
          ))
        ) : (
          selectedServices.slice(0, 3).map((service) => (
            <div className="sq-recommended-business-react" key={service.key}>
              <strong>{service.name}</strong>
              <span>Matching providers will be contacted for this service.</span>
              <button type="button" disabled>I'm Interested</button>
            </div>
          ))
        )}
        {interestedMessage ? <div className="sq-interest-success-react">{interestedMessage}</div> : null}
        {interestedError ? <div className="sq-form-error">{interestedError}</div> : null}
      </div>
    </div>
  );
}

function getProviderServiceNames(provider: PublicAllServicePosting) {
  return provider.selectedServices
    .map((service) => service.detailedCategoryName)
    .filter(Boolean);
}

function getProviderInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}

function getProviderLocation(provider: PublicAllServicePosting) {
  const primaryLocation = provider.serviceLocations.find((location) => location.isPrimary) || provider.serviceLocations[0];
  return primaryLocation?.formattedAddress || provider.primaryServiceLocation || "Location available on request";
}

function formatProviderPhone(provider: PublicAllServicePosting) {
  return [provider.phoneCountryCode, provider.phoneNumber].filter(Boolean).join(" ") || "Phone available on request";
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function createDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildQuoteRequirementMessage({
  city,
  description,
  services,
  otherProviders,
  verificationMethod,
}: {
  city: string;
  description: string;
  services: string[];
  otherProviders: boolean;
  verificationMethod: "sms" | "call";
}) {
  return [
    `Desired services: ${services.join(", ")}`,
    `City: ${city.trim()}`,
    `Phone verified by: ${verificationMethod === "sms" ? "SMS" : "Call"} demo OTP`,
    `Also wants quotes from other providers: ${otherProviders ? "Yes" : "No"}`,
    description.trim() ? `Requirement: ${description.trim()}` : "",
  ].filter(Boolean).join("\n");
}

function getStoredCustomerQuoteInfo() {
  if (typeof window === "undefined" || !isCustomerAuthenticated()) {
    return { name: "", email: "", phoneCode: "+1", phone: "" };
  }

  const name = localStorage.getItem("fullName") || localStorage.getItem("customer_name") || "";
  const email = localStorage.getItem("email") || "";
  const storedMobile = localStorage.getItem("mobileNumber") || "";
  const mobileMatch = storedMobile.trim().match(/^(\+\d{1,4})\s*(.*)$/);

  return {
    name,
    email,
    phoneCode: mobileMatch?.[1] || "+1",
    phone: mobileMatch?.[2] || storedMobile,
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: unknown } | undefined;
    if (typeof responseData?.message === "string" && responseData.message.trim()) {
      return responseData.message;
    }
  }

  return fallback;
}

function resolveService(
  categories: AllServiceCategoryOption[],
  request: { service: string; detailSlug: string; category: string; subCategory: string; categoryId: number },
): MatchedService {
  const fallbackDetail = toDetailOption({ id: 0, name: request.service, slug: buildSlug(request.service) }, request.subCategory || request.category || "Services");
  if (!categories.length) {
    return { category: null, subCategory: null, detail: fallbackDetail, options: [fallbackDetail] };
  }

  const category = findCategory(categories, request) || categories[0];
  const allOptions = flattenCategoryOptions(category);
  const serviceAliases = getServiceAliases(request.service, request.detailSlug);
  const detail =
    allOptions.find((option) => option.slug === request.detailSlug) ||
    allOptions.find((option) => isSameText(option.name, request.service)) ||
    allOptions.find((option) => serviceAliases.some((alias) => option.slug === alias || isSameText(option.name, alias))) ||
    allOptions.find((option) => option.name.toLowerCase().includes(request.service.toLowerCase())) ||
    fallbackDetail;
  const subCategory =
    category.subCategories.find((item) => item.detailedCategories.some((detailItem) => detailItem.slug === detail.slug || isSameText(detailItem.name, detail.name))) ||
    category.subCategories.find((item) => isSameText(item.name, request.subCategory)) ||
    null;
  const options = uniqueOptions([detail, ...allOptions]);

  return { category, subCategory, detail, options };
}

function findCategory(categories: AllServiceCategoryOption[], request: { service: string; detailSlug: string; category: string; categoryId: number }) {
  return (
    categories.find((category) => request.categoryId > 0 && category.id === request.categoryId) ||
    categories.find((category) => isSameText(category.name, request.category) || category.slug === buildSlug(request.category)) ||
    categories.find((category) =>
      category.subCategories.some((subCategory) =>
        subCategory.detailedCategories.some((detail) =>
          detail.slug === request.detailSlug || isSameText(detail.name, request.service),
        ),
      ),
    ) ||
    null
  );
}

function flattenCategoryOptions(category: AllServiceCategoryOption) {
  return category.subCategories.flatMap((subCategory) =>
    subCategory.detailedCategories.length
      ? subCategory.detailedCategories.map((detail) => toDetailOption(detail, subCategory.name))
      : [toDetailOption({ id: subCategory.id, name: subCategory.name, slug: subCategory.slug }, subCategory.name)],
  );
}

function toDetailOption(detail: Pick<AllServiceDetailedCategoryOption, "id" | "name" | "slug">, subCategoryName: string): DetailOption {
  const slug = detail.slug || buildSlug(detail.name);
  return {
    key: `${detail.id || 0}-${slug}`,
    id: detail.id,
    name: detail.name,
    slug,
    subCategoryName,
  };
}

function uniqueOptions(options: DetailOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.slug || option.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDetailHref(option: DetailOption, category: AllServiceCategoryOption | null) {
  const params = new URLSearchParams({
    service: option.name,
    detail: option.slug,
    subCategory: option.subCategoryName,
  });

  if (category) {
    params.set("category", category.name);
    params.set("categoryId", String(category.id));
  }

  return `/all-services-detailed?${params.toString()}`;
}

function cleanServiceName(value: string | null) {
  return decodeURIComponent(value || "").replace(/\+/g, " ").trim();
}

function isSameText(left: string, right: string) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getServiceAliases(serviceName: string, detailSlug: string) {
  const slug = detailSlug || buildSlug(serviceName);
  const aliases: Record<string, string[]> = {
    "sell-property": ["sellers-agents", "sellers agents", "buying-selling-agents", "buying selling agents"],
    "buy-property": ["buyers-agents", "buyers agents", "buying-selling-agents", "buying selling agents"],
    "rent-property": ["rental-agents", "rental agents"],
    "property-rental": ["rental-agents", "rental agents"],
  };

  return aliases[slug] || [];
}

function getCategoryTheme(name: string) {
  const lower = name.toLowerCase();
  if (/real/.test(lower)) return "real-estate";
  if (/health|wellness/.test(lower)) return "health";
  if (/wedding|event/.test(lower)) return "wedding";
  if (/food|catering|restaurant/.test(lower)) return "food";
  if (/financial|legal|tax|immigration/.test(lower)) return "finance";
  if (/lesson|tuition|education|school|college/.test(lower)) return "education";
  if (/travel|accommodation/.test(lower)) return "travel";
  if (/religious|community/.test(lower)) return "religious";
  return "default";
}
