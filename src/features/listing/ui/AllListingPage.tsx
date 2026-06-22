import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { getMyProfile } from "../../dashboard/api/profileApi";
import {
  getListing,
  getListingApiErrorMessage,
  getPublicListings,
  type ListingSummary,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
} from "../../dashboard/utils/listingImages";
import { submitRequirement } from "../api/requirementsApi";
import { shouldShowQuoteAction } from "../utils/quoteVisibility";
import "../styles/publicListings.css";

const PAGE_SIZE = 12;
const FEATURE_FILTERS = [
  "Trusted services provider",
  "Premium services",
  "Verified services",
  "Trending services",
  "Offers and discounts",
  "Latest updated",
  "Most likes",
];
const RATING_FILTERS = ["5", "4", "3", "2", "1"];
const fallbackListingBanners: PageBanner[] = [
  {
    id: 0,
    pageKey: "all-listing",
    slot: "top",
    title: "Listing banner",
    imageUrl: "/template-17/images/ads/32207ads.png",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: -1,
    pageKey: "all-listing",
    slot: "left",
    title: "Sidebar banner",
    imageUrl: "/template-17/images/ads/ads1.jpg",
    displayOrder: 1,
    isActive: true,
  },
];

type PublicCategory = NonNullable<PublicListingQuery["category"]>;
type SortKey = "recent" | "rating" | "price-low" | "price-high";

