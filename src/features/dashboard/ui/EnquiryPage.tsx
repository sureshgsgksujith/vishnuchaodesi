import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyRequirementEnquiries,
  type RequirementEnquiry,
} from "../../listing/api/requirementsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/enquiry.css";

type EnquiryTab = "all" | "listing" | "product" | "job" | "blog" | "event";

const enquiryTabs: Array<{ key: EnquiryTab; label: string }> = [
  { key: "all", label: "All Leads" },
  { key: "listing", label: "Listing" },
  { key: "product", label: "Product" },
  { key: "job", label: "Job" },
  { key: "blog", label: "Blog" },
  { key: "event", label: "Events" },
];

export default function EnquiryPage() {
  const [activeTab, setActiveTab] = useState<EnquiryTab>("all");
  const [enquiries, setEnquiries] = useState<RequirementEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setErrorMessage("");

    getMyRequirementEnquiries()
      .then((items) => {
        if (isActive) {
          setEnquiries(items || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setEnquiries([]);
          setErrorMessage("Unable to load enquiry details right now.");
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

  const counts = useMemo(() => {
    return enquiryTabs.reduce<Record<EnquiryTab, number>>((result, tab) => {
      result[tab.key] = tab.key === "all"
        ? enquiries.length
        : enquiries.filter((item) => getLeadTypeKey(item) === tab.key).length;
      return result;
    }, { all: 0, listing: 0, product: 0, job: 0, blog: 0, event: 0 });
  }, [enquiries]);

  const filteredEnquiries = useMemo(() => {
    if (activeTab === "all") {
      return enquiries;
    }

    return enquiries.filter((item) => getLeadTypeKey(item) === activeTab);
  }, [activeTab, enquiries]);

  return (
    <DashboardLayout
      mainContentClassName="ud-no-rhs customer-enquiry-main"
      showBottomCta={false}
    >
      <div className="ud-cen customer-enquiry-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Leads</span>

        <section className="customer-enquiry-summary" aria-label="Lead summary">
          {enquiryTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`customer-enquiry-summary-card${activeTab === tab.key ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <strong>{counts[tab.key]}</strong>
            </button>
          ))}
        </section>

        <section className="customer-enquiry-panel">
          <div className="customer-enquiry-panel-head">
            <div>
              <h1>{enquiryTabs.find((tab) => tab.key === activeTab)?.label || "All Leads"}</h1>
              <p>Customer quote requests and enquiry messages for your listings.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="customer-enquiry-state">Loading enquiry details...</div>
          ) : errorMessage ? (
            <div className="customer-enquiry-state is-error">{errorMessage}</div>
          ) : filteredEnquiries.length ? (
            <div className="customer-enquiry-list">
              {filteredEnquiries.map((enquiry, index) => (
                <EnquiryCard
                  key={enquiry.id}
                  enquiry={enquiry}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="customer-enquiry-state">No enquiries found for this section.</div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function EnquiryCard({
  enquiry,
  index,
}: {
  enquiry: RequirementEnquiry;
  index: number;
}) {
  const title = enquiry.listingTitle || enquiry.categoryName || "Customer enquiry";
  const location = [enquiry.locality, enquiry.city].filter(Boolean).join(", ");
  const categoryLine = [
    enquiry.listingCategoryName || enquiry.categoryName,
    enquiry.listingSubCategory,
    enquiry.listingDetailCategory,
  ].filter(Boolean).join(" / ");
  const imageUrl = resolveListingImageUrl(enquiry.listingImageUrl);
  const leadType = getLeadTypeLabel(enquiry);
  const nameParts = splitFullName(enquiry.customerName);

  return (
    <article className="customer-enquiry-card">
      <div className="customer-enquiry-image">
        <img src={imageUrl} alt={title} loading="lazy" onError={setFallbackListingImage} />
      </div>

      <div className="customer-enquiry-content">
        <div className="customer-enquiry-title-row">
          <div>
            <span className="customer-enquiry-number">Lead #{index + 1}</span>
            <h2>{title}</h2>
          </div>
          <span className="customer-enquiry-badge">{leadType}</span>
        </div>

        <div className="customer-enquiry-meta">
          <span>{formatDate(enquiry.createdAt)}</span>
          {categoryLine ? <span>{categoryLine}</span> : null}
          {location ? <span>{location}</span> : null}
        </div>

        <div className="customer-enquiry-contact-grid">
          <ContactItem label="First Name" value={nameParts.firstName} />
          <ContactItem label="Middle Name" value={nameParts.middleName} />
          <ContactItem label="Last Name" value={nameParts.lastName} />
          <ContactItem label="Mobile Number" value={enquiry.customerPhone} href={`tel:${enquiry.customerPhone}`} />
          <ContactItem label="Email" value={enquiry.customerEmail} href={`mailto:${enquiry.customerEmail}`} />
        </div>

        <div className="customer-enquiry-message">
          <span>Message</span>
          <p>{enquiry.message || "N/A"}</p>
        </div>

        <div className="customer-enquiry-actions">
          {enquiry.listingId ? (
            <Link to={`/listing-details?id=${enquiry.listingId}`}>View listing</Link>
          ) : null}
          {enquiry.pageUrl ? (
            <a href={enquiry.pageUrl} target="_blank" rel="noreferrer">Open enquiry page</a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function splitFullName(value?: string | null) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function ContactItem({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  const displayValue = value?.trim() || "N/A";

  return (
    <div className="customer-enquiry-contact-item">
      <span>{label}</span>
      {href && value?.trim() ? <a href={href}>{displayValue}</a> : <strong>{displayValue}</strong>}
    </div>
  );
}

function getLeadTypeKey(enquiry: RequirementEnquiry): EnquiryTab {
  const text = [
    enquiry.leadType,
    enquiry.listingCategoryName,
    enquiry.listingSubCategory,
    enquiry.listingDetailCategory,
    enquiry.categoryName,
    enquiry.pageUrl,
  ].filter(Boolean).join(" ").toLowerCase();

  if (containsAny(text, ["event", "ticket"])) return "event";
  if (containsAny(text, ["job", "career", "hiring"])) return "job";
  if (containsAny(text, ["blog", "article", "news"])) return "blog";
  if (containsAny(text, ["product", "electronics", "appliance", "furniture", "fashion", "book", "sports", "vehicle", "sale"])) return "product";
  return "listing";
}

function getLeadTypeLabel(enquiry: RequirementEnquiry) {
  const key = getLeadTypeKey(enquiry);
  if (key === "event") return "Event";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function formatDate(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
