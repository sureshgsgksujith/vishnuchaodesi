import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
import { getCustomerContactDefaults, isCustomerAuthenticated } from "../../auth/utils/customerSession";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import {
  getPublicAllServicePosting,
  getPublicAllServicePostings,
  type PublicAllServicePosting,
} from "../../allServices/api/allServicePostingsApi";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getAstrologyReports,
  submitAstrologyRequest,
  type AstrologyReport,
  type AstrologyRequestType,
} from "../api/astrologyApi";
import "./astrology.css";

type AstrologyPageMode = "home" | "astrologers" | "provider-detail" | "talk" | "reports" | "ask" | "report-detail";
const providerPageSize = 12;

export default function AstrologyPage({ mode = "home" }: { mode?: AstrologyPageMode }) {
  const { reportSlug, providerSlug } = useParams();
  const location = useLocation();
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [providers, setProviders] = useState<PublicAllServicePosting[]>([]);
  const [providerPage, setProviderPage] = useState(1);
  const [providerTotalCount, setProviderTotalCount] = useState(0);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providerLoadError, setProviderLoadError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<PublicAllServicePosting | null>(null);
  const [isLoadingSelectedProvider, setIsLoadingSelectedProvider] = useState(mode === "provider-detail");
  const [resolvedProviderSlug, setResolvedProviderSlug] = useState<string | null>(null);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      getAstrologyReports(),
      getAllServiceDirectoryTree(),
    ]).then(([reportsResult, directoryResult]) => {
      if (!isActive) return;

      const errors: string[] = [];
      if (reportsResult.status === "fulfilled") {
        setReports(reportsResult.value);
      } else {
        errors.push("reports");
      }

      if (directoryResult.status === "fulfilled") {
        setServiceOptions(buildAstrologyServiceOptions(directoryResult.value));
      } else {
        errors.push("service options");
      }

      setLoadError(errors.length ? `Unable to load ${errors.join(", ")} from the live directory.` : "");
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLoadingProviders(true);
    setProviderLoadError("");

    getPublicAllServicePostings({ category: "astrology-services", page: providerPage, pageSize: providerPageSize })
      .then((result) => {
        if (!isActive) return;
        setProviders(result.items || []);
        setProviderTotalCount(result.totalCount || 0);
      })
      .catch(() => {
        if (!isActive) return;
        setProviders([]);
        setProviderTotalCount(0);
        setProviderLoadError("Unable to load astrologers from the live directory.");
      })
      .finally(() => {
        if (isActive) setIsLoadingProviders(false);
      });

    return () => {
      isActive = false;
    };
  }, [providerPage]);

  useEffect(() => {
    if (mode !== "provider-detail") {
      setSelectedProvider(null);
      setIsLoadingSelectedProvider(false);
      setResolvedProviderSlug(null);
      return;
    }

    const postingId = Number(providerSlug);
    if (!Number.isInteger(postingId) || postingId <= 0) {
      setSelectedProvider(null);
      setIsLoadingSelectedProvider(false);
      setResolvedProviderSlug(providerSlug || "");
      return;
    }

    let isActive = true;
    setSelectedProvider(null);
    setIsLoadingSelectedProvider(true);
    setResolvedProviderSlug(null);
    getPublicAllServicePosting(postingId)
      .then((result) => {
        if (isActive) setSelectedProvider(result);
      })
      .catch(() => {
        if (isActive) setSelectedProvider(null);
      })
      .finally(() => {
        if (isActive) {
          setResolvedProviderSlug(providerSlug || "");
          setIsLoadingSelectedProvider(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [mode, providerSlug]);

  const activeProvider = selectedProvider && String(selectedProvider.id) === providerSlug ? selectedProvider : null;
  const isProviderRouteLoading = mode === "provider-detail"
    && (isLoadingSelectedProvider || resolvedProviderSlug !== (providerSlug || ""));
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentReportSlug = reportSlug || pathParts[pathParts.length - 1];
  const selectedReport = useMemo(
    () => reports.find((report) => report.slug === currentReportSlug),
    [currentReportSlug, reports],
  );
  if (!isLoading && mode === "report-detail" && !selectedReport) {
    return <Navigate to="/astrology/astrology-reports" replace />;
  }

  if (!isLoading && !isProviderRouteLoading && mode === "provider-detail" && !activeProvider) {
    return <Navigate to="/astrology/astrologers" replace />;
  }

  return (
    <>
      <CustomerHeader />
      <main className="astrology-page">
        <AstrologyHero mode={mode} selectedReport={selectedReport} />
        {loadError ? <PageNotice message={loadError} /> : null}
        {providerLoadError && (mode === "astrologers" || mode === "talk") ? <PageNotice message={providerLoadError} /> : null}
        {isLoading ? <PageNotice message="Loading live astrology services..." /> : null}
        {!isLoading && mode === "provider-detail" && isProviderRouteLoading ? <PageNotice message="Loading astrologer profile..." /> : null}
        {!isLoading && mode === "provider-detail" && activeProvider ? (
          <AstrologerDetail provider={activeProvider} serviceOptions={serviceOptions} />
        ) : null}
        {!isLoading && mode === "astrologers" ? (
          <AstrologersDirectory
            providers={providers}
            serviceOptions={serviceOptions}
            page={providerPage}
            pageSize={providerPageSize}
            totalCount={providerTotalCount}
            isLoading={isLoadingProviders}
            onPageChange={setProviderPage}
          />
        ) : null}
        {!isLoading && mode === "talk" ? <TalkToAstrologer providers={providers} serviceOptions={serviceOptions} /> : null}
        {!isLoading && mode === "reports" ? <ReportsIndex reports={reports} /> : null}
        {!isLoading && mode === "ask" ? <AskQuestion serviceOptions={serviceOptions} /> : null}
        {!isLoading && mode === "report-detail" && selectedReport ? <ReportDetail report={selectedReport} /> : null}
        {!isLoading && mode === "home" ? <AstrologyOverview /> : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function AstrologyHero({ mode, selectedReport }: { mode: AstrologyPageMode; selectedReport?: AstrologyReport }) {
  return (
    <section className={`astrology-hero${mode === "provider-detail" ? " astrology-hero--profile" : ""}`}>
      <div className="astrology-container astrology-hero-grid">
        <div>
          <p className="astrology-kicker">Chao Desi Astrology</p>
          <h1>{selectedReport?.title || getModeTitle(mode)}</h1>
          <p>{mode === "provider-detail" ? "View verified provider details and request a personal consultation." : "Choose an astrologer, order a focused report, or ask a personal question from one place."}</p>
          <div className="astrology-hero-actions">
            <Link to="/astrology/talk-to-astrologer">Talk to Astrologer</Link>
            <Link to="/astrology/astrology-reports">View Reports</Link>
          </div>
        </div>
        <img src="/template-17/images/home/astro.png" alt="Astrology chart" />
      </div>
    </section>
  );
}

function PageNotice({ message }: { message: string }) {
  return (
    <section className="astrology-section">
      <div className="astrology-container">
        <div className="astrology-panel"><p>{message}</p></div>
      </div>
    </section>
  );
}

function AstrologyOverview() {
  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-card-grid">
        <FeatureCard title="Find Astrologers" copy="Browse approved advisors and submit an enquiry." href="/astrology/astrologers" />
        <FeatureCard title="Order Reports" copy="Choose a live report and enter birth details for review." href="/astrology/astrology-reports" />
        <FeatureCard title="Ask a Question" copy="Send one focused question and receive a personalized response." href="/astrology/ask-a-question" />
      </div>
    </section>
  );
}

function AstrologersDirectory({
  providers,
  serviceOptions,
  page,
  pageSize,
  totalCount,
  isLoading,
  onPageChange,
}: {
  providers: PublicAllServicePosting[];
  serviceOptions: string[];
  page: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-two-column">
        <div className="astrology-panel">
          <h2>Approved Astrologers</h2>
          <p>Profiles below come from approved service postings.</p>
          {isLoading ? (
            <p>Loading approved astrologers...</p>
          ) : providers.length ? (
            <div className="astrology-expert-list">
              {providers.map((provider) => (
                <article className="astrology-expert-card" key={provider.id}>
                  <div className="astrology-expert-summary">
                    {provider.businessImageUrl ? (
                      <img
                        className="astrology-expert-avatar"
                        src={provider.businessImageUrl}
                        alt=""
                      />
                    ) : (
                      <span className="astrology-expert-avatar" aria-hidden="true">
                        {provider.businessName.trim().charAt(0).toUpperCase() || "A"}
                      </span>
                    )}
                    <div className="astrology-expert-details">
                      <div className="astrology-expert-heading">
                        <h3>{provider.businessName}</h3>
                        <span
                          className="astrology-expert-approved"
                          aria-label="Approved astrologer"
                          title="Approved astrologer"
                        >
                          ✓
                        </span>
                      </div>
                      <p>{provider.tagline || provider.serviceName}</p>
                      <div className="astrology-expert-meta">
                        <span>{provider.experienceYears} years experience</span>
                        <span title={provider.primaryServiceLocation}>{provider.primaryServiceLocation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="astrology-expert-actions">
                    <div className="astrology-expert-rate">
                      <span>{provider.pricingPackages?.[0]?.priceText ? "Starting from" : "Service mode"}</span>
                      <strong>{getProviderRate(provider)}</strong>
                    </div>
                    <Link to={`/astrology/astrologers/${provider.id}`}>
                      View profile <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="astrology-form-success">
              <p>No approved astrologers are available yet.</p>
              <Link to="/dashboard/services/new">Post an astrology service</Link>
            </div>
          )}
          {!isLoading && totalCount > pageSize ? (
            <nav className="astrology-pagination" aria-label="Astrologer pages">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} · {totalCount} astrologers</span>
              <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
            </nav>
          ) : null}
        </div>
        <AstrologyRequestForm
          title="Request an astrologer callback"
          submitLabel="Send Enquiry"
          requestType="Consultation"
          providers={providers}
          serviceOptions={serviceOptions}
        />
      </div>
    </section>
  );
}

function AstrologerDetail({
  provider,
  serviceOptions,
}: {
  provider: PublicAllServicePosting;
  serviceOptions: string[];
}) {
  const services = provider.selectedServices?.length
    ? provider.selectedServices.map((service) => service.detailedCategoryName)
    : [provider.serviceName];
  const phoneNumber = `${provider.phoneCountryCode} ${provider.phoneNumber}`.trim();
  const phoneHref = `tel:${provider.phoneCountryCode}${provider.phoneNumber}`.replace(/\s/g, "");
  const initials = provider.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "A";

  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-profile-layout">
        <article className="astrology-profile-main">
          <nav className="astrology-crumb" aria-label="breadcrumb">
            <Link to="/astrology/astrologers"><span aria-hidden="true">←</span> All astrologers</Link>
            <b>/</b>
            <span>{provider.businessName}</span>
          </nav>
          <div className="astrology-profile-head">
            {provider.businessImageUrl ? (
              <img className="astrology-profile-avatar" src={provider.businessImageUrl} alt={provider.businessName} />
            ) : (
              <div className="astrology-profile-avatar" aria-hidden="true">{initials}</div>
            )}
            <div className="astrology-profile-intro">
              <div className="astrology-profile-badges">
                <span className="astrology-pill"><span aria-hidden="true">✓</span> Approved Astrologer</span>
                <span className="astrology-profile-type">{provider.providerType}</span>
              </div>
              <h2>{provider.businessName}</h2>
              <p>{provider.tagline || provider.serviceName}</p>
              <div className="astrology-profile-meta">
                <span><span className="material-icons" aria-hidden="true">work</span><span className="astrology-profile-meta-text">{provider.experienceYears} years experience</span></span>
                <span><span className="material-icons" aria-hidden="true">room_service</span><span className="astrology-profile-meta-text">{provider.workingMode}</span></span>
                <span><span className="material-icons" aria-hidden="true">location_on</span><span className="astrology-profile-meta-text">{provider.primaryServiceLocation}</span></span>
              </div>
              <a className="astrology-profile-enquiry-link" href="#astrology-profile-enquiry">Request a consultation <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <section className="astrology-profile-card">
            <header className="astrology-profile-section-head">
              <span className="material-icons" aria-hidden="true">star</span>
              <div><h3>Services offered</h3><p>Choose a service to explore related astrology options.</p></div>
            </header>
            <div className="astrology-service-chip-list">
              {services.map((service) => <Link to={buildAstrologyServiceHref(service)} key={service}>{service}</Link>)}
            </div>
          </section>
          <section className="astrology-profile-card">
            <header className="astrology-profile-section-head">
              <span className="material-icons" aria-hidden="true">person</span>
              <div><h3>About this astrologer</h3><p>Background and approach</p></div>
            </header>
            <p className="astrology-profile-about">{provider.description}</p>
          </section>
          <section className="astrology-profile-card">
            <header className="astrology-profile-section-head">
              <span className="material-icons" aria-hidden="true">event</span>
              <div><h3>Availability &amp; service area</h3><p>Helpful details before sending your enquiry.</p></div>
            </header>
            <div className="astrology-profile-facts">
              <div className="astrology-profile-fact">
                <span className="material-icons" aria-hidden="true">date_range</span>
                <div><small>Available days</small><strong>{provider.openDays?.length ? provider.openDays.join(", ") : "By appointment"}</strong></div>
              </div>
              <div className="astrology-profile-fact">
                <span className="material-icons" aria-hidden="true">room_service</span>
                <div><small>Consultation mode</small><strong>{provider.workingMode}</strong></div>
              </div>
              <div className="astrology-profile-fact astrology-profile-fact--wide">
                <span className="material-icons" aria-hidden="true">location_on</span>
                <div><small>Primary service area</small><strong>{provider.primaryServiceLocation}</strong></div>
              </div>
            </div>
          </section>
          {provider.pricingPackages?.length ? (
            <section className="astrology-profile-card">
              <header className="astrology-profile-section-head">
                <span className="material-icons" aria-hidden="true">payment</span>
                <div><h3>Consultation options</h3><p>Select the option that best matches your needs.</p></div>
              </header>
              <div className="astrology-profile-package-list">
                {provider.pricingPackages.map((item) => <span key={`${item.serviceName}-${item.priceText}`}>{item.serviceName} · {item.priceText}</span>)}
              </div>
            </section>
          ) : null}
        </article>
        <aside className="astrology-profile-side" id="astrology-profile-enquiry">
          <div className="astrology-contact-box">
            <span className="astrology-contact-kicker">Ready to connect?</span>
            <h3>Contact this astrologer</h3>
            <p>Call directly or send an enquiry using the form below.</p>
            <div className="astrology-contact-list">
              <div>
                <span className="material-icons" aria-hidden="true">call</span>
                <div><small>Phone</small><a href={phoneHref}>{phoneNumber}</a></div>
              </div>
              <div>
                <span className="material-icons" aria-hidden="true">mail</span>
                <div><small>Email</small>{provider.email ? <a href={`mailto:${provider.email}`}>{provider.email}</a> : <span>Phone enquiries accepted</span>}</div>
              </div>
            </div>
            <div className="astrology-contact-approved"><span aria-hidden="true">✓</span> Approved Chao Desi service provider</div>
          </div>
          <AstrologyRequestForm
            title="Send enquiry"
            submitLabel="Send Enquiry"
            requestType="Consultation"
            provider={provider}
            serviceOptions={serviceOptions}
          />
        </aside>
      </div>
    </section>
  );
}

function TalkToAstrologer({ providers, serviceOptions }: { providers: PublicAllServicePosting[]; serviceOptions: string[] }) {
  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-two-column">
        <div className="astrology-panel">
          <h2>Start a Consultation</h2>
          <p>Select a live service and an optional approved advisor. The request is saved even when an email address is not supplied.</p>
          <div className="astrology-option-list">
            {serviceOptions.slice(0, 8).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <AstrologyRequestForm
          title="Book a consultation"
          submitLabel="Request Slot"
          requestType="Consultation"
          includeTime
          providers={providers}
          serviceOptions={serviceOptions}
        />
      </div>
    </section>
  );
}

function ReportsIndex({ reports }: { reports: AstrologyReport[] }) {
  return (
    <section className="astrology-section">
      <div className="astrology-container">
        <div className="astrology-section-head"><h2>Astrology Reports</h2><p>Choose an active report managed by the Chao Desi team.</p></div>
        {reports.length ? (
          <div className="astrology-report-grid">{reports.map((report) => <ReportCard report={report} key={report.id} />)}</div>
        ) : (
          <div className="astrology-panel"><p>No astrology reports are currently available.</p></div>
        )}
      </div>
    </section>
  );
}

function ReportDetail({ report }: { report: AstrologyReport }) {
  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-two-column astrology-report-detail-layout">
        <article className="astrology-report-detail-card">
          <header className="astrology-report-detail-head">
            <span className="astrology-report-detail-icon" aria-hidden="true">
              <span className="material-icons">{getReportIcon(report.category)}</span>
            </span>
            <div>
              <span className="astrology-pill">{report.category}</span>
              <h2>{report.title}</h2>
              <p>{report.summary}</p>
            </div>
          </header>
          <div className="astrology-report-detail-body">
            <div className="astrology-report-includes-title">
              <span className="material-icons" aria-hidden="true">check_circle</span>
              <div><h3>What&apos;s included</h3><p>Your report will cover these key areas.</p></div>
            </div>
            <ul className="astrology-check-list">
              {report.features.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
            </ul>
          </div>
          <footer className="astrology-report-detail-footer">
            <div><small>Report price</small><strong>{formatPrice(report)}</strong></div>
            <div><small>Estimated delivery</small><span><span className="material-icons" aria-hidden="true">schedule</span>{report.deliveryText}</span></div>
          </footer>
        </article>
        <AstrologyRequestForm title="Order this report" submitLabel="Place Report Request" requestType="Report" report={report} />
      </div>
    </section>
  );
}

function AskQuestion({ serviceOptions }: { serviceOptions: string[] }) {
  return (
    <section className="astrology-section">
      <div className="astrology-container astrology-two-column">
        <div className="astrology-panel">
          <h2>Ask One Focused Question</h2>
          <p>Choose a live astrology service and submit your question with the relevant birth details.</p>
          <div className="astrology-option-list">{serviceOptions.slice(0, 8).map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <AstrologyRequestForm title="Submit your question" submitLabel="Ask Question" requestType="Question" serviceOptions={serviceOptions} />
      </div>
    </section>
  );
}

function FeatureCard({ title, copy, href }: { title: string; copy: string; href: string }) {
  return <Link className="astrology-feature-card" to={href}><h2>{title}</h2><p>{copy}</p><span>Open</span></Link>;
}

function ReportCard({ report }: { report: AstrologyReport }) {
  return (
    <article className="astrology-report-card">
      <span className="astrology-pill">{report.category}</span><h3>{report.title}</h3><p>{report.summary}</p>
      <div className="astrology-price-row"><strong>{formatPrice(report)}</strong><span>{report.deliveryText}</span></div>
      <Link to={`/astrology/${report.slug}`}>View Report</Link>
    </article>
  );
}

function AstrologyRequestForm({
  title,
  submitLabel,
  requestType,
  report,
  provider,
  providers = [],
  serviceOptions = [],
  includeTime = false,
}: {
  title: string;
  submitLabel: string;
  requestType: AstrologyRequestType;
  report?: AstrologyReport;
  provider?: PublicAllServicePosting;
  providers?: PublicAllServicePosting[];
  serviceOptions?: string[];
  includeTime?: boolean;
}) {
  const customerDefaults = useMemo(getCustomerContactDefaults, []);
  const isAuthenticated = isCustomerAuthenticated();
  const [submittedReference, setSubmittedReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [customerName, setCustomerName] = useState(customerDefaults.fullName);
  const [customerEmail, setCustomerEmail] = useState(customerDefaults.email);
  const [customerPhone, setCustomerPhone] = useState(customerDefaults.mobileNumber);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await submitAstrologyRequest({
        requestType,
        reportId: report?.id,
        providerPostingId: provider?.id || optionalNumber(data.get("providerPostingId")),
        service: report?.title || optionalText(data.get("service")),
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        birthDate: optionalText(data.get("birthDate")),
        birthTime: optionalText(data.get("birthTime")),
        birthPlace: optionalText(data.get("birthPlace")),
        preferredTime: optionalText(data.get("preferredTime")),
        message: optionalText(data.get("message")),
      });
      setSubmittedReference(response.referenceNumber);
      form.reset();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedReference) {
    return (
      <div className="astrology-form astrology-form-success">
        <i className="material-icons" aria-hidden="true">check_circle</i>
        <h2>Request received</h2>
        <p>Your request was saved successfully. Reference: <strong>{submittedReference}</strong></p>
        <button type="button" onClick={() => setSubmittedReference("")}>Submit another request</button>
      </div>
    );
  }

  return (
    <form className="astrology-form" onSubmit={submitForm}>
      <h2>{title}</h2>
      {report ? <input name="report" readOnly value={report.title} /> : null}
      {provider ? <input name="provider" readOnly value={provider.businessName} /> : null}
      {!report && serviceOptions.length ? (
        <label>Service<select name="service" required defaultValue=""><option value="" disabled>Select service</option>{serviceOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
      ) : null}
      {!provider && providers.length ? (
        <label>Preferred astrologer (optional)<select name="providerPostingId" defaultValue=""><option value="">Any approved astrologer</option>{providers.map((item) => <option value={item.id} key={item.id}>{item.businessName}</option>)}</select></label>
      ) : null}
      <label>Name<input name="name" placeholder="Your name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
      <label>
        Email
        <input
          name="email"
          placeholder="you@example.com"
          type="email"
          required
          readOnly={isAuthenticated}
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
        />
      </label>
      <label>
        Phone
        <PhoneNumberInput name="phone" value={customerPhone} onChange={setCustomerPhone} placeholder="Contact number" required />
      </label>
      <div className="astrology-form-grid">
        <label>Birth date<input name="birthDate" type="date" /></label>
        <label>Birth time<input name="birthTime" type="time" /></label>
      </div>
      <label>Birth place<input name="birthPlace" placeholder="City, country" /></label>
      {includeTime ? <label>Preferred consultation time<input name="preferredTime" type="datetime-local" /></label> : null}
      <label>{requestType === "Question" ? "Your question" : "Notes"}<textarea name="message" placeholder="Add any context that helps the astrologer respond." rows={4} required={requestType === "Question"} /></label>
      {errorMessage ? <p className="astrology-form-error" role="alert">{errorMessage}</p> : null}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : submitLabel}</button>
    </form>
  );
}

function buildAstrologyServiceOptions(categories: AllServiceCategoryOption[]) {
  const category = categories.find((item) => item.slug === "astrology-services");
  if (!category) return [];

  return Array.from(new Set(category.subCategories.flatMap((subCategory) =>
    subCategory.detailedCategories.length
      ? subCategory.detailedCategories.map((detail) => detail.name)
      : [subCategory.name],
  )));
}

function getModeTitle(mode: AstrologyPageMode) {
  if (mode === "astrologers" || mode === "provider-detail") return "Find an Astrologer";
  if (mode === "talk") return "Talk to Astrologer";
  if (mode === "reports" || mode === "report-detail") return "Astrology Reports";
  if (mode === "ask") return "Ask an Astrology Question";
  return "Astrology Services";
}

function buildAstrologyServiceHref(service: string) {
  const params = new URLSearchParams({ category: "Astrology Services", service });
  return `/all-services-detailed?${params.toString()}`;
}

function getProviderRate(provider: PublicAllServicePosting) {
  return provider.pricingPackages?.[0]?.priceText || provider.workingMode;
}

function formatPrice(report: AstrologyReport) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: report.currency || "USD" }).format(report.price);
}

function getReportIcon(category: string) {
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory.includes("love") || normalizedCategory.includes("relationship") || normalizedCategory.includes("marriage")) return "favorite";
  if (normalizedCategory.includes("career") || normalizedCategory.includes("job") || normalizedCategory.includes("business")) return "work";
  if (normalizedCategory.includes("finance") || normalizedCategory.includes("money")) return "account_balance";
  if (normalizedCategory.includes("year") || normalizedCategory.includes("future")) return "date_range";
  if (normalizedCategory.includes("health")) return "favorite_border";
  return "star";
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || "Unable to submit the astrology request.";
  }
  return "Unable to submit the astrology request.";
}
