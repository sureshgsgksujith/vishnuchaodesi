import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getListing, getListingApiErrorMessage, type ListingSummary } from "../api/listingsApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../utils/listingImages";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/listings.css";

type PreviewValue = string | number | boolean | string[] | null | undefined;
type PreviewRecord = Record<string, PreviewValue>;
type PreviewSection = {
  title: string;
  fields: Array<{ label: string; value: PreviewValue; format?: (value: PreviewValue) => string }>;
};
const nearbyServicesAttributeKey = "nearby_services";
const nearbyServiceTypes = ["Schools", "Groceries", "Hospitals", "Beauty Salons", "Restaurants", "Lawyers"];

export default function ListingPreviewPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(listingId);

    if (!Number.isFinite(id)) {
      setErrorMessage("Listing not found.");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);

    getListing(id)
      .then((result) => {
        if (!isActive) return;
        setListing(result);
        setErrorMessage("");
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getListingApiErrorMessage(error));
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
  }, [listingId]);

  return (
    <>
      <UserHomeHeader />
      <section className="listing-preview-page">
        <div className="container">
          {isLoading ? <div className="alert alert-info">Loading listing...</div> : null}
          {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
          {listing ? <ListingPreview listing={listing} /> : null}
        </div>
      </section>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}

function ListingPreview({ listing }: { listing: ListingSummary }) {
  const imageUrls = listing.imageUrls?.length ? listing.imageUrls : [listing.primaryImageUrl || ""];
  const categoryPath = [listing.categoryName, listing.subCategory, listing.detailCategory].filter(Boolean).join(" / ");
  const location = [
    listing.locality || stringFromRecord(listing.locationDetails, "locality"),
    listing.city || stringFromRecord(listing.locationDetails, "city"),
  ].filter(Boolean).join(", ");
  const country = stringFromRecord(listing.locationDetails, "country");
  const price = listing.price ?? numberFromRecord(listing.priceDetails, "price");
  const planExpiryDate = formatExpiryDate(listing.userPlanExpiryDate);
  const sections = getPreviewSections(listing);
  const primaryFacts = [
    { label: "Price", value: formatPrice(price, country) },
    { label: "Selected Plan", value: listing.userPlanName || "Free" },
    { label: "Expiry Date", value: planExpiryDate },
    { label: "Location", value: location || "Not set" },
    { label: "Latest", value: formatDate(getLatestListingDate(listing)) },
  ];

  return (
    <article className="listing-preview listing-preview-admin-style">
      <div className="listing-preview-header">
        <div>
          <span>Listing Preview</span>
          <h1>{listing.title}</h1>
          <p>{categoryPath || "Listing"}</p>
        </div>
        <div className="listing-preview-actions">
          <Link to={getEditPath(listing)} className="btn btn-primary">Edit</Link>
          <Link to="/dashboard/all-listing" className="btn btn-primary">All listings</Link>
        </div>
      </div>

      <div className="listing-preview-summary">
        <div className="listing-preview-media">
          <img
            src={resolveListingImageUrl(imageUrls[0])}
            alt={listing.title}
            onError={setFallbackListingImage}
          />
          <span className={`listing-preview-status ${getStatusClassName(listing.status)}`}>{listing.status}</span>
        </div>

        <div className="listing-preview-body">
          <div className="listing-preview-title-row">
            <div>
              <p className="listing-preview-category">{categoryPath}</p>
              <h2>{listing.title}</h2>
            </div>
            <strong>{formatPrice(price, country)}</strong>
          </div>

          {listing.description ? <p className="listing-preview-description">{listing.description}</p> : null}

          <div className="listing-preview-facts">
            {primaryFacts.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <div>
              <span>Views</span>
              <strong>{listing.views}</strong>
            </div>
            <div>
              <span>Rating</span>
              <strong>{listing.rating}</strong>
            </div>
            <div>
              <span>Reject count</span>
              <strong>{listing.rejectionCount || 0} / 3</strong>
            </div>
            {listing.rejectionReason ? (
              <div className="listing-preview-fact-wide">
                <span>Last reason</span>
                <strong>{listing.rejectionReason}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="listing-preview-section-grid">
        {sections.map((section) => (
          <PreviewSectionCard section={section} key={section.title} />
        ))}
      </div>

      {imageUrls.length > 1 ? (
        <div className="listing-preview-section-card listing-preview-media-section">
          <div className="listing-preview-section-head">
            <span>Media</span>
            <h3>Gallery Images</h3>
          </div>
          <div className="listing-preview-gallery">
            {imageUrls.slice(1).map((imageUrl, index) => (
              <img
                key={`${imageUrl}-${index}`}
                src={resolveListingImageUrl(imageUrl)}
                alt=""
                onError={setFallbackListingImage}
              />
            ))}
          </div>
        </div>
      ) : null}

      {listing.videoUrl ? (
        <div className="listing-preview-section-card listing-preview-media-section">
          <div className="listing-preview-section-head">
            <span>Media</span>
            <h3>Listing Video</h3>
          </div>
          <div className="listing-preview-video">
            {isEmbeddableMarkup(listing.videoUrl) ? (
              <div dangerouslySetInnerHTML={{ __html: listing.videoUrl }} />
            ) : (
              <video src={listing.videoUrl} controls />
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function PreviewSectionCard({ section }: { section: PreviewSection }) {
  const fields = section.fields.filter((field) => hasPreviewValue(field.value, field.format));

  if (!fields.length) {
    return null;
  }

  return (
    <section className="listing-preview-section-card">
      <div className="listing-preview-section-head">
        <span>{section.title.slice(0, 1)}</span>
        <h3>{section.title}</h3>
      </div>
      <div className="listing-preview-section-fields">
        {fields.map((field) => (
          <PreviewField key={`${section.title}-${field.label}`} field={field} />
        ))}
      </div>
    </section>
  );
}

function PreviewField({ field }: { field: PreviewSection["fields"][number] }) {
  const imageUrls = getPreviewImageUrls(field.value);

  if (imageUrls.length) {
    return (
      <div className="listing-preview-field listing-preview-image-field">
        <span>{field.label}</span>
        <div className="listing-preview-inline-images">
          {imageUrls.map((imageUrl) => (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={field.label}
              onError={setFallbackListingImage}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="listing-preview-field">
      <span>{field.label}</span>
      <strong>{getPreviewDisplayValue(field.value, field.format)}</strong>
    </div>
  );
}

function isEmbeddableMarkup(value: string) {
  return /<iframe[\s>]/i.test(value);
}

function getPreviewSections(listing: ListingSummary): PreviewSection[] {
  const isRealEstate = isRealEstateListing(listing);

  return [
    {
      title: "Basic Information",
      fields: [
        { label: "Listing ID", value: listing.id },
        { label: "User ID", value: listing.userId },
        { label: "Selected Plan", value: listing.userPlanName || "Free" },
        { label: "Plan Expiry Date", value: formatExpiryDate(listing.userPlanExpiryDate) },
        { label: "Category", value: listing.categoryName },
        { label: "Sub Category", value: listing.subCategory },
        { label: "Detailed Category", value: listing.detailCategory },
        { label: "Status", value: listing.status },
        { label: "Created Date", value: formatDate(listing.createdAt) },
        { label: "Updated Date", value: formatDate(listing.updatedAt) },
        { label: "Views", value: listing.views },
        { label: "Rating", value: listing.rating },
        { label: "Average Rating", value: listing.averageRating },
        { label: "Total Reviews", value: listing.totalReviews },
        { label: "Can Edit", value: listing.canEdit },
        { label: "Reject Count", value: listing.rejectionCount },
        { label: "Last Rejection Reason", value: listing.rejectionReason },
        { label: "Last Rejected Date", value: formatDate(listing.lastRejectedAt) },
      ],
    },
    ...(isRealEstate
      ? getRealEstatePreviewSections(listing)
      : [
          buildRecordSection("Property / Custom Details", listing.propertyDetails, ["listingKind", "propertyType", "businessDescription", "otherInformation"]),
          buildRecordSection("Price Details", listing.priceDetails, ["price", "priceNegotiable", "maintenanceCharges", "securityDeposit", "pricePerSqFt", "loanEligible"]),
        ]),
    buildRecordSection("Location Details", listing.locationDetails, ["country", "state", "city", "locality", "pincode", "latitude", "longitude", "landmark"]),
    ...(isRealEstate ? [] : [
      buildRecordSection("Seller Information", listing.sellerInformation, ["name", "mobileNumber", "email", "whatsAppNumber", "websiteUrl", "sellerType", "isMobileOtpVerified"]),
      buildRecordSection("Settings", listing.settings, ["adType", "adDurationDays", "autoRenew", "verifiedByAdmin", "metaTitle", "metaDescription"]),
      buildRecordSection("Amenities", listing.amenities, ["parking", "lift", "powerBackup", "security", "gym", "cctv", "swimmingPool", "garden", "childrensPlayArea"]),
    ]),
    buildRecordSection("Restaurant / Food Details", listing.restaurantFoodDetails),
    buildRecordSection("Vehicle Details", listing.vehicleDetails),
    buildRecordSection("Electronics Details", listing.electronicsDetails),
    buildRecordSection("Care Service Details", listing.careServiceDetails),
    {
      title: "Media",
      fields: [
        { label: "Primary Image", value: listing.primaryImageUrl },
        { label: "Logo", value: listing.logoUrl },
        { label: "Cover Banner", value: listing.coverBannerUrl },
        { label: "Video URL", value: listing.videoUrl },
        { label: "Virtual Tour URL", value: listing.virtualTourUrl },
      ],
    },
  ];
}

function buildRecordSection(title: string, record?: PreviewRecord, preferredKeys?: string[], preferredOnly = false): PreviewSection {
  if (!record) {
    return { title, fields: [] };
  }

  const keys = preferredKeys?.length
    ? preferredOnly
      ? preferredKeys
      : uniqueStrings([...preferredKeys, ...Object.keys(record)])
    : Object.keys(record);

  return {
    title,
    fields: keys.map((key) => ({
      label: toTitleLabel(key),
      value: key === "otherInformation" ? formatOtherInformation(record[key]) : record[key],
    })),
  };
}

function formatOtherInformation(value: PreviewValue) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return value;
    }

    const record = parsed as Record<string, unknown>;
    const customFields = record.customFields && typeof record.customFields === "object" && !Array.isArray(record.customFields)
      ? record.customFields as Record<string, unknown>
      : {};

    return Object.entries(customFields)
      .map(([key, fieldValue]) => `${toTitleLabel(key)}: ${formatPreviewValue(fieldValue as PreviewValue)}`)
      .join(", ");
  } catch {
    return value;
  }
}

function getRealEstatePreviewSections(listing: ListingSummary): PreviewSection[] {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const amenities = listing.amenities || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};
  const categoryAttributes = parseOtherInformationCategoryAttributes(listing.propertyDetails?.otherInformation);
  const nearbyServices = buildNearbyServicesSection(listing);
  const usedAttributeKeys = new Set<string>([nearbyServicesAttributeKey]);
  const country = stringFromRecord(listing.locationDetails, "country");
  const attr = (key: string) => {
    usedAttributeKeys.add(key);
    return categoryAttributes[key];
  };
  const attrDate = (key: string) => {
    usedAttributeKeys.add(key);
    return formatDate(String(categoryAttributes[key] || ""));
  };
  const sections = [
    realEstatePreviewSection("Pricing", [
      { label: "Price Type", value: attr("price_type") },
      { label: "Price", value: priceDetails.price, format: formatMoneyPreview(country) },
      { label: "Security Deposit", value: priceDetails.securityDeposit, format: formatMoneyPreview(country) },
      { label: "HOA Fees", value: attr("hoa_fees"), format: formatMoneyPreview(country) },
      { label: "Property Tax", value: attr("property_tax"), format: formatMoneyPreview(country) },
      { label: "Price Negotiable", value: attr("price_negotiable") },
    ]),
    realEstatePreviewSection("Property Details", [
      { label: "Property Type", value: attr("property_type_group") },
      { label: "Office Type", value: propertyDetails.propertyType },
      { label: "Bedrooms", value: propertyDetails.bhk },
      { label: "Bathrooms", value: propertyDetails.bathrooms },
      { label: "Balconies", value: propertyDetails.balconies },
      { label: "Furnishing", value: propertyDetails.furnishingType },
      { label: "Area Unit", value: attr("area_unit") },
      { label: "Area Sq Ft", value: propertyDetails.superBuiltUpArea },
      { label: "Area Acres / Plot Area", value: propertyDetails.plotArea },
      { label: "Floor Number", value: propertyDetails.floorNumber },
      { label: "Total Floors", value: propertyDetails.totalFloors },
      { label: "Property Age", value: propertyDetails.propertyAge },
      { label: "Facing", value: propertyDetails.facing },
      { label: "Year Built", value: attr("year_built") },
      { label: "Lease Duration", value: attr("lease_duration") },
      { label: "Preferred Tenant", value: attr("preferred_tenant") },
      { label: "Occupancy", value: attr("occupancy") },
      { label: "Office Type", value: attr("office_type") },
      { label: "Seating Capacity", value: attr("seating_capacity") },
      { label: "Conference Rooms", value: attr("conference_rooms") },
      { label: "Pantry", value: attr("pantry") },
      { label: "Parking Spaces", value: attr("parking_spaces") },
      { label: "Service Type", value: attr("service_type") },
      { label: "License Number", value: attr("license_number") },
    ]),
    realEstatePreviewSection("Amenities", [
      { label: "Parking", value: amenities.parking, format: formatYesNoValue },
      { label: "Gym", value: amenities.gym, format: formatYesNoValue },
      { label: "Swimming Pool", value: amenities.swimmingPool, format: formatYesNoValue },
      { label: "Elevator", value: amenities.lift, format: formatYesNoValue },
      { label: "Security", value: amenities.security, format: formatYesNoValue },
      { label: "Gated Community", value: attr("amenity_gated_community"), format: formatYesNoValue },
      { label: "Pet Friendly", value: attr("amenity_pet_friendly"), format: formatYesNoValue },
      { label: "Laundry", value: attr("amenity_laundry"), format: formatYesNoValue },
      { label: "Furnished Kitchen", value: attr("amenity_furnished_kitchen"), format: formatYesNoValue },
      { label: "Air Conditioning", value: attr("amenity_air_conditioning"), format: formatYesNoValue },
      { label: "Water", value: attr("utilities_water"), format: formatYesNoValue },
      { label: "Electricity", value: attr("utilities_electricity"), format: formatYesNoValue },
      { label: "Internet", value: attr("utilities_internet"), format: formatYesNoValue },
    ]),
    ...(nearbyServices ? [nearbyServices] : []),
    realEstatePreviewSection("Contact Information", [
      { label: "Contact Person Name", value: sellerInformation.name },
      { label: "Phone", value: sellerInformation.mobileNumber },
      { label: "Email", value: sellerInformation.email },
      { label: "Agency Name", value: attr("agency_name") },
      { label: "Website", value: attr("contact_website") },
    ]),
    realEstatePreviewSection("Availability & Scheduling", [
      { label: "Property Availability Status", value: attr("property_availability_status") },
      { label: "Availability", value: propertyDetails.availability },
      { label: "Available From Date", value: formatDate(String(propertyDetails.availabilityDate || "")) },
      { label: "Open House Date", value: attrDate("open_house_date") },
      { label: "Schedule Visit", value: attr("schedule_visit") },
    ]),
    realEstatePreviewSection("Legal & Compliance", [
      { label: "Ownership Type", value: sellerInformation.sellerType },
      { label: "MLS Number", value: attr("mls_number") },
      { label: "Property Documents Upload", value: attr("property_documents_upload") },
      { label: "RERA / License", value: sellerInformation.reraNumber },
    ]),
    realEstatePreviewSection("Media Upload", [
      { label: "Primary Image", value: listing.primaryImageUrl },
      { label: "Gallery Images", value: listing.imageUrls || [] },
      { label: "Videos", value: listing.videoUrl },
      { label: "Floor Plans", value: attr("floor_plans") },
      { label: "Virtual Tour URL", value: attr("virtual_tour_url") },
      { label: "Brochure PDF", value: attr("brochure_pdf") },
    ]),
    realEstatePreviewSection("Listing Visibility & Promotions", [
      { label: "Listing Type", value: settings.adType || listing.userPlanName || "Free" },
      { label: "Featured Until Date", value: formatExpiryDate(listing.userPlanExpiryDate) },
      { label: "Boost Listing", value: attr("boost_listing") },
    ]),
  ];
  const leftoverFields = Object.entries(categoryAttributes)
    .filter(([key, value]) => !usedAttributeKeys.has(key) && hasPreviewValue(value))
    .map(([key, value]) => ({ label: toTitleLabel(key), value }));

  if (leftoverFields.length) {
    sections.push({ title: "Additional Details", fields: leftoverFields });
  }

  return sections;
}

function realEstatePreviewSection(title: string, fields: PreviewSection["fields"]): PreviewSection {
  return {
    title,
    fields: fields.filter((field) => hasPreviewValue(field.value, field.format)),
  };
}

function buildNearbyServicesSection(listing: ListingSummary): PreviewSection | null {
  const categoryAttributes = parseOtherInformationCategoryAttributes(listing.propertyDetails?.otherInformation);
  const nearbyServices = parseNearbyServiceItems(categoryAttributes[nearbyServicesAttributeKey]);

  if (!nearbyServices.length) {
    return null;
  }

  return {
    title: "Nearby Services",
    fields: nearbyServiceTypes
      .map((category) => ({
        label: category,
        value: nearbyServices
          .filter((item) => item.category === category)
          .map((item) => item.name.trim())
          .filter(Boolean)
          .map((name, index) => `${index + 1}. ${name}`)
          .join("\n"),
      }))
      .filter((field) => hasPreviewValue(field.value)),
  };
}

function parseOtherInformationCategoryAttributes(value: PreviewValue): PreviewRecord {
  const parsed = parseJsonValue(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const source =
    record.categoryAttributes && typeof record.categoryAttributes === "object" && !Array.isArray(record.categoryAttributes)
      ? record.categoryAttributes
      : record.customFields && typeof record.customFields === "object" && !Array.isArray(record.customFields)
        ? record.customFields
        : null;

  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, recordValue]) => [key, normalizePreviewValue(recordValue)]),
  );
}

function parseNearbyServiceItems(value: PreviewValue): Array<{ category: string; name: string }> {
  const parsed = parseJsonValue(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const record = parsed as Record<string, unknown>;

  return nearbyServiceTypes.flatMap((category) => {
    const rawItems = record[category];
    const items = Array.isArray(rawItems) ? rawItems : [];

    return items
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((name) => ({ category, name }));
  });
}

function parseJsonValue(value: PreviewValue): unknown {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizePreviewValue(value: unknown): PreviewValue {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.stringify(value);
}

function formatPrice(value?: number | null, country?: string | null) {
  if (!value) {
    return "Not listed";
  }

  return formatCurrencyAmount(value, country);
}

function formatMoneyPreview(country?: string | null) {
  return (value: PreviewValue) => {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    const numericValue = typeof value === "number" ? value : Number(value);

    if (Number.isNaN(numericValue)) {
      return String(value);
    }

    return formatCurrencyAmount(numericValue, country);
  };
}

function formatYesNoValue(value: PreviewValue) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return "Yes";
    }

    if (normalized === "false") {
      return "No";
    }
  }

  return formatPreviewValue(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatExpiryDate(value?: string | null) {
  return formatDate(value) || "No expiry date";
}

function getLatestListingDate(listing: ListingSummary) {
  return listing.updatedAt || listing.createdAt;
}

function getStatusClassName(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") {
    return "is-active";
  }

  if (normalized === "rejected") {
    return "is-rejected";
  }

  return "is-waiting";
}

function getEditPath(listing: ListingSummary) {
  return isClassifiedListing(listing)
    ? `/dashboard/classifieds/${listing.id}/edit/step-1`
    : `/dashboard/listings/${listing.id}/edit`;
}

function isClassifiedListing(listing: ListingSummary) {
  const categoryName = listing.categoryName?.trim().toLowerCase();
  const listingKind = String(listing.propertyDetails?.listingKind || "").trim().toLowerCase();

  return categoryName === "classifieds" || listingKind === "classified";
}

function isRealEstateListing(listing: ListingSummary) {
  const categoryName = listing.categoryName?.trim().toLowerCase();
  return categoryName === "real estate" || categoryName.includes("property");
}

function hasPreviewValue(value: PreviewValue, format?: (value: PreviewValue) => string) {
  const displayValue = getPreviewDisplayValue(value, format).trim();
  const normalized = displayValue.toLowerCase();
  return displayValue.length > 0 && normalized !== "not specified" && normalized !== "false";
}

function getPreviewDisplayValue(value: PreviewValue, format?: (value: PreviewValue) => string) {
  return format ? format(value) : formatPreviewValue(value);
}

function getPreviewImageUrls(value: PreviewValue) {
  const values = Array.isArray(value) ? value : value ? [String(value)] : [];

  return values
    .filter((item) => /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(item))
    .map(resolveListingImageUrl);
}

function formatPreviewValue(value: PreviewValue) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  return String(value);
}

function stringFromRecord(record: PreviewRecord | undefined, key: string) {
  const value = record?.[key];

  return value === null || value === undefined ? "" : String(value);
}

function numberFromRecord(record: PreviewRecord | undefined, key: string) {
  const value = record?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTitleLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
