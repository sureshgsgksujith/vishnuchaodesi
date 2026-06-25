import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getListing,
  getListingApiErrorMessage,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import { resolveListingImageUrl } from "../../dashboard/utils/listingImages";
import { getCurrentCustomerUserId, isCustomerAuthenticated } from "../../auth/utils/customerSession";
import "../styles/eventDetail.css";

type LooseValue = string | number | boolean | null | undefined;
type LooseRecord = Record<string, LooseValue>;
type TicketOption = {
  name: string;
  price: number;
  detail: string;
};
type DetailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

const feeRates = { tx: 0.09, tax: 0.091, conv: 4 };

export default function EventDetailPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const isAuthenticated = isCustomerAuthenticated();
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");
  const requestedId = Number(searchParams.get("id") || searchParams.get("listingId"));

  useEffect(() => {
    let isActive = true;

    async function loadEvent() {
      if (!isAuthenticated) {
        setListing(null);
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      if (!Number.isFinite(requestedId) || requestedId <= 0) {
        setErrorMessage("Event not found.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const result = await getListing(requestedId);

        if (isActive) {
          setListing(result);
        }
      } catch (error) {
        if (isActive) {
          setListing(null);
          setErrorMessage(getListingApiErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, requestedId]);

  return (
    <>
      <CustomerHeader />
      <main className="event-detail-page">
        {isLoading ? (
          <div className="event-detail-status">Loading event...</div>
        ) : null}
        {errorMessage ? (
          <div className="event-detail-status event-detail-error">{errorMessage}</div>
        ) : null}
        {listing ? <EventDetail listing={listing} /> : null}
        {!isAuthenticated ? (
          <EventLoginRequiredPrompt
            closeTo="/all-listing?category=events-tickets"
            returnTo={`${location.pathname}${location.search}`}
          />
        ) : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function EventLoginRequiredPrompt({ closeTo, returnTo }: { closeTo: string; returnTo: string }) {
  const loginPath = `/login?returnUrl=${encodeURIComponent(returnTo)}`;

  return (
    <div className="event-login-prompt-backdrop" role="dialog" aria-modal="true" aria-labelledby="event-login-prompt-title">
      <div className="event-login-prompt">
        <h4 id="event-login-prompt-title">Login required</h4>
        <p>Please login to view event details.</p>
        <div>
          <Link className="btn btn-primary" to={loginPath}>Login</Link>
          <Link className="btn btn-default" to={closeTo}>Close</Link>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ listing }: { listing: ListingSummary }) {
  const navigate = useNavigate();
  const currentUserId = getCurrentCustomerUserId();
  const isOwnerViewing = currentUserId === listing.userId;
  const attrs = useMemo(() => getCategoryAttributes(listing), [listing]);
  const event = useMemo(() => buildEventView(listing, attrs), [attrs, listing]);
  const tickets = useMemo(() => buildTicketOptions(listing, attrs), [attrs, listing]);
  const detailSections = useMemo(() => buildDetailSections(listing, attrs), [attrs, listing]);
  const infoItems = useMemo(() => buildInfoItems(event), [event]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const image = resolveListingImageUrl(listing.coverBannerUrl || listing.primaryImageUrl || listing.imageUrls?.[0] || "");
  const galleryImages = [listing.primaryImageUrl, ...(listing.imageUrls || [])]
    .filter(Boolean)
    .map((item) => resolveListingImageUrl(item as string))
    .slice(0, 8);
  const selectedItems = tickets
    .map((ticket) => ({ ...ticket, qty: quantities[ticket.name] || 0 }))
    .filter((ticket) => ticket.qty > 0);
  const subtotal = selectedItems.reduce((sum, ticket) => sum + ticket.price * ticket.qty, 0);
  const fee = selectedItems.length ? subtotal * feeRates.tx + subtotal * feeRates.tax + feeRates.conv : 0;
  const total = subtotal + fee;

  function updateQty(ticketName: string, delta: number) {
    if (isOwnerViewing) {
      return;
    }

    setQuantities((current) => ({
      ...current,
      [ticketName]: Math.max(0, Math.min(10, (current[ticketName] || 0) + delta)),
    }));
  }

  function checkout() {
    if (isOwnerViewing) {
      window.alert("You are the owner of this event. You cannot buy tickets for your own event.");
      return;
    }

    if (!selectedItems.length) {
      window.alert("Please select at least one ticket.");
      return;
    }

    localStorage.setItem("chaodesi_event_cart", JSON.stringify({
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue,
        address: event.address,
        organizer: event.organizer,
        listingId: listing.id,
      },
      items: selectedItems.map((ticket) => ({
        name: ticket.name,
        price: ticket.price,
        qty: ticket.qty,
      })),
      subtotal: roundMoney(subtotal),
      fee: roundMoney(fee),
      rates: feeRates,
    }));

    navigate("/event-checkout");
  }

  return (
    <>
      <section className="event-detail-hero" style={image ? { backgroundImage: `linear-gradient(90deg, rgba(8,18,38,.88), rgba(8,18,38,.42)), url(${image})` } : undefined}>
        <div className="event-detail-wrap">
          <nav className="event-detail-crumb">
            <Link to="/home">Home</Link>
            <Link to="/all-listing?category=events-tickets">Events & Tickets</Link>
            <span>{event.title}</span>
          </nav>
          <span className="event-detail-badge">{listing.subCategory || "Events & Tickets"}</span>
          <h1>{event.title}</h1>
          <div className="event-detail-meta">
            <span><i className="material-icons">event</i>{event.date}</span>
            <span><i className="material-icons">schedule</i>{event.time}</span>
            <span><i className="material-icons">place</i>{event.location}</span>
          </div>
        </div>
      </section>

      <section className="event-detail-body">
        <div className="event-detail-wrap event-detail-layout">
          <div className="event-detail-main">
            <section className="event-detail-section">
              <h2>About This Event</h2>
              <p>{event.description || "Event details are not listed."}</p>
            </section>

            <section className="event-detail-section">
              <h2>Event Information</h2>
              <div className="event-detail-info-grid">
                {infoItems.map((item) => (
                  <InfoItem icon={item.icon} label={item.label} value={item.value} key={item.label} />
                ))}
              </div>
            </section>

            <section className="event-detail-section event-detail-tabs-card">
              <div className="event-detail-tabs">
                {detailSections.map((section) => (
                  <button
                    type="button"
                    className={section.title === activeTab ? "active" : ""}
                    onClick={() => setActiveTab(section.title)}
                    key={section.title}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              {detailSections.map((section) => (
                <div
                  className={`event-detail-tab-panel${section.title === activeTab ? " active" : ""}`}
                  key={section.title}
                >
                  {section.title === "Overview" ? (
                    <p>{event.description || "Event details are not listed."}</p>
                  ) : null}

                  {section.rows.length ? (
                    <div className="event-detail-data-list">
                      {section.rows.map((row) => (
                        <div className="event-detail-data-row" key={`${section.title}-${row.label}`}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {section.title === "Location" ? (
                    <EventMap event={event} />
                  ) : null}

                  {section.title === "Media" && galleryImages.length ? (
                    <div className="event-detail-gallery">
                      {galleryImages.map((galleryImage, index) => (
                        <img src={galleryImage} alt={`${event.title} ${index + 1}`} key={`${galleryImage}-${index}`} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          </div>

          <aside className="event-detail-side">
            <div className="event-ticket-panel">
              <h2>Tickets</h2>
              {tickets.map((ticket) => (
                <div className="event-ticket-row" key={ticket.name}>
                  <div>
                    <strong>{ticket.name}</strong>
                    <small>{ticket.detail}</small>
                    <b>{formatMoney(ticket.price)}</b>
                  </div>
                  <div className="event-ticket-stepper">
                    <button type="button" onClick={() => updateQty(ticket.name, -1)} disabled={isOwnerViewing}>-</button>
                    <span>{quantities[ticket.name] || 0}</span>
                    <button type="button" onClick={() => updateQty(ticket.name, 1)} disabled={isOwnerViewing}>+</button>
                  </div>
                </div>
              ))}
              <div className="event-ticket-total">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              {isOwnerViewing ? (
                <p className="event-ticket-owner-note">
                  You are the owner of this event. You do not need to buy tickets for your own event.
                </p>
              ) : null}
              <button className="event-ticket-checkout" type="button" onClick={checkout} disabled={isOwnerViewing}>
                {isOwnerViewing ? "Owner Event" : "Buy Tickets"}
              </button>
              <p>{isOwnerViewing ? "Ticket purchase is available for customers only." : "Login is required at checkout."}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="event-detail-info-item">
      <i className="material-icons">{icon}</i>
      <span>{label}</span>
      <strong>{value || "Not listed"}</strong>
    </div>
  );
}

function buildInfoItems(event: ReturnType<typeof buildEventView>) {
  return [
    { icon: "event", label: "Date", value: event.date },
    { icon: "schedule", label: "Time", value: event.time },
    { icon: "meeting_room", label: "Venue", value: event.venue },
    { icon: "confirmation_number", label: "Ticket type", value: event.ticketType },
    { icon: "people", label: "Capacity", value: event.capacity },
    { icon: "person", label: "Organizer", value: event.organizer },
  ].filter((item) => item.value);
}

function EventMap({ event }: { event: ReturnType<typeof buildEventView> }) {
  const query = event.mapQuery || event.address || event.location;

  if (!query) {
    return <p className="event-detail-map-empty">Map location is not available for this event.</p>;
  }

  return (
    <div className="event-detail-map">
      <iframe
        title={`${event.title} location map`}
        loading="lazy"
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
      />
    </div>
  );
}

function buildEventView(listing: ListingSummary, attrs: LooseRecord) {
  const venue = firstValue([attrs, listing.propertyDetails, listing.locationDetails, listing], ["venue_name", "venueName", "venue", "placeName", "locality", "city"]);
  const address = firstValue([attrs, listing.locationDetails, listing.propertyDetails], ["full_address", "fullAddress", "address", "listing_address", "locality"]);
  const city = firstValue([listing.locationDetails, listing], ["city"]);
  const locality = firstValue([listing.locationDetails, listing], ["locality"]);
  const latitude = firstValue([listing.locationDetails, attrs], ["latitude", "lat"]);
  const longitude = firstValue([listing.locationDetails, attrs], ["longitude", "lng", "long"]);
  const mapLatLong = firstValue([attrs], ["map_lat_long", "mapLatLong", "google_map_lat_long"]);

  const dateValue = firstValue([attrs, listing.propertyDetails], ["event_start_date", "eventStartDate", "eventDate", "startDate"]);
  const timeValue = firstValue([attrs, listing.propertyDetails], ["event_time", "eventTime", "start_time", "startTime"]);
  const ticketType = firstValue([attrs, listing.priceDetails], ["ticket_type", "ticketType"]) || (Number(listing.price || 0) > 0 ? "Paid" : "Free");
  const capacity = firstValue([attrs, listing.propertyDetails], ["event_capacity", "eventCapacity", "capacity"]);

  return {
    title: firstValue([attrs, listing.propertyDetails, listing], ["event_title", "eventTitle", "title"]) || listing.title,
    description: firstValue([attrs, listing.propertyDetails, listing], ["event_description", "eventDescription", "businessDescription", "description"]),
    date: dateValue ? formatDate(dateValue) : "",
    time: timeValue,
    venue,
    address,
    location: [venue, locality, city].filter(Boolean).join(", "),
    mapQuery: mapLatLong || (latitude && longitude ? `${latitude},${longitude}` : [address, locality, city].filter(Boolean).join(", ")),
    ticketType,
    capacity,
    organizer: firstValue([attrs, listing.sellerInformation, listing], ["organizer_name", "organizerName", "name", "contactName", "organizer", "sellerName"]) || "Organizer",
  };
}

function buildTicketOptions(listing: ListingSummary, attrs: LooseRecord): TicketOption[] {
  const rawCategories = firstValue([attrs], ["ticket_categories", "ticketCategories"]);
  const categories = splitList(rawCategories);
  const price = numberValue(firstValue([attrs, listing.priceDetails, listing.propertyDetails, listing], ["ticket_price", "ticketPrice", "price"])) || 0;

  if (categories.length) {
    return categories.map((category) => ({
      name: category,
      price,
      detail: "Event ticket",
    }));
  }

  return [{
    name: firstValue([attrs], ["ticket_type", "ticketType"]) || "General Admission",
    price,
    detail: price > 0 ? "Standard entry" : "Free entry",
  }];
}

function buildDetailSections(listing: ListingSummary, attrs: LooseRecord): DetailSection[] {
  const consumedKeys = new Set([
    "event_title",
    "eventTitle",
    "event_description",
    "eventDescription",
    "event_start_date",
    "eventStartDate",
    "eventDate",
    "startDate",
    "event_time",
    "eventTime",
    "start_time",
    "startTime",
    "venue_name",
    "venueName",
    "venue",
    "placeName",
    "full_address",
    "fullAddress",
    "address",
    "listing_address",
    "ticket_type",
    "ticketType",
    "ticket_categories",
    "ticketCategories",
    "ticket_price",
    "ticketPrice",
    "event_capacity",
    "eventCapacity",
  ]);
  [
    "tagline",
    "event_end_date",
    "eventEndDate",
    "end_time",
    "endTime",
    "time_zone",
    "timeZone",
    "recurring_event",
    "recurringEvent",
    "quantity_available",
    "quantityAvailable",
    "registration_required",
    "registrationRequired",
    "payment_gateway",
    "paymentGateway",
    "refund_policy",
    "refundPolicy",
    "cancellation_policy",
    "cancellationPolicy",
    "online_meeting_url",
    "onlineMeetingUrl",
    "streaming_platform",
    "streamingPlatform",
    "organizer_name",
    "organizerName",
    "organizer_type",
    "organizerType",
    "contact_name",
    "contactName",
    "phone",
    "email",
    "website",
    "social_media_links",
    "socialMediaLinks",
    "age_restriction",
    "ageRestriction",
    "age_verification",
    "ageVerification",
    "audience_type",
    "audienceType",
    "parking_available",
    "parkingAvailable",
    "food_drinks_available",
    "foodDrinksAvailable",
    "wheelchair_accessible",
    "wheelchairAccessible",
    "live_streaming",
    "liveStreaming",
    "networking_sessions",
    "networkingSessions",
    "merchandise_available",
    "merchandiseAvailable",
    "terms_conditions",
    "termsConditions",
    "liability_waiver",
    "liabilityWaiver",
    "event_permit",
    "eventPermit",
    "alcohol_permit",
    "alcoholPermit",
    "promo_video_url",
    "promoVideoUrl",
    "brochure_flyer_pdf",
    "brochureFlyerPdf",
    "original_ticket_proof",
    "originalTicketProof",
    "transfer_policy",
    "transferPolicy",
  ].forEach((key) => {
    consumedKeys.add(key);
    consumedKeys.add(normalizeFieldKey(key));
  });

  const sections: DetailSection[] = [
    {
      title: "Overview",
      rows: rowsFromKeys({
        ...attrs,
        title: listing.title,
        categoryName: listing.categoryName,
        subCategory: listing.subCategory,
        detailCategory: listing.detailCategory,
      }, [
        ["Event Title", "event_title", "eventTitle", "title"],
        ["Category", "categoryName"],
        ["Sub Category", "subCategory"],
        ["Detail Category", "detailCategory"],
        ["Tagline", "tagline"],
        ["Event Type", "event_type", "eventType"],
      ]),
    },
    {
      title: "Schedule",
      rows: rowsFromKeys(attrs, [
        ["Event Start Date", "event_start_date", "eventStartDate"],
        ["Event End Date", "event_end_date", "eventEndDate"],
        ["Start Time", "start_time", "startTime", "event_time", "eventTime"],
        ["End Time", "end_time", "endTime"],
        ["Time Zone", "time_zone", "timeZone"],
        ["Recurring Event", "recurring_event", "recurringEvent"],
      ]),
    },
    {
      title: "Tickets",
      rows: rowsFromKeys({ ...listing.priceDetails, ...attrs, listingPrice: listing.price }, [
        ["Ticket Type", "ticket_type", "ticketType"],
        ["Ticket Categories", "ticket_categories", "ticketCategories"],
        ["Ticket Price", "ticket_price", "ticketPrice", "price", "listingPrice"],
        ["Quantity Available", "quantity_available", "quantityAvailable"],
        ["Max Tickets Per User", "max_tickets_per_user", "maxTicketsPerUser"],
        ["Registration Required", "registration_required", "registrationRequired"],
        ["Payment Gateway", "payment_gateway", "paymentGateway"],
      ]),
    },
    {
      title: "Location",
      rows: rowsFromKeys({ ...listing.locationDetails, ...attrs }, [
        ["Venue Name", "venue_name", "venueName", "venue"],
        ["Full Address", "full_address", "fullAddress", "address", "listing_address"],
        ["Locality", "locality"],
        ["City", "city"],
        ["State", "state"],
        ["Country", "country"],
        ["Pincode", "pincode", "postalCode"],
        ["Map Lat Long", "map_lat_long", "mapLatLong"],
        ["Online Meeting URL", "online_meeting_url", "onlineMeetingUrl"],
        ["Streaming Platform", "streaming_platform", "streamingPlatform"],
      ]),
    },
    {
      title: "Organizer",
      rows: rowsFromKeys({ ...listing.sellerInformation, ...attrs }, [
        ["Organizer Name", "organizer_name", "organizerName", "name"],
        ["Organizer Type", "organizer_type", "organizerType"],
        ["Contact Name", "contact_name", "contactName"],
        ["Phone", "mobileNumber", "phoneNumber", "phone", "mainPhone"],
        ["Email", "email"],
        ["WhatsApp", "whatsAppNumber", "whatsapp"],
        ["Website", "websiteUrl", "website"],
        ["Social Media Links", "social_media_links", "socialMediaLinks"],
      ]),
    },
    {
      title: "Audience",
      rows: rowsFromKeys(attrs, [
        ["Event Capacity", "event_capacity", "eventCapacity"],
        ["Age Restriction", "age_restriction", "ageRestriction"],
        ["Age Verification", "age_verification", "ageVerification"],
        ["Audience Type", "audience_type", "audienceType"],
      ]),
    },
    {
      title: "Amenities",
      rows: rowsFromKeys(attrs, [
        ["Parking Available", "parking_available", "parkingAvailable"],
        ["Food & Drinks Available", "food_drinks_available", "foodDrinksAvailable"],
        ["Wheelchair Accessible", "wheelchair_accessible", "wheelchairAccessible"],
        ["Live Streaming", "live_streaming", "liveStreaming"],
        ["Networking Sessions", "networking_sessions", "networkingSessions"],
        ["Merchandise Available", "merchandise_available", "merchandiseAvailable"],
      ]),
    },
    {
      title: "Policies",
      rows: rowsFromKeys(attrs, [
        ["Refund Policy", "refund_policy", "refundPolicy"],
        ["Cancellation Policy", "cancellation_policy", "cancellationPolicy"],
        ["Terms & Conditions", "terms_conditions", "termsConditions"],
        ["Liability Waiver", "liability_waiver", "liabilityWaiver"],
        ["Event Permit", "event_permit", "eventPermit"],
        ["Alcohol Permit", "alcohol_permit", "alcoholPermit"],
      ]),
    },
    {
      title: "Media",
      rows: rowsFromKeys(attrs, [
        ["Event Banner", "event_banner", "eventBanner"],
        ["Event Photos", "event_photos", "eventPhotos"],
        ["Promo Video URL", "promo_video_url", "promoVideoUrl"],
        ["Brochure / Flyer PDF", "brochure_flyer_pdf", "brochureFlyerPdf"],
        ["Original Ticket Proof", "original_ticket_proof", "originalTicketProof"],
        ["Transfer Policy", "transfer_policy", "transferPolicy"],
      ]),
    },
  ];

  const remainingRows = rowsFromRecord("Additional Details", attrs, consumedKeys)
    .filter((row) => !isNonEventRow(row.label));

  if (remainingRows.length) {
    sections.push({ title: "Additional Posted Details", rows: remainingRows });
  }

  return sections
    .map((section) => ({
      ...section,
      rows: dedupeRows(section.rows),
    }))
    .filter((section) => section.rows.length || ["Overview", "Location", "Media"].includes(section.title));
}

function isNonEventRow(label: string) {
  const normalized = normalizeFieldKey(label);
  const blockedFragments = [
    "listingkind",
    "propertytype",
    "bhk",
    "bathrooms",
    "balconies",
    "furnishingtype",
    "superbuiltuparea",
    "carpetarea",
    "floornumber",
    "totalfloors",
    "propertyage",
    "facing",
    "plotarea",
    "maintenancecharges",
    "securitydeposit",
    "pricepersqft",
  ];

  if (blockedFragments.some((fragment) => normalized.includes(fragment))) {
    return true;
  }

  return [
    "propertydetailslistingkind",
    "propertydetailspropertytype",
    "propertydetailsbhk",
    "propertydetailsbathrooms",
    "propertydetailsbalconies",
    "propertydetailsfurnishingtype",
    "propertydetailssuperbuiltuparea",
    "propertydetailscarpetarea",
    "propertydetailsfloornumber",
    "propertydetailstotalfloors",
    "propertydetailspropertyage",
    "propertydetailsfacing",
    "propertydetailsavailability",
    "propertydetailsplotarea",
    "pricedetailsmaintenancecharges",
    "pricedetailssecuritydeposit",
    "pricedetailspricepersqft",
  ].includes(normalized);
}

function normalizeFieldKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function rowsFromKeys(record: Record<string, LooseValue> | undefined, definitions: Array<[string, ...string[]]>) {
  return definitions
    .map(([label, ...keys]) => ({ label, value: formatDetailValue(firstValue([record], keys)) }))
    .filter((row) => row.value);
}

function rowsFromRecord(prefix: string, record?: Record<string, LooseValue>, excludedKeys = new Set<string>()) {
  if (!record) return [];

  return Object.entries(record)
    .filter(([key, value]) => !excludedKeys.has(key) && !excludedKeys.has(normalizeFieldKey(key)) && value !== undefined && value !== null && String(value).trim())
    .map(([key, value]) => ({
      label: `${prefix}: ${formatLabel(key)}`,
      value: formatDetailValue(String(value)),
    }))
    .filter((row) => row.value);
}

function dedupeRows(rows: Array<{ label: string; value: string }>) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.label}:${row.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDetailValue(value: string) {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).join(", ");
    if (parsed && typeof parsed === "object") return Object.entries(parsed).map(([key, item]) => `${formatLabel(key)}: ${String(item)}`).join(", ");
  } catch {
    // Use the original string below.
  }

  return value === "true" ? "Yes" : value === "false" ? "No" : value;
}

function getCategoryAttributes(listing: ListingSummary): LooseRecord {
  const otherInformation = parseRecord(getString(listing.propertyDetails, "otherInformation"));
  const rawAttributes = otherInformation.categoryAttributes;
  return rawAttributes && typeof rawAttributes === "object" && !Array.isArray(rawAttributes)
    ? rawAttributes as LooseRecord
    : {};
}

function firstValue(records: Array<Record<string, LooseValue> | undefined | ListingSummary>, keys: string[]) {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = (record as Record<string, LooseValue>)[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
}

function getString(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return value === undefined || value === null ? "" : String(value);
}

function parseRecord(value: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function splitList(value: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // Comma-separated fallback below.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  if (!value) return "Date available on details";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(value: number) {
  return value > 0 ? `$${roundMoney(value).toFixed(2)}` : "Free";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
