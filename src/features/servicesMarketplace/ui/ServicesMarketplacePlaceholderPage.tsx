import { useEffect, useState } from "react";
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
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import CustomerHeader from "../../home/ui/CustomerHeader";

type Surface = "customer" | "provider";
type PageState = "loading" | "enabled" | "unavailable";
type ServiceLocation = {
  countryCode: string;
  administrativeArea: string;
  locality: string;
  postalCode: string;
};
const recentKey = "chaodesi_services_recent_v1";
const fallbackCategoryNames = ["Home repair", "Appliance & HVAC", "Cleaning", "Pest control"];
type HeroQuickCategory = {
  key: string;
  label: string;
  imageUrl?: string | null;
  categoryId: string;
  subCategoryId?: string;
  query?: string;
  durationMinutes?: number | null;
};

function serviceIcon(value: string) {
  const name = value.toLowerCase();
  if (name.includes("clean")) return "cleaning_services";
  if (name.includes("paint")) return "format_paint";
  if (name.includes("ac") || name.includes("hvac") || name.includes("appliance")) return "ac_unit";
  if (name.includes("pest")) return "pest_control";
  if (name.includes("electric")) return "electrical_services";
  if (name.includes("plumb")) return "plumbing";
  return "home_repair_service";
}

function serviceImage(value: string, index = 0) {
  const name = value.toLowerCase();
  if (name.includes("clean") || name.includes("sofa") || name.includes("carpet")) return "/services-marketplace/categories/cleaning.png";
  if (name.includes("ac") || name.includes("hvac") || name.includes("appliance") || name.includes("refrigerator") || name.includes("washing")) return "/services-marketplace/categories/appliance-hvac.png";
  if (name.includes("electric") || name.includes("plumb") || name.includes("repair") || name.includes("carpenter") || name.includes("handyman")) return "/services-marketplace/categories/home-repair.png";
  if (name.includes("pest")) return "/services-marketplace/categories/pest-control.png";
  return ["/template-17/images/services/6.jpeg", "/template-17/images/services/7.jpg", "/template-17/images/services/8.jpg"][index % 3];
}

function categoryImage(value: string, index = 0) {
  return serviceImage(value, index);
}

function localDateInput(daysFromToday = 0) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + daysFromToday);
  return value.toISOString().slice(0, 10);
}

