import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../dashboard/components/DashboardLayout";
import {
  checkServiceability,
  confirmServiceSlot,
  createServiceBooking,
  createServicesQuote,
  getDiscoveryCategories,
  getDiscoveryService,
  getServicesMarketplaceCapabilities,
  getServiceBooking,
  getServiceBookingProgress,
  getCustomerJobProofs,
  getCustomerJobProofAccess,
  downloadJobProof,
  getServiceBookings,
  searchDiscoveryServices,
  searchServiceSlots,
  holdServiceSlot,
} from "../api/servicesMarketplaceApi";
import type {
  DiscoveryCategory,
  BookingDetail,
  BookingSummary,
  DiscoveryDetail,
  DiscoveryPage,
  DiscoveryService,
  QuoteResult,
  ServiceSlot,
  ServiceSlotHold,
  CustomerJobProgress,
  JobProof,
} from "../api/servicesMarketplaceApi";
import "./servicesDiscovery.css";
import ProviderOnboarding from "./ProviderOnboarding";
import ProviderJobOffers from "./ProviderJobOffers";
import ProviderJobWorkspace from "./ProviderJobWorkspace";
import { CustomerAdditionalWork } from "./AdditionalWorkPanel";
import ServicesPaymentPanel from "./ServicesPaymentPanel";
import { CustomerCompletion } from "./CompletionPanel";

type Surface = "customer" | "provider";
type PageState = "loading" | "enabled" | "unavailable";
const recentKey = "chaodesi_services_recent_v1";

