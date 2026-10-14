import { useEffect, useRef, useState } from "react";
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
import ProviderWorkspace from "./ProviderWorkspace";
import { CustomerAdditionalWork } from "./AdditionalWorkPanel";
import ServicesPaymentPanel from "./ServicesPaymentPanel";
import { CustomerCompletion } from "./CompletionPanel";
import BookingAftercarePanel from "./BookingAftercarePanel";
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
type SavedServiceAddress = ServiceLocation & { id: string; line1: string; line2: string; label: string };
const recentKey = "chaodesi_services_recent_v1";
const savedAddressesKey = "chaodesi_services_saved_addresses_v1";
const fallbackCategoryNames = ["Home repair", "Appliance & HVAC", "Cleaning", "Pest control"];
const heroFallbackTiles = [
  { label: "Home Repair", imageUrl: "/services-marketplace/categories/home-repair.png" },
  { label: "Appliance & HVAC", imageUrl: "/services-marketplace/categories/appliance-hvac.png" },
  { label: "Cleaning", imageUrl: "/services-marketplace/categories/cleaning.png" },
];
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
  if (name.includes("women") && (name.includes("salon") || name.includes("spa"))) return "/services-marketplace/categories/womens-salon-spa.png";
  if (name.includes("men") && (name.includes("salon") || name.includes("massage"))) return "/services-marketplace/categories/mens-salon-massage.png";
  if (name.includes("salon") || name.includes("spa") || name.includes("beauty") || name.includes("makeup")) return "/services-marketplace/categories/womens-salon-spa.png";
  if (name.includes("massage") || name.includes("groom") || name.includes("haircut")) return "/services-marketplace/categories/mens-salon-massage.png";
  if (name.includes("instahelp") || name.includes("assistance") || name.includes("helper") || name.includes("errand")) return "/services-marketplace/categories/instahelp.png";
  if (name.includes("clean") || name.includes("sofa") || name.includes("carpet")) return "/services-marketplace/categories/cleaning.png";
  if (name.includes("wall panel") || name.includes("renovation")) return "/services-marketplace/categories/wall-panels-renovation.png";
  if (name.includes("paint") || name.includes("waterproof")) return "/services-marketplace/categories/painting-waterproofing.png";
  if (name.includes("smart") || name.includes("purifier") || name.includes("cctv") || name.includes("lock")) return "/services-marketplace/categories/smart-home-services.png";
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

function readSavedServiceAddresses(): SavedServiceAddress[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(savedAddressesKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.line1) : [];
  } catch {
    return [];
  }
}

async function searchDiscoveryWithWiderArea(params: Record<string, string | number | undefined>) {
  const page = await searchDiscoveryServices(params);
  const hasCoordinates = params.latitude !== undefined && params.longitude !== undefined;
  if (page.totalCount > 0 || !hasCoordinates) return { page, usedFallback: false };

  const widerAreaParams = { ...params };
  delete widerAreaParams.latitude;
  delete widerAreaParams.longitude;
  delete widerAreaParams.radiusKm;
  const widerPage = await searchDiscoveryServices(widerAreaParams);
  return { page: widerPage, usedFallback: widerPage.totalCount > 0 };
}