export default function AllListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [facetItems, setFacetItems] = useState<ListingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [pageBanners, setPageBanners] = useState<PageBanner[]>(fallbackListingBanners);
  const [topBannerIndex, setTopBannerIndex] = useState(0);
  const [leftBannerIndex, setLeftBannerIndex] = useState(0);
  const [requirementForm, setRequirementForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    message: "",
  });
  const [requirementStatus, setRequirementStatus] = useState("");
  const [isSubmittingRequirement, setIsSubmittingRequirement] = useState(false);
  const [quoteListing, setQuoteListing] = useState<ListingSummary | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    message: "",
  });
  const [quoteStatus, setQuoteStatus] = useState("");
  const [isQuoteProfileLoading, setIsQuoteProfileLoading] = useState(false);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const categoryName = searchParams.get("categoryName") || "";
  const category = getCategory(searchParams.get("category")) || categorySlugFromLabel(categoryName) || undefined;
  const subCategory = searchParams.get("subCategory") || "";
  const detailCategory = searchParams.get("detailCategory") || "";
  const city = searchParams.get("city") || "";
  const search = searchParams.get("search") || "";
  const sort = getSort(searchParams.get("sort"));
  const feature = searchParams.get("feature") || "";
  const rating = searchParams.get("rating") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const sortedItems = useMemo(() => sortListings(filterListings(items, feature, rating), sort), [feature, items, rating, sort]);
  const displayCount = feature || rating ? sortedItems.length : totalCount;
  const dynamicCategories = useMemo(() => buildCategoryOptions(facetItems, category), [facetItems, category]);
  const activeCategoryName = category ? categoryLabel(category, dynamicCategories) : categoryName;
  const categoryFacetItems = useMemo(() => getFacetItemsForCategory(facetItems, category, categoryName), [facetItems, category, categoryName]);
  const dynamicCities = useMemo(() => uniqueValues(categoryFacetItems.map((item) => getListingCity(item))), [categoryFacetItems]);
  const dynamicSubCategories = useMemo(() => uniqueValues(categoryFacetItems.map((item) => item.subCategory)), [categoryFacetItems]);
  const topBanners = useMemo(() => getBannersForSlot(pageBanners, "top"), [pageBanners]);
  const leftBanners = useMemo(() => getBannersForSlot(pageBanners, "left"), [pageBanners]);
  const topProviders = useMemo(() => {
    return [...categoryFacetItems]
      .sort((a, b) => Number(b.averageRating || b.rating || b.views || 0) - Number(a.averageRating || a.rating || a.views || 0))
      .slice(0, 5);
  }, [categoryFacetItems]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    let isActive = true;

    getPageBanners("all-listing")
      .then((items) => {
        if (isActive && items.length) {
          setPageBanners(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setPageBanners(fallbackListingBanners);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setTopBannerIndex(0);
  }, [topBanners.length]);

  useEffect(() => {
    setLeftBannerIndex(0);
  }, [leftBanners.length]);

  useEffect(() => {
    if (topBanners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTopBannerIndex((current) => (current + 1) % topBanners.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [topBanners.length]);

  useEffect(() => {
    if (leftBanners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLeftBannerIndex((current) => (current + 1) % leftBanners.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [leftBanners.length]);

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getPublicListings({
          category,
          categoryName: category ? undefined : categoryName || undefined,
          subCategory,
          detailCategory,
          city,
          search,
          page,
          pageSize: PAGE_SIZE,
        });

        if (!isActive) return;

        setItems(result.items || []);
        setTotalCount(result.totalCount || 0);
      } catch (error) {
        if (isActive) {
          setErrorMessage(getListingApiErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      isActive = false;
    };
  }, [category, categoryName, city, detailCategory, page, search, subCategory]);

  useEffect(() => {
    let isActive = true;

    getPublicListings({ page: 1, pageSize: 50 })
      .then((result) => {
        if (isActive) {
          setFacetItems(result.items || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setFacetItems([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  function updateQuery(updates: Record<string, string | number | null>) {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  }

  function submitSidebarSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ search: searchDraft.trim(), page: 1 });
  }

  async function submitRequirementForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequirementStatus("");
    setIsSubmittingRequirement(true);

    try {
      await submitRequirement({
        ...requirementForm,
        categoryName: activeCategoryName || "All Listings",
        pageUrl: window.location.href,
      });
      setRequirementForm({ name: "", email: "", mobileNumber: "", message: "" });
      setRequirementStatus("Your requirement has been submitted successfully.");
    } catch {
      setRequirementStatus("Unable to submit requirement. Please try again.");
    } finally {
      setIsSubmittingRequirement(false);
    }
  }

  async function openQuoteModal(listing: ListingSummary) {
    if (!isCustomerAuthenticated()) {
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      window.alert("Please login to send enquiry.");
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setQuoteListing(listing);
    setQuoteStatus("");
    setQuoteForm({
      name: localStorage.getItem("fullName") || localStorage.getItem("customer_name") || "",
      email: localStorage.getItem("email") || "",
      mobileNumber: localStorage.getItem("mobileNumber") || "",
      message: "",
    });
    setIsQuoteProfileLoading(true);

    try {
      const { profile } = await getMyProfile();
      setQuoteForm((current) => ({
        ...current,
        name: profile.fullName || current.name,
        email: profile.email || current.email,
        mobileNumber: profile.mobileNumber || current.mobileNumber,
      }));
    } finally {
      setIsQuoteProfileLoading(false);
    }
  }

  async function submitQuoteForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quoteListing) {
      return;
    }

    setQuoteStatus("");
    setIsSubmittingQuote(true);

    try {
      await submitRequirement({
        listingId: quoteListing.id,
        listingTitle: quoteListing.title,
        name: quoteForm.name,
        email: quoteForm.email,
        mobileNumber: quoteForm.mobileNumber,
        message: quoteForm.message,
        categoryName: quoteListing.categoryName || activeCategoryName || "All Listings",
        pageUrl: `${window.location.origin}/listing-details?id=${quoteListing.id}`,
      });
      setQuoteStatus("Your enquiry has been sent successfully.");
      setQuoteForm((current) => ({ ...current, message: "" }));
    } catch {
      setQuoteStatus("Unable to send enquiry. Please try again.");
    } finally {
      setIsSubmittingQuote(false);
    }
  }

  return (
    <>
      <CustomerHeader />
      <main className="public-listing-page public-template-page">
        <section className="public-listing-content">
          <div className="container public-listing-shell">
            <aside className="public-filter-panel">
              <div className="public-filter-title">
                <h1>{activeCategoryName || "All Listings"}</h1>
                <nav>
                  <Link to="/">Home</Link>
                  <span>All Category</span>
                  {activeCategoryName ? <span>{activeCategoryName}</span> : null}
                  {subCategory ? <span>{subCategory}</span> : null}
                </nav>
              </div>

              {topProviders.length ? (
                <SidebarCard className="public-provider-card" title="Top Service Providers">
                  {topProviders.map((listing) => (
                    <Link to={buildListingDetailHref(listing)} className="public-provider-row" key={listing.id}>
                      {listing.primaryImageUrl || listing.imageUrls?.[0] ? (
                        <img src={resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0])} alt="" />
                      ) : <span className="public-provider-image-empty" />}
                      <span>
                        <strong>{listing.title}</strong>
                        <small>{buildLocationText(listing)}</small>
                      </span>
                      {Number(listing.averageRating || listing.rating || 0) > 0 ? <b>{Number(listing.averageRating || listing.rating).toFixed(1)}</b> : null}
                    </Link>
                  ))}
                </SidebarCard>
              ) : null}

              <form className="public-sidebar-search" onSubmit={submitSidebarSearch}>
                <input
                  type="search"
                  value={searchDraft}
                  placeholder="Search the service"
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                <button type="submit" aria-label="Search">
                  <i className="material-icons">search</i>
                </button>
              </form>

              {dynamicCities.length ? (
                <SidebarCard title="Cities" icon="apps">
                  <select value={city} onChange={(event) => updateQuery({ city: event.target.value, page: 1 })}>
                    <option value="">Select City</option>
                    {dynamicCities.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                </SidebarCard>
              ) : null}

              {dynamicCategories.length ? (
                <SidebarCard title="Categories" icon="apps">
                  <select value={category || ""} onChange={(event) => updateQuery({ category: event.target.value, categoryName: null, subCategory: null, page: 1 })}>
                    <option value="">All Category</option>
                    {dynamicCategories.map((option) => (
                      <option value={option.value} key={option.label}>{option.label}</option>
                    ))}
                  </select>
                </SidebarCard>
              ) : null}

              {dynamicSubCategories.length ? (
                <SidebarCard title="Sub Category" icon="verified_user">
                  <CheckList
                    items={dynamicSubCategories}
                    selectedItem={subCategory}
                    onChange={(value) => updateQuery({ subCategory: value === subCategory ? null : value, page: 1 })}
                  />
                </SidebarCard>
              ) : null}

              <SidebarCard title="Features" icon="tune">
                <CheckList
                  items={FEATURE_FILTERS}
                  selectedItem={feature}
                  onChange={(value) => updateQuery({ feature: value === feature ? null : value, page: 1 })}
                />
              </SidebarCard>

              <SidebarCard title="Ratings" icon="star">
                <RatingList
                  items={RATING_FILTERS}
                  selectedItem={rating}
                  onChange={(value) => updateQuery({ rating: value === rating ? null : value, page: 1 })}
                />
              </SidebarCard>

              <SidebarCard title="Sort By" icon="sort">
                <select value={sort} onChange={(event) => updateQuery({ sort: event.target.value, page: 1 })}>
                  <option value="recent">Latest updated</option>
                  <option value="rating">Top rated</option>
                  <option value="price-low">Price low to high</option>
                  <option value="price-high">Price high to low</option>
                </select>
              </SidebarCard>

              <RotatingBanner
                banners={leftBanners}
                className="public-side-ad"
                index={leftBannerIndex}
              />

              <form className="public-requirement-card" onSubmit={submitRequirementForm}>
                <h2>What service do you need?</h2>
                <h3>Chaodesi will help you</h3>
                <input
                  type="text"
                  placeholder="Enter name*"
                  required
                  value={requirementForm.name}
                  onChange={(event) => setRequirementForm((current) => ({ ...current, name: event.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Enter email*"
                  required
                  value={requirementForm.email}
                  onChange={(event) => setRequirementForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Enter mobile number*"
                  required
                  value={requirementForm.mobileNumber}
                  onChange={(event) => setRequirementForm((current) => ({ ...current, mobileNumber: event.target.value }))}
                />
                <textarea
                  placeholder="Enter your query or message"
                  value={requirementForm.message}
                  onChange={(event) => setRequirementForm((current) => ({ ...current, message: event.target.value }))}
                />
                {requirementStatus ? <p className="public-requirement-status">{requirementStatus}</p> : null}
                <button type="submit" disabled={isSubmittingRequirement}>
                  {isSubmittingRequirement ? "Submitting..." : "Submit Requirements"}
                </button>
              </form>
            </aside>

            <div className="public-listing-results">
              <div className="public-top-search">
                <input
                  type="search"
                  value={search}
                  placeholder="Search the service"
                  onChange={(event) => updateQuery({ search: event.target.value, page: 1 })}
                />
                <button type="button" aria-label="Search"><i className="material-icons">search</i></button>
              </div>

              {sortedItems.length ? (
                <RotatingBanner
                  banners={topBanners}
                  className="public-wide-ad"
                  index={topBannerIndex}
                />
              ) : null}

              <div className="public-listing-toolbar">
                <div>
                  Total of <strong>{displayCount}</strong> business result(s) found.
                </div>
                <div className="public-filter-tags">
                  {activeCategoryName ? <span>{activeCategoryName} <button type="button" onClick={() => updateQuery({ category: null, categoryName: null, subCategory: null, page: 1 })}>x</button></span> : null}
                  {subCategory ? <span>{subCategory} <button type="button" onClick={() => updateQuery({ subCategory: null, page: 1 })}>x</button></span> : null}
                  {search ? <span>{search} <button type="button" onClick={() => updateQuery({ search: null, page: 1 })}>x</button></span> : null}
                  {feature ? <span>{feature} <button type="button" onClick={() => updateQuery({ feature: null, page: 1 })}>x</button></span> : null}
                  {rating ? <span>{rating} Star <button type="button" onClick={() => updateQuery({ rating: null, page: 1 })}>x</button></span> : null}
                </div>
              </div>

              {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
              {isLoading ? <div className="alert alert-info">Loading listings...</div> : null}

              {!isLoading && !sortedItems.length ? (
                <div className="public-listing-empty">No approved listings found for this selection.</div>
              ) : null}

              <div className="public-listing-grid">
                {sortedItems.map((listing) => (
                  <ListingCard listing={listing} key={listing.id} onQuoteClick={openQuoteModal} />
                ))}
              </div>

              <div className="public-listing-pagination">
                <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: page - 1 })}>
                  Previous
                </button>
                <strong>{page} / {totalPages}</strong>
                <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: page + 1 })}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
        {quoteListing ? (
          <QuoteModal
            form={quoteForm}
            isProfileLoading={isQuoteProfileLoading}
            isSubmitting={isSubmittingQuote}
            listing={quoteListing}
            status={quoteStatus}
            onClose={() => setQuoteListing(null)}
            onChange={(updates) => setQuoteForm((current) => ({ ...current, ...updates }))}
            onSubmit={submitQuoteForm}
          />
        ) : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function SidebarCard({ title, icon, className = "", children }: { title: string; icon?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`public-sidebar-card ${className}`}>
      <h2>{icon ? <i className="material-icons">{icon}</i> : null}{title}</h2>
      {children}
    </section>
  );
}

function RotatingBanner({
  banners,
  className,
  index,
}: {
  banners: PageBanner[];
  className: string;
  index: number;
}) {
  const banner = banners[index] || banners[0];

  if (!banner) {
    return null;
  }

  const image = (
    <>
      <span>Ad</span>
      <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="lazy" />
    </>
  );

  return (
    <div className={className}>
      {banner.linkUrl ? <a href={banner.linkUrl}>{image}</a> : image}
    </div>
  );
}

function CheckList({
  items,
  selectedItem,
  onChange,
}: {
  items: string[];
  selectedItem: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="public-check-list">
      {items.map((item) => (
        <label key={item}>
          <input
            type="checkbox"
            checked={selectedItem === item}
            onChange={() => onChange(item)}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

function RatingList({
  items,
  selectedItem,
  onChange,
}: {
  items: string[];
  selectedItem: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="public-rating-filter">
      {items.map((item) => (
        <label key={item}>
          <input
            type="radio"
            checked={selectedItem === item}
            onChange={() => onChange(item)}
          />
          <span>
            {Array.from({ length: 5 }, (_, index) => (
              <i className="material-icons" key={index}>{index < Number(item) ? "star" : "star_border"}</i>
            ))}
          </span>
        </label>
      ))}
    </div>
  );
}

function ListingCard({ listing, onQuoteClick }: { listing: ListingSummary; onQuoteClick: (listing: ListingSummary) => void }) {
  const href = buildListingDetailHref(listing);
  const imageUrl = listing.primaryImageUrl || listing.imageUrls?.[0] || "";
  const displayRating = getDisplayRating(listing);
  const openLabel = getOpenStatusLabel(listing);
  const phoneNumber = getListingPhone(listing);
  const whatsAppNumber = getListingWhatsApp(listing) || phoneNumber;
  const showQuoteAction = shouldShowQuoteAction(listing);

  async function openContactAction(action: "call" | "whatsapp") {
    let contactListing = listing;
    let nextPhoneNumber = phoneNumber;
    let nextWhatsAppNumber = whatsAppNumber;

    if (!nextPhoneNumber.trim() || !normalizeWhatsAppNumber(nextWhatsAppNumber)) {
      try {
        contactListing = await getListing(listing.id);
        nextPhoneNumber = getListingPhone(contactListing);
        nextWhatsAppNumber = getListingWhatsApp(contactListing) || nextPhoneNumber;
      } catch {
        window.alert("Contact details are not available for this listing.");
        return;
      }
    }

    if (action === "call") {
      if (!nextPhoneNumber.trim()) {
        window.alert("Phone number is not available for this listing.");
        return;
      }

      window.location.href = `tel:${nextPhoneNumber}`;
      return;
    }

    const whatsAppDigits = normalizeWhatsAppNumber(nextWhatsAppNumber || nextPhoneNumber);
    if (!whatsAppDigits) {
      window.alert("WhatsApp number is not available for this listing.");
      return;
    }

    window.open(`https://wa.me/${whatsAppDigits}`, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="public-listing-card">
      <Link to={href} className="public-listing-image">
        <span className="public-card-badges">
          <span className="public-open-stat">{openLabel}</span>
          <span className="public-stars-badge" aria-label={`${displayRating.toFixed(1)} star rating`}>
            {renderStars(displayRating)}
          </span>
          <span className="public-verify-badge" title="Verified">
            <img src="/template-17/images/icon/svg/verified.png" alt="" />
          </span>
          <span className="public-like-badge" title="Click to like this listing">
            <img src="/template-17/images/icon/svg/like.svg" alt="" />
          </span>
        </span>
        {imageUrl ? (
          <img
            src={resolveListingImageUrl(imageUrl)}
            alt={listing.title}
            loading="lazy"
          />
        ) : <span className="public-listing-image-empty" />}
      </Link>
      <div className="public-listing-card-body">
        <img
          className="public-owner-avatar"
          src={resolveListingImageUrl(listing.logoUrl || "/template-17/images/user/970813.jpg")}
          alt=""
        />
        <h2>
          <Link to={href}>{listing.title}</Link>
        </h2>
        {showQuoteAction ? (
          <div className="public-listing-actions">
            <button type="button" onClick={() => onQuoteClick(listing)}>Get quote</button>
          </div>
        ) : null}
      </div>
      <div className="public-card-hover-actions">
        <button className="public-card-call-action" type="button" onClick={() => void openContactAction("call")}>Call Now</button>
        <button className="public-card-whatsapp-action" type="button" onClick={() => void openContactAction("whatsapp")}>WhatsApp</button>
      </div>
    </article>
  );
}

function buildListingDetailHref(listing: ListingSummary) {
  const idQuery = `id=${encodeURIComponent(String(listing.id))}`;
  return categorySlugFromLabel(listing.categoryName) === "events-tickets"
    ? `/event-details?${idQuery}`
    : `/listing-details?${idQuery}`;
}

function QuoteModal({
  form,
  isProfileLoading,
  isSubmitting,
  listing,
  status,
  onChange,
  onClose,
  onSubmit,
}: {
  form: { name: string; email: string; mobileNumber: string; message: string };
  isProfileLoading: boolean;
  isSubmitting: boolean;
  listing: ListingSummary;
  status: string;
  onChange: (updates: Partial<{ name: string; email: string; mobileNumber: string; message: string }>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="public-quote-modal-backdrop" role="dialog" aria-modal="true">
      <form className="public-quote-modal" onSubmit={onSubmit}>
        <div className="public-quote-ribbon">Send Enquiry</div>
        <button type="button" className="public-quote-close" aria-label="Close" onClick={onClose}>x</button>
        <h2>Get Quote</h2>
        <p>{listing.title}</p>
        <input
          type="text"
          placeholder="Enter name*"
          required
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <input
          type="email"
          placeholder="Email*"
          readOnly
          required
          value={form.email}
        />
        <input
          type="tel"
          placeholder="Phone number*"
          required
          value={form.mobileNumber}
          onChange={(event) => onChange({ mobileNumber: event.target.value })}
        />
        <textarea
          placeholder="Enter your query or message"
          value={form.message}
          onChange={(event) => onChange({ message: event.target.value })}
        />
        {status ? <div className="public-quote-status">{status}</div> : null}
        <button type="submit" disabled={isProfileLoading || isSubmitting || !form.email}>
          {isProfileLoading ? "Loading..." : isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}

function getCategory(value: string | null): PublicListingQuery["category"] {
  return value === "real-estate" ||
    value === "restaurants-food" ||
    value === "vehicles" ||
    value === "electronics-appliances" ||
    value === "pets-animals" ||
    value === "care-services" ||
    value === "furniture-home-decor" ||
    value === "fashion-lifestyle" ||
    value === "beauty-services" ||
    value === "books-sports-hobbies" ||
    value === "roommates-rentals" ||
    value === "jobs" ||
    value === "events-tickets" ||
    value === "groups-communities" ||
    value === "chao-tv"
    ? value
    : undefined;
}

function getSort(value: string | null): SortKey {
  return value === "rating" || value === "price-low" || value === "price-high" ? value : "recent";
}

function sortListings(items: ListingSummary[], sort: SortKey) {
  const next = [...items];

  if (sort === "rating") {
    return next.sort((a, b) => Number(b.averageRating || b.rating || 0) - Number(a.averageRating || a.rating || 0));
  }

  if (sort === "price-low") {
    return next.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sort === "price-high") {
    return next.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  return next.sort((a, b) => getLatestListingTime(b) - getLatestListingTime(a));
}

function filterListings(items: ListingSummary[], feature: string, rating: string) {
  return items.filter((item) => {
    if (rating && Math.round(getDisplayRating(item)) < Number(rating)) {
      return false;
    }

    if (!feature) {
      return true;
    }

    if (feature === "Trusted services provider") {
      if (!hasRecordKey(item.settings, "trusted") && !hasRecordKey(item.settings, "isTrusted")) {
        return true;
      }

      return getBoolean(item.settings, "trusted") || getBoolean(item.settings, "isTrusted");
    }

    if (feature === "Premium services") {
      return Boolean(item.userPlanName && !/^free\b/i.test(item.userPlanName));
    }

    if (feature === "Verified services") {
      if (!hasRecordKey(item.settings, "verifiedByAdmin") && !hasRecordKey(item.settings, "isVerified")) {
        return true;
      }

      return getBoolean(item.settings, "verifiedByAdmin") || getBoolean(item.settings, "isVerified");
    }

    if (feature === "Trending services") {
      return Number(item.views || 0) > 0;
    }

    if (feature === "Offers and discounts") {
      if (!hasRecordKey(item.settings, "hasOffers") && !hasRecordKey(item.settings, "offerText")) {
        return true;
      }

      return getBoolean(item.settings, "hasOffers") || getString(item.settings, "offerText").trim().length > 0;
    }

    if (feature === "Latest updated") {
      return getLatestListingTime(item) > 0;
    }

    if (feature === "Most likes") {
      if (!hasRecordKey(item.settings, "likes")) {
        return true;
      }

      return Number(getString(item.settings, "likes") || 0) > 0;
    }

    return true;
  });
}

function getLatestListingTime(listing: ListingSummary) {
  const value = listing.updatedAt || listing.createdAt;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function categoryLabel(category: PublicCategory, options?: Array<{ value: PublicCategory; label: string }>) {
  const optionLabel = options?.find((option) => option.value === category)?.label;
  if (optionLabel) {
    return optionLabel;
  }

  return buildCategoryLabel(category);
}

function buildCategoryOptions(items: ListingSummary[], currentCategory?: PublicCategory) {
  const options: Array<{ value: PublicCategory; label: string }> = [];

  uniqueValues(items.map((item) => item.categoryName))
    .map((label) => ({ label, value: categorySlugFromLabel(label) }))
    .filter((item): item is { label: string; value: PublicCategory } => Boolean(item.value))
    .forEach((item) => {
      if (!options.some((option) => option.value === item.value)) {
        options.push(item);
      }
    });

  if (currentCategory && !options.some((item) => item.value === currentCategory)) {
    options.push({ value: currentCategory, label: buildCategoryLabel(currentCategory) });
  }

  return options;
}

function getFacetItemsForCategory(items: ListingSummary[], category?: PublicCategory, categoryName?: string) {
  if (!category) {
    if (categoryName?.trim()) {
      return items.filter((item) => item.categoryName === categoryName);
    }

    return items;
  }

  return items.filter((item) => categorySlugFromLabel(item.categoryName) === category);
}

function categorySlugFromLabel(label: string): PublicCategory | "" {
  if (label === "Real Estate") return "real-estate";
  if (label === "Restaurants & Food") return "restaurants-food";
  if (label === "Vehicles") return "vehicles";
  if (label === "Electronics & Appliances") return "electronics-appliances";
  if (label === "Pets & Animals") return "pets-animals";
  if (label === "Care Services") return "care-services";
  if (label === "Furniture & Home" || label === "Furniture & Home Decor") return "furniture-home-decor";
  if (label === "Fashion & Lifestyle") return "fashion-lifestyle";
  if (label === "Beauty Services") return "beauty-services";
  if (label === "Books, Sports & Hobbies") return "books-sports-hobbies";
  if (label === "Roommates & Rentals") return "roommates-rentals";
  if (label === "Jobs") return "jobs";
  if (label === "Events & Tickets" || label === "Tickets & Events") return "events-tickets";
  if (label === "Groups & Communities") return "groups-communities";
  if (label === "Chao TV") return "chao-tv";
  return "";
}

function buildCategoryLabel(category: PublicCategory) {
  if (category === "real-estate") return "Real Estate";
  if (category === "restaurants-food") return "Restaurants & Food";
  if (category === "vehicles") return "Vehicles";
  if (category === "electronics-appliances") return "Electronics & Appliances";
  if (category === "pets-animals") return "Pets & Animals";
  if (category === "care-services") return "Care Services";
  if (category === "furniture-home-decor") return "Furniture & Home";
  if (category === "fashion-lifestyle") return "Fashion & Lifestyle";
  if (category === "beauty-services") return "Beauty Services";
  if (category === "books-sports-hobbies") return "Books, Sports & Hobbies";
  if (category === "roommates-rentals") return "Roommates & Rentals";
  if (category === "jobs") return "Jobs";
  if (category === "events-tickets") return "Events & Tickets";
  if (category === "groups-communities") return "Groups & Communities";
  if (category === "chao-tv") return "Chao TV";
  return "Listings";
}

function getBannersForSlot(banners: PageBanner[], slot: string) {
  const matchingBanners = banners
    .filter((banner) => banner.slot === slot && banner.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (matchingBanners.length) {
    return matchingBanners;
  }

  return fallbackListingBanners
    .filter((banner) => banner.slot === slot)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function getListingCity(listing: ListingSummary) {
  return getString(listing.locationDetails, "city") || listing.city || "";
}

function buildLocationText(listing: ListingSummary) {
  return [
    getString(listing.locationDetails, "locality") || listing.locality,
    getListingCity(listing),
  ].filter(Boolean).join(", ");
}

function getListingPhone(listing: ListingSummary) {
  return getString(listing.sellerInformation, "mobileNumber") ||
    getString(listing.sellerInformation, "phoneNumber") ||
    getString(listing.sellerInformation, "phone") ||
    getString(listing.sellerInformation, "contactNumber") ||
    getString(listing.sellerInformation, "mainPhone") ||
    getString(listing.sellerInformation, "whatsAppNumber") ||
    getString(listing.locationDetails, "mainPhone") ||
    getString(listing.propertyDetails, "mainPhone") ||
    getString(listing.propertyDetails, "phoneNumber") ||
    getString(listing.propertyDetails, "contactNumber");
}

function getListingWhatsApp(listing: ListingSummary) {
  return getString(listing.sellerInformation, "whatsAppNumber") ||
    getString(listing.sellerInformation, "whatsapp") ||
    getString(listing.sellerInformation, "whatsApp") ||
    getString(listing.sellerInformation, "mobileNumber") ||
    getString(listing.propertyDetails, "whatsAppNumber") ||
    getString(listing.propertyDetails, "whatsapp") ||
    getString(listing.propertyDetails, "whatsApp");
}

function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

function getDisplayRating(listing: ListingSummary) {
  const rating = Number(listing.averageRating || listing.rating || 0);
  return rating > 0 ? rating : 5;
}

function getOpenStatusLabel(listing: ListingSummary) {
  const activeStatus = listing.status?.trim().toLowerCase();
  if (activeStatus === "active" || !activeStatus) {
    return "Open";
  }

  return listing.status;
}

function getString(record: Record<string, string | number | boolean | string[] | null> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getBoolean(record: Record<string, string | number | boolean | string[] | null> | undefined, key: string) {
  const value = record?.[key];
  return value === true || value === "true" || value === 1 || value === "1";
}

function hasRecordKey(record: Record<string, string | number | boolean | string[] | null> | undefined, key: string) {
  return Boolean(record && Object.prototype.hasOwnProperty.call(record, key));
}

function renderStars(rating: number) {
  const stars = Math.max(1, Math.min(5, Math.round(rating)));
  return String.fromCharCode(9733).repeat(stars);
}