export default function ServicesMarketplacePlaceholderPage({
  surface,
}: {
  surface: Surface;
}) {
  const [state, setState] = useState<PageState>("loading");
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [results, setResults] = useState<DiscoveryPage>({
    items: [],
    page: 1,
    pageSize: 12,
    totalCount: 0,
  });
  const [popular, setPopular] = useState<DiscoveryService[]>([]);
  const [trending, setTrending] = useState<DiscoveryService[]>([]);
  const [recommended, setRecommended] = useState<DiscoveryService[]>([]);
  const [detail, setDetail] = useState<DiscoveryDetail | null>(null);
  const [recent, setRecent] = useState<DiscoveryService[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [location, setLocation] = useState({
    countryCode: "",
    administrativeArea: "",
    locality: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  useEffect(() => {
    let active = true;
    void getServicesMarketplaceCapabilities()
      .then((x) => {
        if (active)
          setState(
            x.enabled &&
              (surface === "provider" ? x.providerEnabled : x.customerEnabled)
              ? "enabled"
              : "unavailable",
          );
      })
      .catch(() => active && setState("unavailable"));
    return () => {
      active = false;
    };
  }, [surface]);
  useEffect(() => {
    if (state !== "enabled" || surface !== "customer") return;
    setLoading(true);
    Promise.all([
      getDiscoveryCategories(),
      searchDiscoveryServices({ section: "popular", pageSize: 6 }),
      searchDiscoveryServices({ section: "trending", pageSize: 6 }),
      searchDiscoveryServices({ section: "recommended", pageSize: 6 }),
      searchDiscoveryServices({ pageSize: 12 }),
    ])
      .then(([c, p, t, r, all]) => {
        setCategories(c);
        setPopular(p.items);
        setTrending(t.items);
        setRecommended(r.items);
        setResults(all);
        const ids: string[] = JSON.parse(
          localStorage.getItem(recentKey) || "[]",
        );
        setRecent(
          ids
            .map((id) =>
              [...all.items, ...p.items, ...t.items, ...r.items].find(
                (x) => x.id === id,
              ),
            )
            .filter(Boolean) as DiscoveryService[],
        );
      })
      .catch(() => setError("Services could not be loaded. Please try again."))
      .finally(() => setLoading(false));
  }, [state, surface]);
  const subCategories = useMemo(
    () => categories.find((x) => x.id === categoryId)?.subCategories || [],
    [categories, categoryId],
  );
  async function search(page = 1) {
    setLoading(true);
    setError("");
    setDetail(null);
    setQuote(null);
    try {
      setResults(
        await searchDiscoveryServices({
          q: query || undefined,
          categoryId: categoryId || undefined,
          subCategoryId: subCategoryId || undefined,
          countryCode: location.countryCode || undefined,
          administrativeArea: location.administrativeArea || undefined,
          locality: location.locality || undefined,
          postalCode: location.postalCode || undefined,
          page,
          pageSize: 12,
        }),
      );
    } catch {
      setError("Search is temporarily unavailable. Please try again.");
      setResults({ items: [], page: 1, pageSize: 12, totalCount: 0 });
    } finally {
      setLoading(false);
    }
  }
  async function openService(id: string) {
    setLoading(true);
    setError("");
    try {
      const item = await getDiscoveryService(id);
      setDetail(item);
      setQuote(null);
      const ids: string[] = JSON.parse(localStorage.getItem(recentKey) || "[]");
      const next = [id, ...ids.filter((x) => x !== id)].slice(0, 6);
      localStorage.setItem(recentKey, JSON.stringify(next));
      setRecent((current) =>
        [item.service, ...current.filter((x) => x.id !== id)].slice(0, 6),
      );
    } catch {
      setError("Service details are unavailable.");
    } finally {
      setLoading(false);
    }
  }
  async function previewQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const availability = await checkServiceability({
        serviceId: detail.service.id,
        ...location,
      });
      if (!availability.isServiceable) {
        setError(availability.reason);
        setQuote(null);
        return;
      }
      const addOns = detail.addOns
        .filter((x) => form.get(`addon-${x.id}`) === "on")
        .map((x) => ({ addOnId: x.id, quantity: 1 }));
      setQuote(
        await createServicesQuote({
          serviceId: detail.service.id,
          packageId: String(form.get("packageId") || "") || null,
          areaId: availability.areaId || null,
          quantity: Number(form.get("quantity") || 1),
          durationMinutes: detail.estimatedDurationMinutes || null,
          scheduledAtUtc: new Date(
            String(form.get("scheduledAtUtc")),
          ).toISOString(),
          isEmergency: form.get("isEmergency") === "on",
          currencyCode: String(form.get("currencyCode") || "USD"),
          addOns,
          approvedAdditionalWorkAmount: 0,
        }),
      );
    } catch {
      setError("A quote could not be calculated for this selection.");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }
  if (state === "loading")
    return (
      <DashboardLayout>
        <div className="services-state">Loading Services Marketplace…</div>
      </DashboardLayout>
    );
  if (state === "unavailable")
    return (
      <DashboardLayout>
        <div className="services-state">
          <h1>Services Marketplace unavailable</h1>
          <p>The module is disabled or your account does not have access.</p>
          <Link to="/dashboard">Return to dashboard</Link>
        </div>
      </DashboardLayout>
    );
  if (surface === "provider")
    return (
      <DashboardLayout>
        <ProviderOnboarding />
        <ProviderJobOffers />
        <ProviderJobWorkspace />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <main className="services-discovery">
        <header>
          <span>CHAO DESI SERVICES</span>
          <h1>Find trusted help for every task</h1>
          <p>
            Browse, confirm availability in your area, and get a transparent
            server-calculated quote.
          </p>
        </header>
        <section className="services-search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input
              aria-label="Search services"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you need help with?"
              maxLength={200}
            />
            <select
              aria-label="Category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubCategoryId("");
              }}
            >
              <option value="">All categories</option>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Subcategory"
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
            >
              <option value="">All subcategories</option>
              {subCategories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Country code"
              value={location.countryCode}
              onChange={(e) =>
                setLocation({ ...location, countryCode: e.target.value })
              }
              placeholder="Country (US)"
              maxLength={3}
            />
            <input
              aria-label="State or province"
              value={location.administrativeArea}
              onChange={(e) =>
                setLocation({ ...location, administrativeArea: e.target.value })
              }
              placeholder="State/province"
            />
            <input
              aria-label="City"
              value={location.locality}
              onChange={(e) =>
                setLocation({ ...location, locality: e.target.value })
              }
              placeholder="City"
            />
            <input
              aria-label="Postal code"
              value={location.postalCode}
              onChange={(e) =>
                setLocation({ ...location, postalCode: e.target.value })
              }
              placeholder="Postal/ZIP"
            />
            <button type="submit">Search</button>
          </form>
        </section>
        {error ? (
          <div className="services-alert" role="alert">
            {error}
          </div>
        ) : null}
        {results.unavailableReason ? (
          <div className="services-alert" role="status">
            {results.unavailableReason}
          </div>
        ) : null}
        {detail ? (
          <ServiceDetail
            detail={detail}
            location={location}
            quote={quote}
            loading={loading}
            previewQuote={previewQuote}
            close={() => {
              setDetail(null);
              setQuote(null);
            }}
          />
        ) : (
          <>
            <ServiceSection
              title="Search results"
              items={results.items}
              loading={loading}
              open={openService}
              empty="No matching services are available. Try a broader search or another location."
            />
            {results.totalCount > results.pageSize ? (
              <nav className="services-pagination">
                <button
                  disabled={results.page <= 1}
                  onClick={() => void search(results.page - 1)}
                >
                  Previous
                </button>
                <span>Page {results.page}</span>
                <button
                  disabled={
                    results.page * results.pageSize >= results.totalCount
                  }
                  onClick={() => void search(results.page + 1)}
                >
                  Next
                </button>
              </nav>
            ) : null}
            <ServiceSection
              title="Popular"
              items={popular}
              open={openService}
            />
            <ServiceSection
              title="Trending"
              items={trending}
              open={openService}
            />
            <ServiceSection
              title="Recommended"
              items={recommended}
              open={openService}
            />
            {recent.length ? (
              <ServiceSection
                title="Recently viewed on this device"
                items={recent}
                open={openService}
              />
            ) : null}
            <MyBookings />
          </>
        )}
      </main>
    </DashboardLayout>
  );
}

function MyBookings() {
  const [items, setItems] = useState<BookingSummary[]>([]);
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [progress, setProgress] = useState<CustomerJobProgress | null>(null);
  const [proofs, setProofs] = useState<JobProof[]>([]);
  const [loaded, setLoaded] = useState(false);
  async function load() {
    try {
      setItems(await getServiceBookings());
    } finally {
      setLoaded(true);
    }
  }
  async function viewProof(bookingId: string, proofId: string) {
    const access = await getCustomerJobProofAccess(bookingId, proofId);
    const blob = await downloadJobProof(access.token);
    const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  if (!loaded)
    return (
      <section className="services-section">
        <h2>My Bookings</h2>
        <button onClick={() => void load()}>Load my bookings</button>
      </section>
    );
  return (
    <section className="services-section">
      <h2>My Bookings</h2>
      {items.length ? (
        <div className="services-grid">
          {items.map((x) => (
            <article key={x.id}>
              <small>{x.referenceNumber}</small>
              <h3>{x.serviceName}</h3>
              <p>
                {new Date(x.requestedStartAtUtc).toLocaleString()} ·{" "}
                {x.status.replace(/_/g, " ")}
              </p>
              <strong>
                {x.currencyCode} {x.totalAmount.toFixed(2)}
              </strong>
              <button
                onClick={() =>
                  void Promise.all([
                    getServiceBooking(x.id),
                    getServiceBookingProgress(x.id),
                    getCustomerJobProofs(x.id),
                  ]).then(([detail, currentProgress, visibleProofs]) => {
                    setSelected(detail);
                    setProgress(currentProgress);
                    setProofs(visibleProofs);
                  })
                }
              >
                View details
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p>No Services Marketplace bookings yet.</p>
      )}
      {selected ? (
        <article>
          <h3>{selected.summary.referenceNumber}</h3>
          <p>
            {selected.address.line1}, {selected.address.locality},{" "}
            {selected.address.administrativeArea} {selected.address.postalCode}
          </p>
          <p>{selected.customerNotes || "No additional instructions."}</p>
          {progress ? (
            <div>
              <strong>{progress.status.replace(/_/g, " ")}</strong>
              {progress.provider?.displayName ? (
                <p>Service professional: {progress.provider.displayName}</p>
              ) : null}
              {progress.etaAtUtc ? (
                <p>ETA: {new Date(progress.etaAtUtc).toLocaleString()}</p>
              ) : null}
            </div>
          ) : null}
          {proofs.length ? <div><h4>Approved job proof</h4>{proofs.map((proof) => <p key={proof.publicId}>{proof.proofType.replace(/_/g, " ")} · {proof.fileName} <button onClick={() => void viewProof(selected.summary.id, proof.publicId)}>View</button></p>)}</div> : null}
          <CustomerAdditionalWork bookingId={selected.summary.id} />
          {selected.summary.status === "PENDING_PAYMENT" ? <ServicesPaymentPanel bookingId={selected.summary.id} amount={selected.summary.totalAmount} currency={selected.summary.currencyCode} /> : null}
          <CustomerCompletion bookingId={selected.summary.id} />
          <button onClick={() => { setSelected(null); setProgress(null); setProofs([]); }}>
            Close details
          </button>
        </article>
      ) : null}
    </section>
  );
}

function ServiceSection({
  title,
  items,
  loading,
  open,
  empty,
}: {
  title: string;
  items: DiscoveryService[];
  loading?: boolean;
  open: (id: string) => void;
  empty?: string;
}) {
  return (
    <section className="services-section">
      <div>
        <h2>{title}</h2>
        <span>{items.length} services</span>
      </div>
      {loading ? (
        <div className="services-state">Loading…</div>
      ) : items.length ? (
        <div className="services-grid">
          {items.map((x) => (
            <article key={x.id}>
              <div className="services-card-image">
                {x.imageUrl ? (
                  <img src={x.imageUrl} alt="" />
                ) : (
                  <span className="material-icons">home_repair_service</span>
                )}
              </div>
              <small>
                {x.categoryName} · {x.subCategoryName}
              </small>
              <h3>{x.name}</h3>
              <p>
                {x.shortDescription ||
                  "Professional service with transparent availability and pricing."}
              </p>
              {x.estimatedDurationMinutes ? (
                <em>{x.estimatedDurationMinutes} min estimated</em>
              ) : null}
              <button onClick={() => void open(x.id)}>View service</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="services-state">
          {empty || "Nothing curated here yet."}
        </div>
      )}
    </section>
  );
}
function ServiceDetail({
  detail,
  location,
  quote,
  loading,
  previewQuote,
  close,
}: {
  detail: DiscoveryDetail;
  location: {
    countryCode: string;
    administrativeArea: string;
    locality: string;
    postalCode: string;
  };
  quote: QuoteResult | null;
  loading: boolean;
  previewQuote: (e: FormEvent<HTMLFormElement>) => void;
  close: () => void;
}) {
  const [slotDate, setSlotDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ServiceSlot | null>(null);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotAreaId, setSlotAreaId] = useState("");
  const [slotHold, setSlotHold] = useState<ServiceSlotHold | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [replacementQuote, setReplacementQuote] = useState<QuoteResult | null>(
    null,
  );
  const [bookingRequestKey] = useState(() => crypto.randomUUID());
  async function loadSlots(asap: boolean) {
    setSlotMessage("");
    setSelectedSlot(null);
    try {
      const area = await checkServiceability({
        serviceId: detail.service.id,
        ...location,
      });
      if (!area.isServiceable || !area.areaId) {
        setSlots([]);
        setSlotMessage(area.reason);
        return;
      }
      setSlotAreaId(area.areaId);
      const result = await searchServiceSlots({
        serviceId: detail.service.id,
        areaId: area.areaId,
        date: slotDate,
        asap,
      });
      setSlots(result.slots);
      setSlotMessage(result.unavailableReason || "");
    } catch {
      setSlots([]);
      setSlotMessage("Available times could not be loaded.");
    }
  }
  async function reserveSlot() {
    if (!selectedSlot || !slotAreaId) return;
    try {
      const held = await holdServiceSlot({
        serviceId: detail.service.id,
        areaId: slotAreaId,
        startAtUtc: selectedSlot.startAtUtc,
        isInstant: selectedSlot.isInstant,
      });
      setSlotHold(await confirmServiceSlot(held));
    } catch {
      setSlotMessage("That slot is no longer available. Choose another time.");
    }
  }
  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || !slotHold) return;
    const form = new FormData(event.currentTarget);
    try {
      const result = await createServiceBooking({
        quoteId: replacementQuote?.quoteId || quote.quoteId,
        slotHoldId: slotHold.holdId,
        idempotencyKey: bookingRequestKey,
        acceptCurrentPrice: form.get("acceptPrice") === "on",
        customerNotes: String(form.get("customerNotes") || ""),
        address: {
          reference: null,
          line1: String(form.get("line1") || ""),
          line2: String(form.get("line2") || ""),
          locality: location.locality,
          administrativeArea: location.administrativeArea,
          postalCode: location.postalCode,
          countryCode: location.countryCode,
        },
      });
      setBookingMessage(
        result.created
          ? `Booking ${result.booking?.summary.referenceNumber} created.`
          : result.reason,
      );
      if (result.replacementQuote) setReplacementQuote(result.replacementQuote);
    } catch (error: unknown) {
      const data = (
        error as {
          response?: {
            data?: { reason?: string; replacementQuote?: QuoteResult };
          };
        }
      ).response?.data;
      if (data?.replacementQuote) setReplacementQuote(data.replacementQuote);
      setBookingMessage(data?.reason || "Booking could not be created.");
    }
  }
  const parse = (value?: string | null) => {
    try {
      return value ? (JSON.parse(value) as unknown[]) : [];
    } catch {
      return [];
    }
  };
  return (
    <section className="services-detail">
      <button onClick={close}>← Back to services</button>
      <div className="services-detail-head">
        <div>
          {detail.service.imageUrl ? (
            <img src={detail.service.imageUrl} alt="" />
          ) : (
            <span className="material-icons">construction</span>
          )}
        </div>
        <div>
          <small>
            {detail.service.categoryName} / {detail.service.subCategoryName}
          </small>
          <h1>{detail.service.name}</h1>
          <p>{detail.description || detail.service.shortDescription}</p>
        </div>
      </div>
      <div className="services-detail-grid">
        <article>
          <h3>What’s included</h3>
          <ul>
            {parse(detail.inclusionsJson).map((x, i) => (
              <li key={i}>{String(x)}</li>
            ))}
          </ul>
          <h3>Exclusions</h3>
          <ul>
            {parse(detail.exclusionsJson).map((x, i) => (
              <li key={i}>{String(x)}</li>
            ))}
          </ul>
          {detail.preparationInstructions ? (
            <>
              <h3>Before we arrive</h3>
              <p>{detail.preparationInstructions}</p>
            </>
          ) : null}
        </article>
        <form onSubmit={previewQuote}>
          <h3>Preview your quote</h3>
          {detail.packages.length ? (
            <label>
              Package
              <select name="packageId">
                <option value="">Base service</option>
                {detail.packages.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {detail.addOns.map((x) => (
            <label key={x.id}>
              <input type="checkbox" name={`addon-${x.id}`} /> {x.name}
            </label>
          ))}
          <label>
            Quantity
            <input name="quantity" type="number" min="1" defaultValue="1" />
          </label>
          <h3>Choose a time</h3>
          <label>
            Date
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
            />
          </label>
          <div>
            <button type="button" onClick={() => void loadSlots(false)}>
              Find times
            </button>
            <button type="button" onClick={() => void loadSlots(true)}>
              Find ASAP
            </button>
          </div>
          {slotMessage ? <p role="status">{slotMessage}</p> : null}
          <div className="services-slot-list">
            {slots.map((slot) => (
              <button
                type="button"
                key={slot.startAtUtc}
                aria-pressed={selectedSlot?.startAtUtc === slot.startAtUtc}
                onClick={() => setSelectedSlot(slot)}
              >
                {new Date(slot.startAtUtc).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {slot.remainingCapacity} left
              </button>
            ))}
          </div>
          {selectedSlot && !slotHold ? (
            <button type="button" onClick={() => void reserveSlot()}>
              Reserve this time
            </button>
          ) : null}
          {slotHold ? <p>Time confirmed for checkout.</p> : null}
          <input
            name="scheduledAtUtc"
            type="hidden"
            value={selectedSlot?.startAtUtc || ""}
          />
          <label>
            Currency
            <input
              name="currencyCode"
              defaultValue="USD"
              maxLength={3}
              required
            />
          </label>
          <label>
            <input name="isEmergency" type="checkbox" /> Emergency request
          </label>
          <button type="submit" disabled={loading || !selectedSlot}>
            {loading ? "Calculating…" : "Check area & preview quote"}
          </button>
        </form>
      </div>
      {quote ? (
        <div className="services-quote">
          <h3>Quote breakdown</h3>
          {quote.price.lines.map((x, i) => (
            <div key={`${x.code}-${i}`}>
              <span>{x.label}</span>
              <b>
                {quote.price.currencyCode} {x.amount.toFixed(2)}
              </b>
            </div>
          ))}
          <div className="services-quote-total">
            <span>Total</span>
            <strong>
              {quote.price.currencyCode} {quote.price.totalAmount.toFixed(2)}
            </strong>
          </div>
          <small>Expires {new Date(quote.expiresAtUtc).toLocaleString()}</small>
          {slotHold ? (
            <form onSubmit={createBooking}>
              <h3>Review and confirm</h3>
              {replacementQuote ? (
                <p>
                  <strong>
                    Updated price: {replacementQuote.price.currencyCode}{" "}
                    {replacementQuote.price.totalAmount.toFixed(2)}
                  </strong>
                  . Review and accept before resubmitting.
                </p>
              ) : null}
              <label>
                Address line 1<input name="line1" required />
              </label>
              <label>
                Address line 2<input name="line2" />
              </label>
              <label>
                Instructions
                <textarea name="customerNotes" maxLength={2000} />
              </label>
              <label>
                <input type="checkbox" name="acceptPrice" required /> I accept
                this price and service selection.
              </label>
              <button type="submit">Create booking</button>
              {bookingMessage ? <p role="status">{bookingMessage}</p> : null}
            </form>
          ) : (
            <p>Reserve a time to continue.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
