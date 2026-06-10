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
type PreviewMapCoordinates = { latitude: number; longitude: number };
const nearbyServicesAttributeKey = "nearby_services";
const ignoredPreviewAttributeKeys = new Set([
  "adtype",
  "addurationdays",
  "agencyname",
  "autorenew",
  "boostlisting",
  "contactpersonname",
  "contactwebsite",
  "email",
  "featureduntildate",
  "listingtype",
  "metadescription",
  "metatitle",
  "mlsnumber",
  "mobilenumber",
  "name",
  "nearbyservices",
  "phone",
  "propertydocumentsupload",
  "reranumber",
  "verifiedbyadmin",
  "websiteurl",
]);

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
  const categoryPath = getPreviewCategoryPath(listing);
  const location = [
    listing.locality || stringFromRecord(listing.locationDetails, "locality"),
    listing.city || stringFromRecord(listing.locationDetails, "city"),
  ].filter(Boolean).join(", ");
  const country = stringFromRecord(listing.locationDetails, "country");
  const price = listing.price ?? numberFromRecord(listing.priceDetails, "price");
  const sections = getPreviewSections(listing);
  const mapCoordinates = getPreviewMapCoordinates(listing);
  const primaryFacts = [
    location ? { label: "Location", value: location } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

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

          {primaryFacts.length ? (
            <div className="listing-preview-facts">
              {primaryFacts.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="listing-preview-section-grid">
        {sections.map((section) => (
          <PreviewSectionCard section={section} key={section.title} />
        ))}
      </div>

      {mapCoordinates ? (
        <div className="listing-preview-section-card listing-preview-map-section">
          <div className="listing-preview-section-head">
            <span>Map</span>
            <h3>Map Location</h3>
          </div>
          <div className="listing-preview-map">
            <iframe
              title={`${listing.title} map location`}
              src={getPreviewMapEmbedUrl(mapCoordinates.latitude, mapCoordinates.longitude)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      ) : null}

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
  const fields = uniquePreviewFields(section.fields.filter((field) => hasPreviewValue(field.value, field.format)));

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
  const linkItems = field.format ? [] : getPreviewLinkItems(field.value);

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

  if (linkItems.length) {
    return (
      <div className="listing-preview-field listing-preview-link-field">
        <span>{field.label}</span>
        <div className="listing-preview-link-list">
          {linkItems.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
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
  const effectiveCategory = getPreviewEffectiveCategory(listing);
  const isRestaurant = effectiveCategory === "restaurantsfood";
  const isVehicle = effectiveCategory === "vehicles";
  const isElectronics = effectiveCategory === "electronicsappliances";
  const isCareService = effectiveCategory === "careservices";

  return [
    ...(isRealEstate
      ? getRealEstatePreviewSections(listing)
      : [
          buildRecordSection("Property / Custom Details", listing.propertyDetails, ["listingKind", "propertyType", "businessDescription", "otherInformation"]),
          buildRecordSection("Price Details", listing.priceDetails, ["price", "priceNegotiable", "maintenanceCharges", "securityDeposit", "pricePerSqFt", "loanEligible"]),
        ]),
    buildRecordSection("Location Details", listing.locationDetails, ["country", "state", "city", "locality", "pincode", "landmark"]),
    ...(isRealEstate ? [] : [
      buildRecordSection("Amenities", listing.amenities, ["parking", "lift", "powerBackup", "security", "gym", "cctv", "swimmingPool", "garden", "childrensPlayArea"]),
      buildRecordSection("Files & Links", { virtualTourUrl: listing.virtualTourUrl }),
    ]),
    ...(isRestaurant ? [buildRecordSection("Restaurant / Food Details", listing.restaurantFoodDetails)] : []),
    ...(isVehicle ? [buildRecordSection("Vehicle Details", listing.vehicleDetails)] : []),
    ...(isElectronics ? [buildRecordSection("Electronics Details", listing.electronicsDetails)] : []),
    ...(isCareService ? [buildRecordSection("Care Service Details", listing.careServiceDetails)] : []),
  ];
}

function getPreviewCategoryPath(listing: ListingSummary) {
  const values = isClassifiedListing(listing)
    ? [listing.categoryName, listing.subCategory]
    : [listing.categoryName, listing.subCategory, listing.detailCategory];

  return values.filter(Boolean).join(" / ");
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
    fields: uniquePreviewFields(
      keys
        .filter((key) => !isHiddenPreviewKey(key) && !isIgnoredPreviewAttributeKey(key))
        .map((key) => ({
          label: toTitleLabel(key),
          value: key === "otherInformation" ? formatOtherInformation(record[key]) : record[key],
        })),
    ),
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
  const categoryAttributes = parseOtherInformationCategoryAttributes(listing.propertyDetails?.otherInformation);
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
      { label: "Lot Size Unit", value: attr("lot_size_unit") },
      { label: "Zoning Type", value: attr("zoning_type") },
      { label: "Floor Number", value: propertyDetails.floorNumber },
      { label: "Total Floors", value: propertyDetails.totalFloors },
      { label: "Property Age", value: propertyDetails.propertyAge },
      { label: "Facing", value: propertyDetails.facing },
      { label: "Year Built", value: attr("year_built") },
      { label: "Lease Duration", value: attr("lease_duration") },
      { label: "Lease Terms", value: attr("lease_terms") },
      { label: "Preferred Tenant", value: attr("preferred_tenant") },
      { label: "Occupancy", value: attr("occupancy") },
      { label: "Office Type", value: attr("office_type") },
      { label: "Commercial Type", value: attr("commercial_type") },
      { label: "Office Capacity", value: attr("office_capacity") },
      { label: "Seating Capacity", value: attr("seating_capacity") },
      { label: "Business Use", value: attr("business_use") },
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
    realEstatePreviewSection("Availability & Scheduling", [
      { label: "Property Availability Status", value: attr("property_availability_status") },
      { label: "Availability", value: propertyDetails.availability },
      { label: "Available From Date", value: formatDate(String(propertyDetails.availabilityDate || "")) },
      { label: "Open House Date", value: attrDate("open_house_date") },
      { label: "Schedule Visit", value: attr("schedule_visit") },
    ]),
    realEstatePreviewSection("Files & Links", [
      { label: "Floor Plans", value: attr("floor_plans") },
      { label: "Virtual Tour", value: attr("virtual_tour_url") },
      { label: "Brochure PDF", value: attr("brochure_pdf") },
    ]),
  ];
  const leftoverFields = Object.entries(categoryAttributes)
    .filter(([key, value]) => !usedAttributeKeys.has(key) && !isHiddenPreviewKey(key) && !isIgnoredPreviewAttributeKey(key) && hasPreviewValue(value))
    .map(([key, value]) => ({ label: toTitleLabel(key), value }));

  if (leftoverFields.length) {
    sections.push({ title: "Additional Details", fields: uniquePreviewFields(leftoverFields) });
  }

  return sections;
}

function realEstatePreviewSection(title: string, fields: PreviewSection["fields"]): PreviewSection {
  return {
    title,
    fields: uniquePreviewFields(fields.filter((field) => hasPreviewValue(field.value, field.format))),
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

function getPreviewMapCoordinates(listing: ListingSummary): PreviewMapCoordinates | null {
  const locationDetails = listing.locationDetails;
  const latitude =
    parseCoordinate(locationDetails?.latitude) ??
    parseCoordinate(locationDetails?.lat);
  const longitude =
    parseCoordinate(locationDetails?.longitude) ??
    parseCoordinate(locationDetails?.lng) ??
    parseCoordinate(locationDetails?.lon);

  if (latitude !== null && longitude !== null && isValidLatitude(latitude) && isValidLongitude(longitude)) {
    return { latitude, longitude };
  }

  const combinedValue =
    stringFromRecord(locationDetails, "mapLatLong") ||
    stringFromRecord(locationDetails, "map_lat_long") ||
    stringFromRecord(locationDetails, "latLong") ||
    stringFromRecord(locationDetails, "coordinates");
  const combinedCoordinates = parseCombinedCoordinates(combinedValue);

  return combinedCoordinates &&
    isValidLatitude(combinedCoordinates.latitude) &&
    isValidLongitude(combinedCoordinates.longitude)
    ? combinedCoordinates
    : null;
}

function getPreviewMapEmbedUrl(latitude: number, longitude: number) {
  const delta = 0.08;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function parseCombinedCoordinates(value: string) {
  if (!value.trim()) {
    return null;
  }

  const [latitudeValue, longitudeValue] = value.split(",").map((item) => item.trim());
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);

  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

function parseCoordinate(value: PreviewValue) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const coordinate = typeof value === "number" ? value : Number(String(value).trim());

  return Number.isFinite(coordinate) ? coordinate : null;
}

function isValidLatitude(value: number | null) {
  return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null) {
  return value !== null && value >= -180 && value <= 180;
}

function isClassifiedListing(listing: ListingSummary) {
  const categoryName = listing.categoryName?.trim().toLowerCase();

  return categoryName === "classifieds";
}

function isRealEstateListing(listing: ListingSummary) {
  const categoryName = listing.categoryName?.trim().toLowerCase();
  return categoryName === "real estate" || categoryName.includes("property");
}

function getPreviewEffectiveCategory(listing: ListingSummary) {
  return normalizeFieldIdentity(listing.categoryName || "");
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

function getPreviewLinkItems(value: PreviewValue) {
  const values = Array.isArray(value) ? value : value ? [String(value)] : [];

  const linkValues = values
    .map((item) => item.trim())
    .filter((item) => item && isPreviewLinkValue(item) && !isEmbeddableMarkup(item));

  return linkValues.map((item, index) => ({
      href: resolvePreviewLinkHref(item),
      label: getPreviewLinkLabel(item, linkValues.length, index),
    }));
}

function isPreviewLinkValue(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    /^mailto:/i.test(value) ||
    /^tel:/i.test(value) ||
    value.startsWith("/uploads/") ||
    /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|mp4|webm|mov|m4v)(\?|#|$)/i.test(value)
  );
}

function resolvePreviewLinkHref(value: string) {
  if (value.startsWith("/uploads/")) {
    return resolveListingImageUrl(value);
  }

  return value;
}

function getPreviewLinkLabel(value: string, total: number, index: number) {
  const isFile = isPreviewFileValue(value);
  const baseLabel = isFile ? "Open file" : "Open link";

  return total > 1 ? `${baseLabel} ${index + 1}` : baseLabel;
}

function isPreviewFileValue(value: string) {
  return value.startsWith("/uploads/") || /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|mp4|webm|mov|m4v)(\?|#|$)/i.test(value);
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

function isHiddenPreviewKey(key: string) {
  const normalizedKey = key.trim();
  const lowerKey = normalizedKey.toLowerCase();

  return (
    lowerKey === "id" ||
    lowerKey === "userid" ||
    lowerKey === "listingid" ||
    lowerKey === "createdat" ||
    lowerKey === "updatedat" ||
    lowerKey === "created" ||
    lowerKey === "updated" ||
    /id$/i.test(normalizedKey)
  );
}

function isIgnoredPreviewAttributeKey(key: string) {
  return ignoredPreviewAttributeKeys.has(normalizeFieldIdentity(key));
}

function uniquePreviewFields(fields: PreviewSection["fields"]) {
  const seen = new Set<string>();

  return fields.filter((field) => {
    const key = normalizeFieldIdentity(field.label);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeFieldIdentity(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
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