export default function ServicesMarketplacePlaceholderPage({
  surface,
  cityName,
}: {
  surface: Surface;
  cityName?: string;
}) {
  const { activeCity, activeLocationLabel } = useHomeSelectedLocation();
  const resolvedCity = cityName || activeCity || "";
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
  const [hasSearched, setHasSearched] = useState(false);
  const [location, setLocation] = useState<ServiceLocation>({
    // The local pilot is seeded for India. Keep the default development-only
    // value so a customer can try the flow immediately; production still
    // starts blank and requires an explicit country code.
    countryCode: import.meta.env.DEV ? "IN" : "",
    administrativeArea: "",
    locality: resolvedCity,
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const heroQuickCategories: HeroQuickCategory[] = [
    ...categories.map((category, index) => ({
      key: `category-${category.id}`,
      label: category.name?.trim() || fallbackCategoryNames[index] || "Home services",
      imageUrl: category.imageUrl || categoryImage(category.name || fallbackCategoryNames[index] || "Home services", index),
      categoryId: category.id,
    })),
    ...categories.flatMap((category) =>
      category.subCategories.map((subCategory, index) => ({
        key: `subcategory-${subCategory.id}`,
        label: subCategory.name?.trim() || category.name,
        imageUrl: subCategory.imageUrl || category.imageUrl || categoryImage(`${category.name} ${subCategory.name}`, index),
        categoryId: category.id,
        subCategoryId: subCategory.id,
      })),
    ),
    ...results.items.map((service, index) => ({
      key: `service-${service.id}`,
      label: service.name,
      imageUrl: service.imageUrl || serviceImage(service.name, index),
      categoryId: service.categoryId,
      subCategoryId: service.subCategoryId,
      query: service.name,
      durationMinutes: service.estimatedDurationMinutes,
    })),
  ]
    .filter((item, index, all) => all.findIndex((x) => x.label.toLowerCase() === item.label.toLowerCase()) === index)
    .slice(0, 12);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const displayLocation = activeLocationLabel || resolvedCity || location.locality || "Select location";
  const normalizedSearch = query.trim().toLowerCase();
  const serviceSuggestions = normalizedSearch.length >= 2
    ? [
        ...results.items,
        ...popular,
        ...trending,
        ...recommended,
        ...recent,
      ]
        .filter((service, index, all) => all.findIndex((item) => item.id === service.id) === index)
        .filter((service) =>
          `${service.name} ${service.categoryName} ${service.subCategoryName} ${service.shortDescription || ""}`
            .toLowerCase()
            .includes(normalizedSearch),
        )
        .slice(0, 6)
    : [];
  const categorySuggestions = normalizedSearch.length >= 2
    ? categories
        .filter((category) =>
          `${category.name} ${category.subCategories?.map((item) => item.name).join(" ") || ""}`
            .toLowerCase()
            .includes(normalizedSearch),
        )
        .slice(0, 4)
    : [];
  const hasAutocompleteSuggestions = serviceSuggestions.length > 0 || categorySuggestions.length > 0;
  useEffect(() => {
    if (cityName || !activeCity || location.locality) return;
    setLocation((current) => ({ ...current, locality: activeCity }));
  }, [activeCity, cityName, location.locality]);
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
  async function search(page = 1, categoryOverride = categoryId, queryOverride = query, subCategoryOverride = subCategoryId) {
    setLoading(true);
    setError("");
    setDetail(null);
    setQuote(null);
    setHasSearched(true);
    try {
      setResults(
        await searchDiscoveryServices({
          q: queryOverride || undefined,
          categoryId: categoryOverride || undefined,
          subCategoryId: subCategoryOverride || undefined,
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
  function submitHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(1);
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
    if (location.countryCode.trim().length < 2) {
      setError("Enter your country code (for the local pilot, use IN) before checking availability.");
      setQuote(null);
      return;
    }
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
  if (state === "loading") {
    const content = <div className="services-state">Loading Services Marketplace…</div>;
    return surface === "provider" ? (
      <DashboardLayout>{content}</DashboardLayout>
    ) : (
      <div className="services-marketplace-page">
        <CustomerHeader />
        <main className="services-discovery">{content}</main>
      </div>
    );
  }
  if (state === "unavailable") {
    const content = (
      <div className="services-state">
        <h1>Services Marketplace unavailable</h1>
        <p>The module is disabled or your account does not have access.</p>
        <Link to="/dashboard">Return to dashboard</Link>
      </div>
    );
    return surface === "provider" ? (
      <DashboardLayout>{content}</DashboardLayout>
    ) : (
      <div className="services-marketplace-page">
        <CustomerHeader />
        <main className="services-discovery">{content}</main>
      </div>
    );
  }
  if (surface === "provider")
    return (
      <DashboardLayout>
        <ProviderOnboarding />
        <ProviderJobOffers />
        <ProviderJobWorkspace />
      </DashboardLayout>
    );
  return (
    <div className="services-marketplace-page">
      <CustomerHeader />
      <main className="services-discovery">
        {!detail ? <header className="services-landing-hero">
          <video className="services-landing-video" autoPlay muted loop playsInline>
            <source src="/template-17/videos/bg-video.mp4" type="video/mp4" />
          </video>
          <div className="services-landing-overlay" />
          <div className="services-landing-inner">
          <div className="services-landing-copy">
          <span>CHAO DESI SERVICES</span>
          <h1>{resolvedCity ? `Home services in ${resolvedCity}` : "Home services at your doorstep"}</h1>
          <p>
            Home services at your doorstep. Browse trusted professionals,
            confirm availability, and see a server-calculated quote before
            you book.
          </p>
          <div className="services-hero-meta">
            <span>✓ Verified professionals</span>
            <span>✓ Upfront pricing</span>
            <span>✓ Secure booking</span>
          </div>
          <form className="services-hero-search" onSubmit={submitHeroSearch}>
            <label>
              <span className="material-icons" aria-hidden="true">layers</span>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSubCategoryId("");
                }}
                aria-label="Select service category"
              >
                <option value="">All services</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="services-hero-location"
              onClick={() => document.getElementById("services-results")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <span className="material-icons" aria-hidden="true">my_location</span>
              <span>{displayLocation}</span>
            </button>
            <div className="services-hero-query">
              <span className="material-icons" aria-hidden="true">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
              />
              {hasAutocompleteSuggestions ? (
                <div className="services-autocomplete" role="listbox" aria-label="Service suggestions">
                  {categorySuggestions.map((category) => (
                    <button
                      type="button"
                      role="option"
                      key={`category-${category.id}`}
                      onClick={() => {
                        setCategoryId(category.id);
                        setSubCategoryId("");
                        setQuery(category.name);
                        void search(1, category.id, category.name);
                      }}
                    >
                      <span className="material-icons" aria-hidden="true">{categoryIcon(category.name)}</span>
                      <span><strong>{category.name}</strong><small>Category</small></span>
                    </button>
                  ))}
                  {serviceSuggestions.map((service) => (
                    <button
                      type="button"
                      role="option"
                      key={`service-${service.id}`}
                      onClick={() => {
                        setQuery(service.name);
                        void openService(service.id);
                      }}
                    >
                      <img src={service.imageUrl || serviceImage(service.name)} alt="" />
                      <span><strong>{service.name}</strong><small>{service.categoryName} / {service.subCategoryName}</small></span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="submit">Search</button>
          </form>
          <div className="services-hero-subfilters">
            <select
              value={subCategoryId}
              onChange={(event) => setSubCategoryId(event.target.value)}
              aria-label="Select service subcategory"
            >
              <option value="">All subcategories</option>
              {selectedCategory?.subCategories?.map((subCategory) => (
                <option value={subCategory.id} key={subCategory.id}>{subCategory.name}</option>
              ))}
            </select>
            <input
              value={location.countryCode}
              onChange={(event) => setLocation((current) => ({ ...current, countryCode: event.target.value }))}
              aria-label="Country code"
              placeholder="Country"
            />
            <input
              value={location.locality}
              onChange={(event) => setLocation((current) => ({ ...current, locality: event.target.value }))}
              aria-label="City"
              placeholder="City"
            />
          </div>
          <div className="services-hero-category-panel" id="services-categories">
            <div className="services-hero-category-heading">
              <strong>What do you need help with?</strong>
              <span>{heroQuickCategories.length} categories</span>
            </div>
            <div className="services-hero-category-grid" aria-label="Service categories">
              <button
                type="button"
                className={!categoryId ? "is-active" : ""}
                onClick={() => {
                  setCategoryId("");
                  setSubCategoryId("");
                  void search(1, "");
                }}
              >
                <span className="services-category-thumb">
                  <img src="/template-17/images/icon/shop.png" alt="" />
                  <span className="material-icons" aria-hidden="true">storefront</span>
                </span>
                <span>All Services</span>
              </button>
              {heroQuickCategories.map((category, index) => (
                <button
                  type="button"
                  className={categoryId === category.categoryId && (!category.subCategoryId || subCategoryId === category.subCategoryId) ? "is-active" : ""}
                  key={category.key}
                  onClick={() => {
                    setCategoryId(category.categoryId);
                    setSubCategoryId(category.subCategoryId || "");
                    setQuery(category.query || "");
                    void search(1, category.categoryId, category.query || "", category.subCategoryId || "");
                  }}
                >
                  <span className="services-category-thumb">
                    <img
                      src={category.imageUrl || categoryImage(category.label, index)}
                      alt=""
                      onError={(event) => {
                        const fallback = categoryImage(category.label, index);
                        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                      }}
                    />
                    <span className="material-icons" aria-hidden="true">{categoryIcon(category.label)}</span>
                  </span>
                  <span>{category.label}</span>
                  {category.durationMinutes ? <small>{category.durationMinutes} mins</small> : null}
                </button>
              ))}
            </div>
          </div>
          </div>
          <div className="services-hero-collage" aria-label="Popular home services">
            {(popular.length ? popular.slice(0, 4) : results.items.slice(0, 4)).map((service, index) => (
              <button
                type="button"
                className={`services-hero-tile services-hero-tile-${index + 1}`}
                key={service.id}
                onClick={() => void openService(service.id)}
              >
                <img
                  src={service.imageUrl || serviceImage(service.name, index)}
                  alt=""
                  onError={(event) => {
                    const fallback = serviceImage(service.name, index);
                    if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                  }}
                />
                <span className="services-hero-tile-label">{service.name}</span>
              </button>
            ))}
          </div>
          </div>
        </header> : null}
        {!detail ? (
          <>
            <section className="services-spotlight" aria-label="Featured services">
              <article className="services-spotlight-card services-spotlight-card-main">
                <img src="/services-marketplace/categories/home-repair.png" alt="" />
                <div><small>CHAODESI SPOTLIGHT</small><h2>Trusted help for every home task</h2><p>Choose a verified professional, see the quote upfront and book a time that works for you.</p><a href="#services-categories">Browse services</a></div>
              </article>
              <article className="services-spotlight-card"><img src="/services-marketplace/categories/appliance-hvac.png" alt="" /><div><small>APPLIANCE CARE</small><h3>Keep your home running</h3><a href="#services-categories">Explore appliance services</a></div></article>
              <article className="services-spotlight-card"><img src="/services-marketplace/categories/cleaning.png" alt="" /><div><small>HOME CARE</small><h3>Fresh spaces, less effort</h3><a href="#services-categories">Explore cleaning services</a></div></article>
            </section>
            <section className="services-trust-strip" aria-label="Why book with Chao Desi">
              <div><span className="material-icons">verified</span><strong>Verified professionals</strong><small>Eligibility checked before matching</small></div>
              <div><span className="material-icons">payments</span><strong>Clear pricing</strong><small>Server-calculated quote before booking</small></div>
              <div><span className="material-icons">schedule</span><strong>Flexible slots</strong><small>Choose a time that suits your day</small></div>
              <div><span className="material-icons">support_agent</span><strong>Support when needed</strong><small>Help throughout your booking</small></div>
            </section>
          </>
        ) : null}
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
            onLocationChange={(field, value) => {
              setLocation((current) => ({ ...current, [field]: value }));
              // A quote/slot is tied to the service location. Editing the
              // location invalidates both so the customer cannot submit a
              // quote calculated for a different area.
              setQuote(null);
            }}
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
            <div id="services-results" className="services-results-anchor" />
            <ServiceSection
              title={hasSearched ? "Search results" : "Available services"}
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
            {!hasSearched ? (
              <>
                <ServiceSection
                  title={resolvedCity ? `Featured in ${resolvedCity}` : "Featured services"}
                  items={popular.length ? popular : results.items.slice(0, 6)}
                  open={openService}
                  hideWhenEmpty
                />
                <ServiceSection title="Most booked services" items={results.items} open={openService} hideWhenEmpty />
                <ServiceSection
                  title="Cleaning essentials"
                  items={results.items.filter((x) => /clean|sofa|carpet|pest/i.test(`${x.name} ${x.categoryName} ${x.subCategoryName}`))}
                  open={openService}
                  hideWhenEmpty
                />
                <ServiceSection
                  title="Appliance care"
                  items={results.items.filter((x) => /appliance|hvac|ac|refriger|washing|microwave/i.test(`${x.name} ${x.categoryName} ${x.subCategoryName}`))}
                  open={openService}
                  hideWhenEmpty
                />
                <ServiceSection
                  title="Home repair & installation"
                  items={results.items.filter((x) => /repair|electric|plumb|carpenter|handyman/i.test(`${x.name} ${x.categoryName} ${x.subCategoryName}`))}
                  open={openService}
                  hideWhenEmpty
                />
                <ServiceSection title="Trending now" items={trending} open={openService} hideWhenEmpty />
                <ServiceSection title="Recommended for you" items={recommended} open={openService} hideWhenEmpty />
                {recent.length ? (
                  <ServiceSection
                    title="Recently viewed on this device"
                    items={recent}
                    open={openService}
                  />
                ) : null}
                <MyBookings />
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function MyBookings() {
  const [items, setItems] = useState<BookingSummary[]>([]);
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [progress, setProgress] = useState<CustomerJobProgress | null>(null);
  const [proofs, setProofs] = useState<JobProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  async function load() {
    try {
      setLoading(true);
      setLoadError("");
      setItems(await getServiceBookings());
    } catch {
      setLoadError("Bookings could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const visibleItems = items.filter((booking) => bookingMatchesFilter(booking, filter));
  async function viewProof(bookingId: string, proofId: string) {
    const access = await getCustomerJobProofAccess(bookingId, proofId);
    const blob = await downloadJobProof(access.token);
    const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return (
    <section className="services-bookings-panel">
      <header className="services-bookings-head">
        <div>
          <span>Services account</span>
          <h2>My bookings</h2>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          <span className="material-icons" aria-hidden="true">refresh</span>
          Refresh
        </button>
      </header>
      <div className="services-bookings-filters" role="tablist" aria-label="Filter bookings">
        {[
          ["all", "All"],
          ["active", "Active"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
          ["payment", "Payment"],
        ].map(([value, label]) => (
          <button type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} key={value}>
            {label}
          </button>
        ))}
      </div>
      {loadError ? <div className="services-alert" role="alert">{loadError}</div> : null}
      {loading ? (
        <div className="services-bookings-empty">Loading your bookings...</div>
      ) : visibleItems.length ? (
        <div className="services-bookings-list">
          {visibleItems.map((x) => (
            <article
              className="services-booking-row"
              key={x.id}
              role="button"
              tabIndex={0}
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
              <span className="services-booking-thumb"><img src={serviceImage(x.serviceName)} alt="" /></span>
              <span className="services-booking-main">
              <small>{x.referenceNumber}</small>
              <h3>{x.serviceName}</h3>
              <p>
                {new Date(x.requestedStartAtUtc).toLocaleString()} ·{" "}
                {x.status.replace(/_/g, " ")}
              </p>
              <strong className="services-booking-price">
                {x.currencyCode} {x.totalAmount.toFixed(2)}
              </strong>
              </span>
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
        <article className="services-booking-detail">
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

function bookingMatchesFilter(booking: BookingSummary, filter: string) {
  const status = booking.status.toLowerCase();
  if (filter === "completed") return status.includes("complete") || status.includes("delivered");
  if (filter === "cancelled") return status.includes("cancel");
  if (filter === "payment") return status.includes("payment") || status.includes("refund");
  if (filter === "active") return !status.includes("complete") && !status.includes("cancel") && !status.includes("fail");
  return true;
}

function ServiceSection({
  title,
  items,
  loading,
  open,
  empty,
  hideWhenEmpty,
}: {
  title: string;
  items: DiscoveryService[];
  loading?: boolean;
  open: (id: string) => void;
  empty?: string;
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && !items.length) return null;
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
                  {x.imageUrl || serviceImage(x.name) ? (
                    <img
                      src={x.imageUrl || serviceImage(x.name)}
                      alt=""
                      onError={(event) => {
                        const fallback = serviceImage(x.name);
                        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                      }}
                    />
                ) : (
                  <span className="services-media-glyph" aria-hidden="true"><span className="services-media-initial">{x.name.trim().charAt(0).toUpperCase()}</span><span className="material-icons">{serviceIcon(x.name)}</span></span>
                )}
              </div>
              <small>
                {x.categoryName} · {x.subCategoryName}
              </small>
              <h3>{x.name}</h3>
              <div className="services-card-facts">
                <ServiceRating rating={x.averageRating} reviewCount={x.reviewCount} />
                {x.startingPrice != null ? (
                  <strong className="services-card-price">
                    From {x.startingPriceCurrency || "USD"} {x.startingPrice.toFixed(2)}
                  </strong>
                ) : (
                  <strong className="services-card-price">Price after area check</strong>
                )}
              </div>
              <p>
                {x.shortDescription ||
                  "Professional service with transparent availability and pricing."}
              </p>
              {x.estimatedDurationMinutes ? (
                <em>{x.estimatedDurationMinutes} min estimated</em>
              ) : null}
              <button onClick={() => void open(x.id)}>View &amp; book</button>
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

function categoryIcon(name: string) {
  const value = name.toLowerCase();
  if (value.includes("clean")) return "cleaning_services";
  if (value.includes("appliance") || value.includes("hvac")) return "kitchen";
  if (value.includes("pest")) return "pest_control";
  if (value.includes("repair") || value.includes("home")) return "home_repair_service";
  return "handyman";
}

function ServiceRating({ rating, reviewCount }: { rating?: number | null; reviewCount: number }) {
  if (!rating || reviewCount === 0) {
    return <span className="services-rating services-rating-new">New service</span>;
  }
  return (
    <span className="services-rating" aria-label={`${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}>
      <span aria-hidden="true">★★★★★</span> <b>{rating.toFixed(1)}</b> ({reviewCount})
    </span>
  );
}

function formatContentValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entry = value as { question?: unknown; answer?: unknown; q?: unknown; a?: unknown };
    const question = entry.question ?? entry.q;
    const answer = entry.answer ?? entry.a;
    if (question || answer) return `${String(question || "Question")}: ${String(answer || "")}`;
  }
  return String(value);
}

function ServiceDetail({
  detail,
  location,
  onLocationChange,
  quote,
  loading,
  previewQuote,
  close,
}: {
  detail: DiscoveryDetail;
  location: ServiceLocation;
  onLocationChange: (field: keyof ServiceLocation, value: string) => void;
  quote: QuoteResult | null;
  loading: boolean;
  previewQuote: (e: FormEvent<HTMLFormElement>) => void;
  close: () => void;
}) {
  const [slotDate, setSlotDate] = useState(
    localDateInput(1),
  );
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ServiceSlot | null>(null);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotAreaId, setSlotAreaId] = useState("");
  const [slotHold, setSlotHold] = useState<ServiceSlotHold | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<BookingDetail | null>(null);
  const [replacementQuote, setReplacementQuote] = useState<QuoteResult | null>(
    null,
  );
  const [bookingRequestKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    // Slot capacity and serviceability are location-bound. Never retain a
    // hold when the customer edits the location fields.
    setSlots([]);
    setSelectedSlot(null);
    setSlotHold(null);
    setSlotAreaId("");
    setSlotMessage("");
  }, [location.countryCode, location.administrativeArea, location.locality, location.postalCode]);
  async function loadSlots(asap: boolean) {
    setSlotMessage("");
    setSelectedSlot(null);
    setSlotHold(null);
    setSlotAreaId("");
    if (location.countryCode.trim().length < 2) {
      setSlots([]);
      setSlotMessage("Enter your country code above (for the local pilot, use IN), then try again.");
      return;
    }
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
        // ASAP searches from the current local day; a previously selected
        // future date must not silently turn an ASAP request into tomorrow's
        // first slot.
        date: asap ? localDateInput(0) : slotDate,
        asap,
      });
      if (asap) setSlotDate(localDateInput(0));
      setSlots(result.slots);
      setSlotMessage(result.unavailableReason || "");
    } catch (error: unknown) {
      setSlots([]);
      const response = (error as {
        response?: { data?: { message?: string; title?: string; errors?: Record<string, string[]> } };
      }).response;
      const validation = response?.data?.errors
        ? Object.values(response.data.errors).flat().join(" ")
        : "";
      setSlotMessage(
        response?.data?.message ||
          validation ||
          response?.data?.title ||
          "Available times could not be loaded. Please check the service location and try again.",
      );
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
      if (result.created && result.booking) setCreatedBooking(result.booking);
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
  const inclusions = parse(detail.inclusionsJson);
  const exclusions = parse(detail.exclusionsJson);
  const faqs = parse(detail.faqJson);
  return (
    <section className="services-detail">
      <button onClick={close}>← Back to services</button>
      <div className="services-detail-head">
        <div>
          {detail.service.imageUrl ? (
            <img src={detail.service.imageUrl} alt="" />
          ) : (
            <span className="services-media-glyph" aria-hidden="true">✦</span>
          )}
        </div>
        <div>
          <small>
            {detail.service.categoryName} / {detail.service.subCategoryName}
          </small>
          <h1>{detail.service.name}</h1>
          <p>{detail.description || detail.service.shortDescription}</p>
          <div className="services-detail-facts">
            <ServiceRating rating={detail.service.averageRating} reviewCount={detail.service.reviewCount} />
            {detail.service.startingPrice != null ? (
              <strong>From {detail.service.startingPriceCurrency || "USD"} {detail.service.startingPrice.toFixed(2)}</strong>
            ) : <strong>Final price after area and time check</strong>}
            {detail.estimatedDurationMinutes ? <span>{detail.estimatedDurationMinutes} min estimated</span> : null}
          </div>
        </div>
      </div>
      <div className="services-booking-steps" aria-label="Booking progress">
        <span className="is-current"><b>1</b> Choose options</span>
        <span><b>2</b> Pick a time</span>
        <span><b>3</b> Confirm &amp; pay</span>
      </div>
      <div className="services-detail-grid">
        <article>
          <h3>What’s included</h3>
          <ul>
            {(inclusions.length ? inclusions : ["Professional assessment and service"]).map((x, i) => (
              <li key={i}>{String(x)}</li>
            ))}
          </ul>
          <h3>Exclusions</h3>
          <ul>
            {(exclusions.length ? exclusions : ["Parts and materials not shown in the quote"]).map((x, i) => (
              <li key={i}>{String(x)}</li>
            ))}
          </ul>
          <p className="services-detail-note">
            Final pricing is calculated after your area and time are checked.
          </p>
          {detail.preparationInstructions ? (
            <>
              <h3>Before we arrive</h3>
              <p>{detail.preparationInstructions}</p>
            </>
          ) : null}
          {faqs.length ? (
            <>
              <h3>Frequently asked questions</h3>
              <ul className="services-faq-list">
                {faqs.map((x, i) => <li key={i}>{formatContentValue(x)}</li>)}
              </ul>
            </>
          ) : null}
        </article>
        <form onSubmit={previewQuote}>
          <h3>Build your booking</h3>
          <p className="services-form-note">Select a package, add-ons, location and time. The server calculates the final price before booking.</p>
          <fieldset className="services-location-fields">
            <legend>Service location</legend>
            <div>
              <label>
                Country code
                <input
                  value={location.countryCode}
                  onChange={(e) => onLocationChange("countryCode", e.target.value.toUpperCase())}
                  placeholder="IN"
                  maxLength={3}
                  required
                />
              </label>
              <label>
                State / province
                <input
                  value={location.administrativeArea}
                  onChange={(e) => onLocationChange("administrativeArea", e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                City / locality
                <input
                  value={location.locality}
                  onChange={(e) => onLocationChange("locality", e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                Postal / ZIP
                <input
                  value={location.postalCode}
                  onChange={(e) => onLocationChange("postalCode", e.target.value)}
                  placeholder="Optional unless required"
                />
              </label>
            </div>
          </fieldset>
          {detail.packages.length ? (
            <label>
              Package
              <select name="packageId">
                <option value="">Base service</option>
                {detail.packages.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}{x.price ? ` · ${x.price.currencyCode} ${x.price.amount.toFixed(2)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {detail.addOns.map((x) => (
            <label key={x.id}>
              <input type="checkbox" name={`addon-${x.id}`} /> {x.name}{x.price ? ` · ${x.price.currencyCode} ${x.price.amount.toFixed(2)}` : ""}
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
              min={localDateInput(0)}
              value={slotDate}
              onChange={(e) => {
                setSlotDate(e.target.value);
                setSlots([]);
                setSelectedSlot(null);
                setSlotHold(null);
                setSlotMessage("");
              }}
            />
          </label>
          <p className="services-location-note">
            Availability is checked for <strong>{location.countryCode || "your country"}</strong>
            {location.locality ? ` · ${location.locality}` : ""}
            {location.postalCode ? ` · ${location.postalCode}` : ""}.
            Update the location fields above if this is not your service address.
          </p>
          <div className="services-slot-actions">
            <button type="button" disabled={loading || location.countryCode.trim().length < 2} onClick={() => void loadSlots(false)}>
              Find times
            </button>
            <button type="button" disabled={loading || location.countryCode.trim().length < 2} onClick={() => void loadSlots(true)}>
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
          {slotHold ? <p className="services-success-note">Time confirmed for checkout. Hold expires {new Date(slotHold.expiresAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p> : null}
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
          <div><span>Subtotal</span><b>{quote.price.currencyCode} {quote.price.subtotalAmount.toFixed(2)}</b></div>
          {quote.price.discountAmount ? <div><span>Discount</span><b>-{quote.price.currencyCode} {quote.price.discountAmount.toFixed(2)}</b></div> : null}
          {quote.price.feeAmount ? <div><span>Fees</span><b>{quote.price.currencyCode} {quote.price.feeAmount.toFixed(2)}</b></div> : null}
          {quote.price.taxAmount ? <div><span>Tax</span><b>{quote.price.currencyCode} {quote.price.taxAmount.toFixed(2)}</b></div> : null}
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
          {createdBooking ? (
            <div className="services-payment-step">
              <h3>Payment</h3>
              <p>Booking {createdBooking.summary.referenceNumber} is awaiting payment.</p>
              <ServicesPaymentPanel bookingId={createdBooking.summary.id} amount={createdBooking.summary.totalAmount} currency={createdBooking.summary.currencyCode} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