export default function ServicesMarketplacePlaceholderPage({
  surface,
  cityName,
}: {
  surface: Surface;
  cityName?: string;
}) {
  const { activeCity, activeLocation, activeLocationLabel, currentLocation } = useHomeSelectedLocation();
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
  const [categoryDialog, setCategoryDialog] = useState<DiscoveryCategory | null>(null);
  const [catalogMode, setCatalogMode] = useState(false);
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
  const [showingWiderArea, setShowingWiderArea] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const resultsRequestRef = useRef(0);
  const heroQuickCategories: HeroQuickCategory[] = categories
    .map((category, index) => ({
      key: `category-${category.id}`,
      label: category.name?.trim() || fallbackCategoryNames[index] || "Home services",
      imageUrl: category.imageUrl || categoryImage(category.name || fallbackCategoryNames[index] || "Home services", index),
      categoryId: category.id,
    }))
    .filter((item, index, all) => all.findIndex((x) => x.label.toLowerCase() === item.label.toLowerCase()) === index)
    .slice(0, 12);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const heroFeaturedServices = [...popular, ...results.items]
    .filter((service, index, all) => all.findIndex((item) => item.id === service.id) === index)
    .slice(0, 3);
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
    const selectedCountry = activeLocation.countryName?.trim().toUpperCase() || "";
    const countryCode = selectedCountry === "INDIA" ? "IN" : selectedCountry === "UNITED STATES" || selectedCountry === "USA" ? "US" : selectedCountry;
    setLocation((current) => ({
      ...current,
      countryCode: countryCode || current.countryCode,
      administrativeArea: activeLocation.stateName?.trim() || "",
      locality: cityName || activeCity || "",
    }));
  }, [activeCity, activeLocation.countryName, activeLocation.stateName, cityName]);
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
    const requestId = ++resultsRequestRef.current;
    setLoading(true);
    setError("");
    const locationParams = {
      countryCode: location.countryCode || undefined,
      administrativeArea: location.administrativeArea || undefined,
      locality: location.locality || undefined,
      postalCode: location.postalCode || undefined,
      latitude: currentLocation.latitude ?? undefined,
      longitude: currentLocation.longitude ?? undefined,
      radiusKm: 20,
    };
    Promise.all([
      getDiscoveryCategories(),
      searchDiscoveryWithWiderArea({ ...locationParams, section: "popular", pageSize: 6 }),
      searchDiscoveryWithWiderArea({ ...locationParams, section: "trending", pageSize: 6 }),
      searchDiscoveryWithWiderArea({ ...locationParams, section: "recommended", pageSize: 6 }),
      searchDiscoveryWithWiderArea({ ...locationParams, pageSize: 12 }),
    ])
      .then(([c, p, t, r, all]) => {
        setCategories(c);
        setPopular(p.page.items);
        setTrending(t.page.items);
        setRecommended(r.page.items);
        if (requestId === resultsRequestRef.current) {
          setResults(all.page);
          setShowingWiderArea(p.usedFallback || t.usedFallback || r.usedFallback || all.usedFallback);
        }
        const ids: string[] = JSON.parse(
          localStorage.getItem(recentKey) || "[]",
        );
        setRecent(
          ids
            .map((id) =>
              [...all.page.items, ...p.page.items, ...t.page.items, ...r.page.items].find(
                (x) => x.id === id,
              ),
            )
            .filter(Boolean) as DiscoveryService[],
        );
      })
      .catch(() => setError("Services could not be loaded. Please try again."))
      .finally(() => {
        if (requestId === resultsRequestRef.current) setLoading(false);
      });
  }, [
    state,
    surface,
    location.countryCode,
    location.administrativeArea,
    location.locality,
    location.postalCode,
    currentLocation.latitude,
    currentLocation.longitude,
  ]);
  async function search(page = 1, categoryOverride = categoryId, queryOverride = query, subCategoryOverride = subCategoryId) {
    const requestId = ++resultsRequestRef.current;
    setLoading(true);
    setError("");
    setDetail(null);
    setQuote(null);
    setHasSearched(true);
    try {
      const response = await searchDiscoveryWithWiderArea({
          q: queryOverride || undefined,
          categoryId: categoryOverride || undefined,
          subCategoryId: subCategoryOverride || undefined,
          countryCode: location.countryCode || undefined,
          administrativeArea: location.administrativeArea || undefined,
          locality: location.locality || undefined,
          postalCode: location.postalCode || undefined,
          latitude: currentLocation.latitude ?? undefined,
          longitude: currentLocation.longitude ?? undefined,
          radiusKm: 20,
          page,
          pageSize: 12,
        });
      if (requestId !== resultsRequestRef.current) return;
      setResults(response.page);
      setShowingWiderArea(response.usedFallback);
    } catch {
      if (requestId !== resultsRequestRef.current) return;
      setError("Search is temporarily unavailable. Please try again.");
      setResults({ items: [], page: 1, pageSize: 12, totalCount: 0 });
    } finally {
      if (requestId === resultsRequestRef.current) setLoading(false);
    }
  }
  function deriveSubCategories(category: DiscoveryCategory, services: DiscoveryService[]) {
    const seen = new Set<string>();
    return services
      .filter((service) => service.categoryId === category.id && service.subCategoryId && !seen.has(service.subCategoryId))
      .map((service) => {
        seen.add(service.subCategoryId);
        return {
          id: service.subCategoryId,
          name: service.subCategoryName,
          slug: service.subCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: `Explore ${service.subCategoryName.toLowerCase()} services near you.`,
          imageUrl: service.imageUrl,
        };
      });
  }
  async function chooseCategory(category: DiscoveryCategory) {
    setCategoryId(category.id);
    setSubCategoryId("");
    setQuery("");
    setCatalogMode(false);

    const cachedServices = [...results.items, ...popular, ...trending, ...recommended, ...recent];
    const cachedSubCategories = category.subCategories?.length
      ? category.subCategories
      : deriveSubCategories(category, cachedServices);
    if (cachedSubCategories.length) {
      setCategoryDialog({ ...category, subCategories: cachedSubCategories });
      return;
    }

    // Some older/partially seeded databases return categories without the
    // nested subcategory collection. Resolve the hierarchy from the published
    // services so clicking a category still always opens the picker.
    setLoading(true);
    setError("");
    try {
      const page = await searchDiscoveryServices({
        categoryId: category.id,
        countryCode: location.countryCode || undefined,
        administrativeArea: location.administrativeArea || undefined,
        locality: location.locality || undefined,
        postalCode: location.postalCode || undefined,
        latitude: currentLocation.latitude ?? undefined,
        longitude: currentLocation.longitude ?? undefined,
        radiusKm: 20,
        page: 1,
        pageSize: 24,
      });
      setCategoryDialog({ ...category, subCategories: deriveSubCategories(category, page.items) });
    } catch {
      setCategoryDialog({ ...category, subCategories: [] });
    } finally {
      setLoading(false);
    }
  }
  function chooseSubCategory(category: DiscoveryCategory, id: string) {
    setCategoryId(category.id);
    setSubCategoryId(id);
    setQuery("");
    setCategoryDialog(null);
    setCatalogMode(true);
    void search(1, category.id, "", id).then(() => window.setTimeout(() => document.getElementById("services-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50));
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
          currencyCode: String(form.get("currencyCode") || (location.countryCode.trim().toUpperCase() === "IN" ? "INR" : "USD")),
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
    const content = <div className="services-state">Loading Urban Services…</div>;
    return surface === "provider" ? (
      <DashboardLayout mainContentClassName="provider-workspace-main">{content}</DashboardLayout>
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
        <h1>Urban Services unavailable</h1>
        <p>The module is disabled or your account does not have access.</p>
        <Link to="/dashboard">Return to dashboard</Link>
      </div>
    );
    return surface === "provider" ? (
      <DashboardLayout mainContentClassName="provider-workspace-main">{content}</DashboardLayout>
    ) : (
      <div className="services-marketplace-page">
        <CustomerHeader />
        <main className="services-discovery">{content}</main>
      </div>
    );
  }
  if (surface === "provider")
    return (
      <DashboardLayout mainContentClassName="provider-workspace-main">
        <ProviderWorkspace />
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
          <span>CHAO DESI HOME CARE</span>
          <h1>{resolvedCity ? `Trusted help for every home in ${resolvedCity}` : "Trusted help for every home"}</h1>
          <p>
            Find skilled local professionals, compare clear prices and book a
            convenient time—all from one dependable place.
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
                  const category = categories.find((item) => item.id === event.target.value);
                  if (category) void chooseCategory(category);
                  else { setCategoryId(""); setSubCategoryId(""); setCatalogMode(false); }
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
                        void chooseCategory(category);
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
              <strong>Choose a service</strong>
              <span>{heroQuickCategories.length} categories</span>
            </div>
            <div className="services-hero-category-grid" aria-label="Service categories">
              {heroQuickCategories.map((category, index) => (
                <button
                  type="button"
                  className={categoryId === category.categoryId && (!category.subCategoryId || subCategoryId === category.subCategoryId) ? "is-active" : ""}
                  key={category.key}
                  onClick={() => {
                    const selected = categories.find((item) => item.id === category.categoryId);
                    if (selected) void chooseCategory(selected);
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
            {heroFeaturedServices.map((service, index) => (
              <button
                type="button"
                className={`services-hero-tile services-hero-tile-${index + 1}`}
                key={service.id}
                onClick={() => void openService(service.id)}
              >
                <img
                  src={service.imageUrl || serviceImage(service.name, index)}
                  alt={service.name}
                  loading="eager"
                  onError={(event) => {
                    const fallback = serviceImage(service.name, index);
                    if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                  }}
                />
                <span className="services-hero-tile-label">{service.name}</span>
              </button>
            ))}
            {heroFallbackTiles.slice(0, 3 - heroFeaturedServices.length).map((tile, fallbackIndex) => {
              const index = heroFeaturedServices.length + fallbackIndex;
              const matchingCategory = categories.find((category) =>
                category.name.toLowerCase().includes(tile.label.toLowerCase().split(" ")[0]),
              );
              return (
                <button
                  type="button"
                  className={`services-hero-tile services-hero-tile-${index + 1}`}
                  key={`fallback-${tile.label}`}
                  onClick={() => matchingCategory && void chooseCategory(matchingCategory)}
                >
                  <img src={tile.imageUrl} alt={tile.label} loading="eager" />
                  <span className="services-hero-tile-label">{tile.label}</span>
                </button>
              );
            })}
          </div>
          </div>
        </header> : null}
        {categoryDialog ? (
          <div className="services-category-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryDialog(null); }}>
            <section className="services-category-modal" role="dialog" aria-modal="true" aria-labelledby="services-category-title">
              <button type="button" className="services-category-modal-close" aria-label="Close categories" onClick={() => setCategoryDialog(null)}><span className="services-close-glyph" aria-hidden="true" /></button>
              <div className="services-category-modal-title">
                <span className="material-icons" aria-hidden="true">home_repair_service</span>
                <div><small>CHOOSE A SERVICE TYPE</small><h2 id="services-category-title">{categoryDialog.name}</h2><p>{categoryDialog.description || `Explore ${categoryDialog.name.toLowerCase()} services available near you.`}</p></div>
              </div>
              <h3 className="services-subcategory-heading">Available services</h3>
              <div className="services-subcategory-grid">
                {categoryDialog.subCategories.map((subCategory, index) => (
                  <button type="button" key={subCategory.id} onClick={() => chooseSubCategory(categoryDialog, subCategory.id)}>
                    <span className="services-subcategory-photo">
                      <img
                        src={subCategory.imageUrl || categoryImage(`${categoryDialog.name} ${subCategory.name}`, index)}
                        alt={`${subCategory.name} service`}
                        onError={(event) => { event.currentTarget.src = categoryImage(`${categoryDialog.name} ${subCategory.name}`, index); }}
                      />
                    </span>
                    <strong>{subCategory.name}</strong>
                    {subCategory.description ? <small>{subCategory.description}</small> : null}
                    <i className="material-icons" aria-hidden="true">arrow_forward</i>
                  </button>
                ))}
                {!categoryDialog.subCategories.length ? (
                  <div className="services-subcategory-empty">
                    <span className="material-icons" aria-hidden="true">info</span>
                    <strong>No published service types yet</strong>
                    <small>Add and publish subcategories for this category in the admin catalog.</small>
                    <button type="button" onClick={() => {
                      setCategoryDialog(null);
                      setCatalogMode(true);
                      void search(1, categoryDialog.id, "", "");
                    }}>Browse available services</button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
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
            latitude={currentLocation.latitude ?? undefined}
            longitude={currentLocation.longitude ?? undefined}
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
            {hasSearched && catalogMode ? (
              <>
              {showingWiderArea ? <div className="services-wider-area-notice"><span className="material-icons">travel_explore</span><span><strong>No professionals were found within 20 km.</strong> Showing services available in the wider service area.</span></div> : null}
              <CatalogServicePage
                category={selectedCategory}
                selectedSubCategoryId={subCategoryId}
                items={results.items}
                totalCount={results.totalCount}
                loading={loading}
                open={openService}
                chooseSubCategory={(id) => selectedCategory && chooseSubCategory(selectedCategory, id)}
                back={() => { setCatalogMode(false); setHasSearched(false); setCategoryId(""); setSubCategoryId(""); }}
              />
              </>
            ) : hasSearched ? (
              <ServiceSection
                title="Search results"
                items={results.items}
                loading={loading}
                open={openService}
                empty="No matching services are available. Try a broader search or another location."
              />
            ) : null}
            {hasSearched && results.totalCount > results.pageSize ? (
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
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function CatalogServicePage({ category, selectedSubCategoryId, items, totalCount, loading, open, chooseSubCategory, back }: {
  category?: DiscoveryCategory;
  selectedSubCategoryId: string;
  items: DiscoveryService[];
  totalCount: number;
  loading: boolean;
  open: (id: string) => void;
  chooseSubCategory: (id: string) => void;
  back: () => void;
}) {
  const selected = category?.subCategories.find((item) => item.id === selectedSubCategoryId);
  return <section className="services-catalog-browser">
    <header className="services-catalog-browser-head">
      <button type="button" onClick={back}><span className="material-icons">arrow_back</span>All categories</button>
      <div><small>{category?.name || "URBAN SERVICES"}</small><h2>{selected?.name || category?.name || "Services near you"}</h2><p>{selected?.description || `Choose a trusted professional, compare options and see the final quote before booking.`}</p></div>
      <span><strong>{totalCount}</strong> services</span>
    </header>
    <div className="services-catalog-browser-layout">
      <aside>
        <h3>Service types</h3>
        {category?.subCategories.map((sub, index) => <button type="button" className={sub.id === selectedSubCategoryId ? "is-active" : ""} key={sub.id} onClick={() => chooseSubCategory(sub.id)}>
          <img src={sub.imageUrl || categoryImage(`${category.name} ${sub.name}`, index)} alt="" />
          <span>{sub.name}</span>
        </button>)}
      </aside>
      <div className="services-catalog-list">
        {loading ? <div className="services-catalog-empty">Loading services...</div> : items.length ? items.map((service, index) => <article key={service.id}>
          <img src={service.imageUrl || serviceImage(service.name, index)} alt="" onError={(event) => { event.currentTarget.src = serviceImage(service.name, index); }} />
          <div className="services-catalog-list-copy">
            <small>{service.subCategoryName}</small>
            <h3>{service.name}</h3>
            <div className="services-catalog-rating"><span className="material-icons">star</span>{service.averageRating?.toFixed(1) || "New"}{service.reviewCount ? ` (${service.reviewCount} reviews)` : " service"}</div>
            <p>{service.shortDescription || `Professional ${service.name.toLowerCase()} delivered at your location.`}</p>
            <ul><li>Verified service professional</li><li>Price confirmed before booking</li></ul>
            <div className="services-catalog-price"><span>{service.estimatedDurationMinutes ? `${service.estimatedDurationMinutes} min estimated` : "Flexible appointment"}</span><strong>{service.startingPrice != null ? `From ${service.startingPriceCurrency || "INR"} ${service.startingPrice.toFixed(2)}` : "Quote after selection"}</strong></div>
          </div>
          <button type="button" className="services-catalog-book" onClick={() => open(service.id)}>View &amp; book<span className="material-icons">arrow_forward</span></button>
        </article>) : <div className="services-catalog-empty"><span className="material-icons">location_off</span><h3>No services available here yet</h3><p>Try another service type or update your location.</p></div>}
      </div>
      <aside className="services-catalog-assurance"><span className="material-icons">verified_user</span><h3>Chao Desi assurance</h3><p>Verified professionals</p><p>Clear server-calculated pricing</p><p>Support throughout the booking</p></aside>
    </div>
  </section>;
}

export function MyBookings() {
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
        <p>No Urban Services bookings yet.</p>
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
          <BookingAftercarePanel bookingId={selected.summary.id} status={selected.summary.status} onChanged={() => void load()} />
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
  const [showAll, setShowAll] = useState(false);
  if (hideWhenEmpty && !items.length) return null;
  const visibleItems = showAll ? items : items.slice(0, 10);
  return (
    <section className="services-section">
      <div>
        <h2>{title}</h2>
        <div className="services-section-actions">
          <span>{items.length} services</span>
          {items.length > 10 ? (
            <button type="button" onClick={() => setShowAll((current) => !current)}>
              {showAll ? "View less" : "View more"}
            </button>
          ) : null}
        </div>
      </div>
      {loading ? (
        <div className="services-state">Loading…</div>
      ) : items.length ? (
        <div className="services-grid">
          {visibleItems.map((x) => (
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
  if (value.includes("salon") || value.includes("spa") || value.includes("beauty")) return "spa";
  if (value.includes("massage") || value.includes("groom")) return "self_improvement";
  if (value.includes("instahelp") || value.includes("assistance")) return "support_agent";
  if (value.includes("paint") || value.includes("waterproof")) return "format_paint";
  if (value.includes("panel") || value.includes("renovation")) return "wallpaper";
  if (value.includes("smart") || value.includes("purifier") || value.includes("lock")) return "devices_other";
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
  latitude,
  longitude,
  onLocationChange,
  quote,
  loading,
  previewQuote,
  close,
}: {
  detail: DiscoveryDetail;
  location: ServiceLocation;
  latitude?: number;
  longitude?: number;
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
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotAreaId, setSlotAreaId] = useState("");
  const [slotHold, setSlotHold] = useState<ServiceSlotHold | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<BookingDetail | null>(null);
  const [replacementQuote, setReplacementQuote] = useState<QuoteResult | null>(
    null,
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedServiceAddress[]>(readSavedServiceAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressEditorOpen, setAddressEditorOpen] = useState(() => readSavedServiceAddresses().length === 0);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState("Standard service");
  const [addressValidationVisible, setAddressValidationVisible] = useState(false);
  const [bookingAddress, setBookingAddress] = useState({
    line1: "",
    line2: "",
    locality: location.locality,
    administrativeArea: location.administrativeArea,
    postalCode: location.postalCode,
    countryCode: location.countryCode,
  });
  const [bookingRequestKey] = useState(() => crypto.randomUUID());
  const hasCompleteBookingAddress = Boolean(
    bookingAddress.line1.trim() &&
    bookingAddress.locality.trim() &&
    bookingAddress.administrativeArea.trim() &&
    bookingAddress.postalCode.trim() &&
    bookingAddress.countryCode.trim(),
  );
  const bookingCurrency = location.countryCode.trim().toUpperCase() === "IN"
    ? "INR"
    : detail.service.startingPriceCurrency || "USD";
  useEffect(() => {
    // Slot capacity and serviceability are location-bound. Never retain a
    // hold when the customer edits the location fields.
    setSlots([]);
    setSelectedSlot(null);
    setSlotHold(null);
    setSlotAreaId("");
    setSlotPickerOpen(false);
    setSlotMessage("");
  }, [location.countryCode, location.administrativeArea, location.locality, location.postalCode]);
  useEffect(() => {
    if (quote) setCheckoutOpen(true);
  }, [quote]);
  function persistSavedAddresses(next: SavedServiceAddress[]) {
    setSavedAddresses(next);
    localStorage.setItem(savedAddressesKey, JSON.stringify(next));
  }
  function openAddressSelector() {
    setAddressEditorOpen(savedAddresses.length === 0);
    setAddressOpen(true);
  }
  function useSavedAddress(address: SavedServiceAddress) {
    setBookingAddress({ line1: address.line1, line2: address.line2, locality: address.locality, administrativeArea: address.administrativeArea, postalCode: address.postalCode, countryCode: address.countryCode });
    setSelectedAddressId(address.id);
    setAddressValidationVisible(false);
    setBookingMessage("");
    setAddressOpen(false);
  }
  function editSavedAddress(address: SavedServiceAddress) {
    setBookingAddress({ line1: address.line1, line2: address.line2, locality: address.locality, administrativeArea: address.administrativeArea, postalCode: address.postalCode, countryCode: address.countryCode });
    setSelectedAddressId(address.id);
    setAddressEditorOpen(true);
  }
  function addAnotherAddress() {
    setSelectedAddressId("");
    setBookingAddress({ line1: "", line2: "", locality: location.locality, administrativeArea: location.administrativeArea, postalCode: location.postalCode, countryCode: location.countryCode });
    setAddressValidationVisible(false);
    setAddressEditorOpen(true);
  }
  function saveAndUseAddress() {
    if (!hasCompleteBookingAddress) { setAddressValidationVisible(true); return; }
    const existing = savedAddresses.find((item) => item.id === selectedAddressId);
    const saved: SavedServiceAddress = {
      id: existing?.id || crypto.randomUUID(),
      label: existing?.label || (savedAddresses.length === 0 ? "Home" : `Address ${savedAddresses.length + 1}`),
      ...bookingAddress,
    };
    persistSavedAddresses(existing ? savedAddresses.map((item) => item.id === saved.id ? saved : item) : [...savedAddresses, saved]);
    setSelectedAddressId(saved.id);
    setAddressValidationVisible(false);
    setBookingMessage("");
    setAddressOpen(false);
  }
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
        latitude,
        longitude,
      });
      if (asap) setSlotDate(localDateInput(0));
      setSlots(result.slots);
      setSlotPickerOpen(result.slots.length > 0);
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
        latitude,
        longitude,
      });
      setSlotHold(await confirmServiceSlot(held));
      setSlotPickerOpen(false);
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
          locality: bookingAddress.locality,
          administrativeArea: bookingAddress.administrativeArea,
          postalCode: bookingAddress.postalCode,
          countryCode: bookingAddress.countryCode,
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
  const serviceRequirements = [
    "Standard service",
    "Inspection and diagnosis",
    "Installation or setup",
    "Not sure — help me choose",
  ];
  const supportedBrands = detail.service.categoryName.toLowerCase().includes("appliance")
    ? ["LG", "Samsung", "Bosch", "Whirlpool", "IFB", "Godrej", "Panasonic", "Haier"]
    : ["Residential", "Apartments", "Independent homes", "Small offices", "Local businesses", "Other spaces"];
  return (
    <section className="services-detail">
      <button onClick={close}>← Back to services</button>
      <div className="services-detail-head">
        <div>
          {detail.service.imageUrl || serviceImage(detail.service.name) ? (
            <img src={detail.service.imageUrl || serviceImage(detail.service.name)} alt="" />
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
              <strong>From {detail.service.startingPriceCurrency || bookingCurrency} {detail.service.startingPrice.toFixed(2)}</strong>
            ) : <strong>Final price after area and time check</strong>}
            {detail.estimatedDurationMinutes ? <span>{detail.estimatedDurationMinutes} min estimated</span> : null}
          </div>
        </div>
      </div>
      <div className="services-booking-steps" aria-label="Booking progress">
        <button type="button" className="is-current" onClick={() => setRequirementsOpen(true)}><b>1</b> {selectedRequirement}</button>
        <span><b>2</b> Pick a time</span>
        <span><b>3</b> Confirm &amp; pay</span>
      </div>
      <div className="services-detail-grid">
        <article className="services-detail-guide">
          <div className="services-guide-intro">
            <span className="material-icons" aria-hidden="true">home_repair_service</span>
            <div><small>SERVICE OVERVIEW</small><h2>Know what to expect</h2><p>Clear scope, trusted professionals and support from booking through completion.</p></div>
          </div>
          <div className="services-scope-grid">
            <section className="services-scope-card is-included">
              <span className="material-icons" aria-hidden="true">check_circle</span>
              <div><h3>What’s included</h3><ul>
                {(inclusions.length ? inclusions : ["Professional assessment and service"]).map((x, i) => <li key={i}>{String(x)}</li>)}
              </ul></div>
            </section>
            <section className="services-scope-card is-excluded">
              <span className="material-icons" aria-hidden="true">info</span>
              <div><h3>Not included</h3><ul>
                {(exclusions.length ? exclusions : ["Parts and materials not shown in the quote"]).map((x, i) => <li key={i}>{String(x)}</li>)}
              </ul></div>
            </section>
          </div>
          <p className="services-detail-note">
            Final pricing is calculated after your area and time are checked.
          </p>
          <section className="services-detail-process">
            <h3>How your service works</h3>
            {[
              ["1", "Tell us what you need", "Choose the closest service option and share useful details."],
              ["2", "Review the quote", "Your price is calculated for the selected area, option and time."],
              ["3", "A verified professional visits", "The assigned professional completes the agreed work safely."],
              ["4", "Completion and support", "Review the work, receive your summary and contact support if needed."],
            ].map(([number, title, copy]) => <div key={number}><b>{number}</b><span><strong>{title}</strong><small>{copy}</small></span></div>)}
          </section>
          <section className="services-detail-technician">
            <div><small>LOCAL PROFESSIONALS</small><h3>Skilled help you can trust</h3><p>Identity checked, service trained and matched to the work you selected.</p><ul><li>Background and eligibility checks</li><li>Service-specific standards</li><li>Support through completion</li></ul></div>
            <img src="/services-marketplace/trust/chaodesi-technician-v1.png" alt="Chao Desi service professional" />
          </section>
          <section className="services-detail-brands">
            <h3>Services supported for</h3>
            <div>{supportedBrands.map((brand) => <span key={brand}>{brand}</span>)}</div>
          </section>
          <section className="services-detail-promise">
            <h3>Chao Desi service promise</h3>
            <ul className="services-promise-list">
              <li><span className="services-promise-icon" aria-hidden="true">✓</span><span className="services-promise-label">Verified professionals</span></li>
              <li><span className="services-promise-icon" aria-hidden="true">₹</span><span className="services-promise-label">Transparent quote</span></li>
              <li><span className="services-promise-icon" aria-hidden="true">?</span><span className="services-promise-label">Booking support</span></li>
              <li><span className="services-promise-icon" aria-hidden="true">★</span><span className="services-promise-label">Completion record</span></li>
            </ul>
          </section>
          {detail.preparationInstructions ? (
            <>
              <h3>Before we arrive</h3>
              <p>{detail.preparationInstructions}</p>
            </>
          ) : null}
          <h3>Frequently asked questions</h3>
          <div className="services-detail-faqs">
            {(faqs.length ? faqs : ["When is the final price confirmed?", "Can I change my appointment?", "What happens if extra work is required?"]).map((x, i) => <details key={i}><summary>{formatContentValue(x).split(":")[0]}</summary><p>{formatContentValue(x).includes(":") ? formatContentValue(x).split(":").slice(1).join(":") : "You will see the applicable details before confirming your booking. Extra work is never added without approval."}</p></details>)}
          </div>
          <section className="services-detail-reviews">
            <h3>Verified customer reviews</h3>
            {detail.service.reviewCount ? <p><strong>{detail.service.averageRating?.toFixed(1)}</strong> from {detail.service.reviewCount} completed-service reviews.</p> : <p>This is a new service. Reviews will appear after customers complete verified bookings.</p>}
          </section>
        </article>
        <form onSubmit={previewQuote}>
          <h3>Build your booking</h3>
          <p className="services-form-note">Choose the service option and any extras you need. Your final price is calculated before booking.</p>
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
            <fieldset className="services-option-section services-package-options">
              <legend><span>1</span> Choose a service option</legend>
              <div className="services-option-cards">
                {detail.packages.map((x, index) => (
                  <label className="services-package-card" key={x.id}>
                    <input type="radio" name="packageId" value={x.id} defaultChecked={index === 0} />
                    <span className="services-option-copy">
                      <b>{x.name}</b>
                      {x.description ? <small>{x.description}</small> : null}
                      {x.durationMinutes ? <small>{x.durationMinutes} min</small> : null}
                    </span>
                    <strong>{x.price ? `${x.price.currencyCode} ${x.price.amount.toFixed(2)}` : "Included"}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {detail.addOns.length ? (
            <fieldset className="services-option-section services-addon-options">
              <legend><span>{detail.packages.length ? "2" : "1"}</span> Add optional extras <small>Choose any</small></legend>
              <div className="services-option-cards">
                {detail.addOns.map((x) => (
                  <label className="services-addon-option" key={x.id}>
                    <input type="checkbox" name={`addon-${x.id}`} />
                    <span className="services-option-copy"><b>{x.name}</b><small>{x.description || "Optional add-on"}{x.durationMinutes ? ` · ${x.durationMinutes} min` : ""}</small></span>
                    <strong>{x.price ? `+ ${x.price.currencyCode} ${x.price.amount.toFixed(2)}` : "Included"}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <label className="services-quantity-option">
            Quantity
            <input name="quantity" type="number" min="1" defaultValue="1" />
          </label>
          <h3>Choose a time</h3>
          <div className="services-schedule-row">
            <label className="services-date-option">
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
            <div className="services-slot-actions">
              <button className="services-find-times-button" type="button" disabled={loading || location.countryCode.trim().length < 2} onClick={() => void loadSlots(false)}>
                Find times
              </button>
            </div>
          </div>
          <p className="services-location-note">
            Availability is checked for <strong>{location.countryCode || "your country"}</strong>
            {location.locality ? ` · ${location.locality}` : ""}
            {location.postalCode ? ` · ${location.postalCode}` : ""}.
            Update the location fields above if this is not your service address.
          </p>
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
          {slots.length ? <button type="button" className="services-reopen-times" onClick={() => setSlotPickerOpen(true)}><span className="material-icons">schedule</span>View {slots.length} available times</button> : null}
          {selectedSlot && !slotHold ? (
            <button type="button" onClick={() => void reserveSlot()}>
              Reserve this time
            </button>
          ) : null}
          {slotHold && selectedSlot ? (
            <p className="services-success-note">
              <strong>Selected: {new Date(selectedSlot.startAtUtc).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} at {new Date(selectedSlot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</strong>{" "}
              Held until {new Date(slotHold.expiresAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          ) : null}
          <input
            name="scheduledAtUtc"
            type="hidden"
            value={selectedSlot?.startAtUtc || ""}
          />
          <div className="services-currency-summary">
            <span>Payment currency</span>
            <strong>{bookingCurrency}</strong>
            <small>Selected automatically from your service country</small>
          </div>
          <input name="currencyCode" type="hidden" value={bookingCurrency} />
          <label className="services-emergency-option">
            <input name="isEmergency" type="checkbox" />
            <span><b>Emergency request</b><small>Request the earliest available professional</small></span>
          </label>
          <button type="submit" disabled={loading || !selectedSlot}>
            {loading ? "Calculating…" : "Check area & preview quote"}
          </button>
        </form>
      </div>
      {slotPickerOpen && slots.length ? (
        <div className="services-time-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSlotPickerOpen(false); }}>
          <section className="services-time-modal" role="dialog" aria-modal="true" aria-labelledby="services-time-title">
            <header>
              <div className="services-time-heading-icon"><span className="material-icons">calendar_month</span></div>
              <div><small>AVAILABLE APPOINTMENTS</small><h2 id="services-time-title">Choose a convenient time</h2><p>{new Date(`${slotDate}T12:00:00`).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {location.locality || "Your location"}</p></div>
              <button type="button" aria-label="Close time selector" onClick={() => setSlotPickerOpen(false)}><span className="services-close-glyph" aria-hidden="true" /></button>
            </header>
            <div className="services-time-body">
              {[{ label: "Morning", icon: "wb_sunny", from: 0, to: 12 }, { label: "Afternoon", icon: "light_mode", from: 12, to: 17 }, { label: "Evening", icon: "nights_stay", from: 17, to: 24 }].map((group) => {
                const groupSlots = slots.filter((slot) => { const hour = new Date(slot.startAtUtc).getHours(); return hour >= group.from && hour < group.to; });
                if (!groupSlots.length) return null;
                return <section className="services-time-group" key={group.label}>
                  <h3><span className="material-icons">{group.icon}</span>{group.label}<small>{groupSlots.length} available</small></h3>
                  <div>{groupSlots.map((slot) => {
                    const selected = selectedSlot?.startAtUtc === slot.startAtUtc;
                    return <button type="button" className={selected ? "is-selected" : ""} key={slot.startAtUtc} aria-pressed={selected} onClick={() => setSelectedSlot(slot)}>
                      <strong>{new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                      <small>{slot.remainingCapacity} slot{slot.remainingCapacity === 1 ? "" : "s"} left</small>
                      {selected ? <span className="material-icons">check_circle</span> : null}
                    </button>;
                  })}</div>
                </section>;
              })}
            </div>
            <footer>
              <div>{selectedSlot ? <><span className="material-icons">event_available</span><span><small>Selected appointment</small><strong>{new Date(selectedSlot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></span></> : <span className="services-time-prompt">Select a time to continue</span>}</div>
              <button type="button" disabled={!selectedSlot} onClick={() => void reserveSlot()}>{selectedSlot ? "Reserve & continue" : "Choose a time"}<span className="material-icons">arrow_forward</span></button>
            </footer>
          </section>
        </div>
      ) : null}
      {requirementsOpen ? (
        <div className="services-requirements-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setRequirementsOpen(false);
        }}>
          <section className="services-requirements-modal" role="dialog" aria-modal="true" aria-labelledby="services-requirements-title">
            <button type="button" className="services-requirements-close" aria-label="Close" onClick={() => setRequirementsOpen(false)}><span className="services-close-glyph" aria-hidden="true" /></button>
            <img src={detail.service.imageUrl || serviceImage(detail.service.name)} alt="" />
            <div className="services-requirements-content">
              <small>{detail.service.subCategoryName}</small>
              <h2 id="services-requirements-title">{detail.service.name}</h2>
              <p>Choose the option that best describes what you need. Your professional will confirm the scope before work begins.</p>
              <h3>Select requirements</h3>
              <div className="services-requirement-options">
                {serviceRequirements.map((option) => <button type="button" className={selectedRequirement === option ? "is-selected" : ""} key={option} onClick={() => setSelectedRequirement(option)}><span className="material-icons">{selectedRequirement === option ? "check_circle" : "radio_button_unchecked"}</span>{option}</button>)}
              </div>
              <div className="services-requirements-process"><h3>What happens next</h3><p><b>1.</b> Check serviceability and pick a time.</p><p><b>2.</b> Review the server-calculated quote.</p><p><b>3.</b> Confirm address and complete the booking.</p></div>
              <button type="button" className="services-requirements-continue" onClick={() => setRequirementsOpen(false)}>Continue to availability</button>
            </div>
          </section>
        </div>
      ) : null}
      {quote && checkoutOpen ? (
        <div className="services-checkout-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setCheckoutOpen(false);
        }}>
          <div className="services-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="services-checkout-title">
            <header>
              <div>
                <span className="services-checkout-eyebrow">Secure checkout</span>
                <h2 id="services-checkout-title">Review your booking</h2>
                <p>Confirm your appointment, price and service address.</p>
              </div>
              <button type="button" className="services-checkout-close" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><span className="services-close-glyph" aria-hidden="true" /></button>
            </header>
          {slotHold ? (
            <form className="services-cart-layout" onSubmit={createBooking}>
              <div className="services-cart-steps">
                <div className="services-cart-contact">
                  <span className="material-icons" aria-hidden="true">notifications_active</span>
                  <div><strong>Booking updates</strong><small>Updates will be sent to your Chao Desi account</small></div>
                </div>
                <section className={`services-cart-step ${hasCompleteBookingAddress ? "is-complete" : addressValidationVisible ? "is-required" : ""}`}>
                  <span className="material-icons" aria-hidden="true">location_on</span>
                  <div>
                    <strong>Service address {hasCompleteBookingAddress ? <em className="services-saved-mark"><span className="material-icons">check</span> Saved</em> : <em className="services-required-mark">Required</em>}</strong>
                    {bookingAddress.line1 ? (
                      <p>{bookingAddress.line1}{bookingAddress.line2 ? `, ${bookingAddress.line2}` : ""}, {bookingAddress.locality}, {bookingAddress.administrativeArea} {bookingAddress.postalCode}</p>
                    ) : <small>Select where the professional should arrive</small>}
                  </div>
                  <button type="button" onClick={openAddressSelector}>{bookingAddress.line1 ? "Change" : "Select address"}</button>
                </section>
                <section className="services-cart-step is-complete">
                  <span className="material-icons" aria-hidden="true">schedule</span>
                  <div><strong>Selected slot</strong><p>{selectedSlot ? `${new Date(selectedSlot.startAtUtc).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}, ${new Date(selectedSlot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Choose a time"}</p></div>
                  <button type="button" onClick={() => setCheckoutOpen(false)}>Change</button>
                </section>
                <section className="services-cart-step">
                  <span className="material-icons" aria-hidden="true">payments</span>
                  <div><strong>Payment method</strong><small>Secure payment after booking confirmation</small></div>
                </section>
                <div className="services-cart-policy">
                  <h3>Cancellation policy</h3>
                  <p>Free cancellation is available before the scheduled service window. Late cancellation charges may apply.</p>
                </div>
              </div>
              <aside className="services-cart-summary">
                <h3>{detail.service.name}</h3>
                <p>{detail.service.subCategoryName}</p>
                <div className="services-cart-item"><span>{detail.service.name}<small>Quantity 1</small></span><b>{quote.price.currencyCode} {quote.price.subtotalAmount.toFixed(2)}</b></div>
              {replacementQuote ? (
                <p>
                  <strong>
                    Updated price: {replacementQuote.price.currencyCode}{" "}
                    {replacementQuote.price.totalAmount.toFixed(2)}
                  </strong>
                  . Review and accept before resubmitting.
                </p>
              ) : null}
                <label className="services-cart-instructions">Instructions<textarea name="customerNotes" maxLength={2000} placeholder="Any directions for the professional?" /></label>
                <input type="hidden" name="line1" value={bookingAddress.line1} />
                <input type="hidden" name="line2" value={bookingAddress.line2} />
                <details className="services-cart-breakup">
                  <summary>View bill breakup</summary>
                  {quote.price.lines.map((line, index) => <div key={`${line.code}-${index}`}><span>{line.label}</span><b>{quote.price.currencyCode} {line.amount.toFixed(2)}</b></div>)}
                </details>
                <div className="services-cart-bill"><span>Total bill<small>Includes applicable taxes and platform charges</small></span><strong>{quote.price.currencyCode} {quote.price.totalAmount.toFixed(2)}</strong></div>
                <label className="services-cart-accept">
                <input type="checkbox" name="acceptPrice" required /> I accept
                this price and service selection.
                </label>
                <button
                  type={hasCompleteBookingAddress ? "submit" : "button"}
                  onClick={() => {
                    if (!hasCompleteBookingAddress) {
                      setAddressValidationVisible(true);
                      openAddressSelector();
                    }
                  }}
                >
                  {hasCompleteBookingAddress ? "Proceed to payment" : "Complete address to continue"}
                </button>
                {!hasCompleteBookingAddress ? <p className="services-cart-address-help"><span className="material-icons">info</span>Enter the complete street, locality, state and PIN code.</p> : null}
              {bookingMessage ? <p role="status">{bookingMessage}</p> : null}
              </aside>
            </form>
          ) : (
            <p>Reserve a time to continue.</p>
          )}
          {createdBooking ? (
            <div className="services-payment-step">
              <h3>Payment</h3>
              <p>Booking {createdBooking.summary.referenceNumber} is awaiting payment.</p>
              <ServicesPaymentPanel bookingId={createdBooking.summary.id} amount={createdBooking.summary.totalAmount} currency={createdBooking.summary.currencyCode} autoStart onSuccess={() => { setBookingMessage("Payment succeeded. Your booking is confirmed."); setCheckoutOpen(false); }} />
            </div>
          ) : null}
          {addressOpen ? (
            <div className="services-address-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.currentTarget === event.target) setAddressOpen(false);
            }}>
              <section className="services-address-modal" role="dialog" aria-modal="true" aria-labelledby="services-address-title">
                <header><div><small>Service location</small><h3 id="services-address-title">{addressEditorOpen ? (selectedAddressId ? "Edit service address" : "Add service address") : "Choose an address"}</h3></div><button type="button" aria-label="Close address" onClick={() => setAddressOpen(false)}><span className="services-close-glyph" aria-hidden="true" /></button></header>
                {savedAddresses.length ? <div className="services-saved-address-list">
                  <div className="services-saved-address-heading"><strong>Saved addresses</strong><small>Saved on this device</small></div>
                  {savedAddresses.map((address) => <article className={selectedAddressId === address.id ? "is-selected" : ""} key={address.id}>
                    <span className="material-icons" aria-hidden="true">home</span>
                    <div><strong>{address.label}</strong><p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.locality}, {address.administrativeArea} {address.postalCode}</p></div>
                    <div><button type="button" className="is-edit" onClick={() => editSavedAddress(address)}>Edit</button><button type="button" className="is-use" onClick={() => useSavedAddress(address)}>{selectedAddressId === address.id ? "Selected" : "Use address"}</button></div>
                  </article>)}
                  {!addressEditorOpen ? <button type="button" className="services-add-address" onClick={addAnotherAddress}><span aria-hidden="true">+</span>Add another address</button> : null}
                </div> : null}
                {addressEditorOpen ? <>
                <div className="services-address-location"><span className="material-icons">my_location</span><span><strong>{bookingAddress.locality || "Current locality"}</strong><small>{bookingAddress.administrativeArea} {bookingAddress.postalCode}</small></span></div>
                <label className={!bookingAddress.line1.trim() && addressValidationVisible ? "is-required" : ""}>House / flat / building <span className="services-field-required">Required</span><input required aria-invalid={!bookingAddress.line1.trim() && addressValidationVisible} autoFocus value={bookingAddress.line1} onChange={(event) => { setBookingAddress((value) => ({ ...value, line1: event.target.value })); if (event.target.value.trim()) setAddressValidationVisible(false); }} placeholder="House number and street" />{!bookingAddress.line1.trim() && addressValidationVisible ? <small>Please enter a house, flat, building or street.</small> : null}</label>
                <label>Landmark or address details (optional)<input value={bookingAddress.line2} onChange={(event) => setBookingAddress((value) => ({ ...value, line2: event.target.value }))} placeholder="Apartment, floor or nearby landmark" /></label>
                <div className="services-address-region-grid">
                  <label className={!bookingAddress.locality.trim() && addressValidationVisible ? "is-required" : ""}>Locality / city <span className="services-field-required">Required</span><input required value={bookingAddress.locality} onChange={(event) => setBookingAddress((value) => ({ ...value, locality: event.target.value }))} placeholder="Locality or city" /></label>
                  <label className={!bookingAddress.administrativeArea.trim() && addressValidationVisible ? "is-required" : ""}>State <span className="services-field-required">Required</span><input required value={bookingAddress.administrativeArea} onChange={(event) => setBookingAddress((value) => ({ ...value, administrativeArea: event.target.value }))} placeholder="State" /></label>
                  <label className={!bookingAddress.postalCode.trim() && addressValidationVisible ? "is-required" : ""}>PIN code <span className="services-field-required">Required</span><input required inputMode="numeric" maxLength={10} value={bookingAddress.postalCode} onChange={(event) => setBookingAddress((value) => ({ ...value, postalCode: event.target.value.replace(/[^0-9A-Za-z -]/g, "") }))} placeholder="6-digit PIN code" /></label>
                  <label className={!bookingAddress.countryCode.trim() && addressValidationVisible ? "is-required" : ""}>Country code <span className="services-field-required">Required</span><input required maxLength={3} value={bookingAddress.countryCode} onChange={(event) => setBookingAddress((value) => ({ ...value, countryCode: event.target.value.toUpperCase() }))} placeholder="IN" /></label>
                </div>
                <button type="button" onClick={saveAndUseAddress}>Save and use this address</button>
                </> : null}
              </section>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
