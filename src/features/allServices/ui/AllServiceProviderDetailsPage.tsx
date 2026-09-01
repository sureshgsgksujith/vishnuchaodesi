import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { submitRequirement } from "../../listing/api/requirementsApi";
import { getCustomerContactDefaults } from "../../auth/utils/customerSession";
import { getPublicAllServicePosting, type PublicAllServicePosting } from "../api/allServicePostingsApi";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
import "../styles/allServices.css";

type EnquiryForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

function createInitialForm(): EnquiryForm {
  const customer = getCustomerContactDefaults();

  return {
    name: customer.fullName,
    email: customer.email,
    phone: customer.mobileNumber,
    message: "",
  };
}

const reviewNames = ["Ravi Kumar", "Meena Shah", "Arun Patel"];

export default function AllServiceProviderDetailsPage() {
  const { postingId } = useParams();
  const [searchParams] = useSearchParams();
  const id = Number(postingId || searchParams.get("id") || 0);
  const requestedServiceName = cleanQueryText(searchParams.get("service"));
  const [posting, setPosting] = useState<PublicAllServicePosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError("");

    if (!id) {
      setError("Service provider not found.");
      setIsLoading(false);
      return;
    }

    getPublicAllServicePosting(id)
      .then((item) => {
        if (!isActive) return;
        setPosting(item);
        setForm((current) => ({
          ...current,
          message: `I am interested in ${requestedServiceName || item.serviceName}. Please contact me with details.`,
        }));
      })
      .catch(() => {
        if (!isActive) return;
        setError("Unable to load service provider details.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id, requestedServiceName]);

  const serviceNames = useMemo(() => getServiceNames(posting, requestedServiceName), [posting, requestedServiceName]);
  const primaryLocation = useMemo(() => getPrimaryLocation(posting), [posting]);
  const rating = useMemo(() => getRating(posting?.id || 0), [posting?.id]);
  const reviewCount = useMemo(() => 48 + ((posting?.id || 0) % 85), [posting?.id]);
  const pricingPackages = useMemo(() => getPricingPackages(posting), [posting]);

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!posting || isSubmitting) return;

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setFormMessage("Enter name, email and phone number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setFormMessage("");

    try {
      await submitRequirement({
        listingTitle: posting.businessName,
        name: form.name.trim(),
        email: form.email.trim(),
        mobileNumber: form.phone.trim(),
        message: form.message.trim(),
        categoryName: posting.allServiceCategoryName,
        city: primaryLocation.city || posting.primaryServiceLocation,
        desiredServices: serviceNames,
        matchingProviderIds: [posting.id],
        pageUrl: window.location.href,
      });
      setFormMessage("Your enquiry has been sent. The provider will contact you shortly.");
      setForm(createInitialForm());
    } catch {
      setFormMessage("Unable to send enquiry right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <CustomerHeader />
        <main className="service-profile-loading">
          <span className="all-services-location-spinner" aria-hidden="true"></span>
          Loading service details...
        </main>
      </>
    );
  }

  if (error || !posting) {
    return (
      <>
        <CustomerHeader />
        <main className="service-profile-loading">
          <p>{error || "Service provider not found."}</p>
          <Link to="/all-services">Back to all services</Link>
        </main>
      </>
    );
  }

  const displayServiceName = requestedServiceName || posting.serviceName;

  return (
    <>
      <CustomerHeader />
      <main className="service-profile-page">
        <nav className="service-profile-tabs" aria-label="Service details sections">
          <a href="#overview"><i className="material-icons">person</i> Overview</a>
          <a href="#features"><i className="material-icons">check_circle</i> Features</a>
          <a href="#pricing"><i className="material-icons">style</i> Pricing</a>
          <a href="#location"><i className="material-icons">map</i> Location</a>
          <a href="#contact"><i className="material-icons">mail</i> Contact</a>
          <a href="#reviews"><i className="material-icons">star_half</i> Reviews</a>
          <a href="#faq"><i className="material-icons">help</i> FAQ</a>
        </nav>

        <section className="service-profile-hero">
          <div className="service-profile-container service-profile-hero-grid">
            <div>
              <nav className="service-profile-crumb" aria-label="breadcrumb">
                <Link to="/home">Home</Link>
                <span>/</span>
                <Link to="/local-services">Local Services</Link>
                <span>/</span>
                <Link to={`/all-services-detailed?service=${encodeURIComponent(displayServiceName)}&detail=${encodeURIComponent(displayServiceName)}&category=${encodeURIComponent(posting.allServiceCategoryName)}`}>
                  {posting.allServiceCategoryName}
                </Link>
                <span>/</span>
                <b>{posting.businessName}</b>
              </nav>
              <h1>{posting.businessName}</h1>
              <p>{posting.tagline || posting.description}</p>
              <div className="service-profile-meta">
                <span><i className="material-icons">category</i>{posting.allServiceCategoryName}</span>
                <span><i className="material-icons">location_on</i>{formatShortLocation(primaryLocation, posting.primaryServiceLocation)}</span>
                <span><i className="material-icons">star</i>{rating} ({reviewCount} reviews)</span>
                <span><i className="material-icons">verified_user</i>Verified provider</span>
              </div>
              <div className="service-profile-actions">
                <a href="#contact">Get a free quote</a>
                <a href={`tel:${posting.phoneCountryCode}${posting.phoneNumber}`} className="ghost"><i className="material-icons">call</i> Call now</a>
              </div>
            </div>
            <aside className="service-profile-photo-card" aria-label={`${posting.businessName} service image`}>
              {posting.businessImageUrl ? (
                <img src={posting.businessImageUrl} alt={posting.businessName} />
              ) : (
                <div>{getProviderInitial(posting.businessName)}</div>
              )}
              <span>{displayServiceName}</span>
            </aside>
          </div>
        </section>

        <section className="service-profile-body service-profile-container">
          <div className="service-profile-main">
            <ServicePanel id="overview" eyebrow="About" title="This Service">
              <p>{posting.description}</p>
              <p>{posting.businessName} helps customers with {displayServiceName} requests across {formatShortLocation(primaryLocation, posting.primaryServiceLocation)}. The listing is verified and includes direct contact details for faster response.</p>
              <div className="service-profile-highlights">
                {["Verified contact", "Flexible scheduling", "Multiple service areas", "Transparent communication", "Community focused"].map((item) => (
                  <span key={item}><i className="material-icons">check_circle</i>{item}</span>
                ))}
              </div>
            </ServicePanel>

            <ServicePanel eyebrow="Service" title="Information">
              <ul className="service-profile-info-list">
                <li>Service category <span>{posting.allServiceCategoryName}</span></li>
                <li>Primary service <span>{displayServiceName}</span></li>
                <li>Provider type <span>{posting.providerType}</span></li>
                <li>Working mode <span>{posting.workingMode}</span></li>
                <li>Experience <span>{posting.experienceYears}+ years</span></li>
                <li>Availability <span>{posting.workingMode?.toLowerCase() === "unavailable" ? "Temporarily unavailable" : (posting.openDays?.join(", ") || "Mon - Sat")}</span></li>
                <li>Package <span>{posting.packageCode || "Standard"}</span></li>
                <li>Phone verified <span>{posting.status === "Approved" ? "Yes" : "Pending"}</span></li>
              </ul>
            </ServicePanel>

            <ServicePanel id="features" eyebrow="Features" title="Amenities">
              <div className="service-profile-feature-grid">
                {serviceNames.slice(0, 6).map((service) => (
                  <Link
                    className="service-profile-feature-link"
                    to={buildServiceDetailHref(service, posting.allServiceCategoryName)}
                    key={service}
                  >
                    <i className="material-icons">done_all</i>
                    <h4>{service}</h4>
                    <p>Available through this provider.</p>
                  </Link>
                ))}
              </div>
            </ServicePanel>

            <ServicePanel id="pricing" eyebrow="Pricing" title="Packages">
              <div className="service-profile-pricing">
                {pricingPackages.map((item, index) => (
                  <div className={index === 1 ? "popular" : ""} key={`${item.serviceName}-${index}`}>
                    {index === 1 ? <span>Popular</span> : null}
                    <h4>{item.serviceName}</h4>
                    <b>{item.priceText}</b>
                    <p>{item.description || "Available through this provider."}</p>
                    <a href="#contact">Choose plan</a>
                  </div>
                ))}
              </div>
            </ServicePanel>

            <ServicePanel id="location" eyebrow="Location" title="Service Areas">
              <div className="service-profile-location-box">
                <i className="material-icons">location_on</i>
                <div>
                  <h4>{formatShortLocation(primaryLocation, posting.primaryServiceLocation)}</h4>
                  <p>{posting.primaryServiceLocation}</p>
                  {posting.serviceLocations?.length ? (
                    <ul>
                      {posting.serviceLocations.slice(0, 4).map((location, index) => (
                        <li key={`${location.formattedAddress}-${index}`}>{location.formattedAddress || `${location.city || ""} ${location.state || ""}`}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </ServicePanel>

            <ServicePanel id="reviews" eyebrow="Reviews" title="Ratings">
              <div className="service-profile-review-summary">
                <b>{rating}</b>
                <span>average based on {reviewCount} reviews</span>
              </div>
              <div className="service-profile-reviews">
                {reviewNames.map((name) => (
                  <article key={name}>
                    <strong>{name}</strong>
                    <span>{"star ".repeat(5).trim()}</span>
                  <p>{posting.businessName} responded clearly and helped with our {displayServiceName.toLowerCase()} requirement.</p>
                  </article>
                ))}
              </div>
            </ServicePanel>

            <ServicePanel id="faq" eyebrow="FAQ" title="Questions">
              <div className="service-profile-faq">
                <details open>
                  <summary>How do I contact this provider?</summary>
                  <p>Use the enquiry form or call the listed phone number. Your request will be sent with the selected service details.</p>
                </details>
                <details>
                  <summary>Are prices fixed?</summary>
                  <p>Pricing depends on the exact service, schedule and location. Request a quote to confirm pricing.</p>
                </details>
                <details>
                  <summary>Can I request multiple services?</summary>
                  <p>Yes. Mention all services in the enquiry message and the provider can respond with options.</p>
                </details>
              </div>
            </ServicePanel>
          </div>

          <aside className="service-profile-side">
            <div className="service-profile-contact-card" id="contact">
              <h3>Contact Provider</h3>
              <p>Send your requirement to {posting.businessName}.</p>
              <div className="service-profile-contact-lines">
                <span><i className="material-icons">phone</i>{posting.phoneCountryCode} {posting.phoneNumber}</span>
                <span><i className="material-icons">email</i>{posting.email}</span>
                <span><i className="material-icons">location_on</i>{formatShortLocation(primaryLocation, posting.primaryServiceLocation)}</span>
              </div>
              <form onSubmit={submitEnquiry}>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter name *" />
                <input type="email" value={form.email} placeholder="Email address *" required readOnly />
                <PhoneNumberInput value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} placeholder="Mobile number *" required />
                <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Tell us what you need" rows={4} />
                {formMessage ? <p className="service-profile-form-message">{formMessage}</p> : null}
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send enquiry"}</button>
              </form>
            </div>
          </aside>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function ServicePanel({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="service-profile-panel" id={id}>
      <h2><span>{eyebrow}</span> {title}</h2>
      {children}
    </section>
  );
}

function getServiceNames(posting: PublicAllServicePosting | null, requestedServiceName = "") {
  if (!posting) return [];
  const names = posting.selectedServices?.map((service) => service.detailedCategoryName).filter(Boolean) || [];
  return Array.from(new Set([requestedServiceName, posting.serviceName, ...names])).filter(Boolean);
}

function getPricingPackages(posting: PublicAllServicePosting | null) {
  const customPackages = (posting?.pricingPackages || [])
    .map((item) => ({
      serviceName: item.serviceName?.trim() || "",
      priceText: item.priceText?.trim() || "",
      description: item.description?.trim() || "",
    }))
    .filter((item) => item.serviceName && item.priceText);

  if (customPackages.length) {
    return customPackages;
  }

  return [
    { serviceName: "Basic Enquiry", priceText: "Quote based", description: "Share your requirement and receive provider response." },
    { serviceName: "Priority Consultation", priceText: "$49+", description: "Faster scheduling for time-sensitive requests." },
    { serviceName: "Complete Service", priceText: "$119+", description: "Detailed assistance based on selected service needs." },
  ];
}

function getPrimaryLocation(posting: PublicAllServicePosting | null) {
  const primary = posting?.serviceLocations?.find((location) => location.isPrimary) || posting?.serviceLocations?.[0];
  return primary || {};
}

function formatShortLocation(location: ReturnType<typeof getPrimaryLocation>, fallback: string) {
  const city = location.city || "";
  const state = location.state || "";
  return [city, state].filter(Boolean).join(", ") || fallback;
}

function buildServiceDetailHref(serviceName: string, categoryName: string) {
  const params = new URLSearchParams({
    service: serviceName,
    detail: buildSlug(serviceName),
    category: categoryName,
  });

  return `/all-services-detailed?${params.toString()}`;
}

function getProviderInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}

function getRating(id: number) {
  return (4.3 + ((id % 7) / 10)).toFixed(1);
}

function cleanQueryText(value: string | null) {
  return decodeURIComponent(value || "").replace(/\+/g, " ").trim();
}

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
