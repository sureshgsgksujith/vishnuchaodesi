import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getListingApiErrorMessage,
  getPublicListings,
  type ListingSummary,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
} from "../../dashboard/utils/listingImages";
import "../styles/publicListings.css";

const PAGE_SIZE = 12;

type PublicCategory = NonNullable<PublicListingQuery["category"]>;
type SortKey = "recent" | "rating" | "price-low" | "price-high";

export default function AllListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [facetItems, setFacetItems] = useState<ListingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const category = getCategory(searchParams.get("category"));
  const subCategory = searchParams.get("subCategory") || "";
  const city = searchParams.get("city") || "";
  const search = searchParams.get("search") || "";
  const sort = getSort(searchParams.get("sort"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const sortedItems = useMemo(() => sortListings(items, sort), [items, sort]);
  const dynamicCategories = useMemo(() => buildCategoryOptions(facetItems, category), [facetItems, category]);
  const categoryFacetItems = useMemo(() => getFacetItemsForCategory(facetItems, category), [facetItems, category]);
  const dynamicCities = useMemo(() => uniqueValues(categoryFacetItems.map((item) => getListingCity(item))), [categoryFacetItems]);
  const dynamicSubCategories = useMemo(() => uniqueValues(categoryFacetItems.map((item) => item.subCategory)), [categoryFacetItems]);
  const topProviders = useMemo(() => {
    return [...categoryFacetItems]
      .sort((a, b) => Number(b.averageRating || b.rating || b.views || 0) - Number(a.averageRating || a.rating || a.views || 0))
      .slice(0, 5);
  }, [categoryFacetItems]);

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getPublicListings({
          category,
          subCategory,
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
  }, [category, city, page, search, subCategory]);

  useEffect(() => {
    let isActive = true;

    getPublicListings({ page: 1, pageSize: 100 })
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

  return (
    <>
      <CustomerHeader />
      <main className="public-listing-page public-template-page">
        <section className="public-listing-content">
          <div className="container public-listing-shell">
            <aside className="public-filter-panel">
              <div className="public-filter-title">
                <h1>{category ? categoryLabel(category, dynamicCategories) : "All Listings"}</h1>
                <nav>
                  <Link to="/">Home</Link>
                  <span>All Category</span>
                  {category ? <span>{categoryLabel(category, dynamicCategories)}</span> : null}
                  {city ? <span>{city}</span> : null}
                  {subCategory ? <span>{subCategory}</span> : null}
                </nav>
              </div>

              {topProviders.length ? (
                <SidebarCard className="public-provider-card" title="Top Service Providers">
                  {topProviders.map((listing) => (
                    <Link to={`/listing-details?id=${listing.id}`} className="public-provider-row" key={listing.id}>
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
                  <select value={category || ""} onChange={(event) => updateQuery({ category: event.target.value, subCategory: null, page: 1 })}>
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
                <div className="public-wide-ad">
                  <span>Ad</span>
                  <img src="/template-17/images/ads/32207ads.png" alt="" />
                </div>
              ) : null}

              <div className="public-listing-toolbar">
                <div>
                  Total of <strong>{totalCount}</strong> business result(s) found.
                </div>
                <div className="public-filter-tags">
                  {category ? <span>{categoryLabel(category, dynamicCategories)} <button type="button" onClick={() => updateQuery({ category: null, subCategory: null, page: 1 })}>x</button></span> : null}
                  {subCategory ? <span>{subCategory} <button type="button" onClick={() => updateQuery({ subCategory: null, page: 1 })}>x</button></span> : null}
                  {city ? <span>{city} <button type="button" onClick={() => updateQuery({ city: null, page: 1 })}>×</button></span> : null}
                  {search ? <span>{search} <button type="button" onClick={() => updateQuery({ search: null, page: 1 })}>×</button></span> : null}
                  {sortedItems.some((item) => Number(item.averageRating || item.rating || 0) >= 5) ? <span>5 Star <button type="button">×</button></span> : null}
                </div>
              </div>

              {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
              {isLoading ? <div className="alert alert-info">Loading listings...</div> : null}

              {!isLoading && !sortedItems.length ? (
                <div className="public-listing-empty">No approved listings found for this selection.</div>
              ) : null}

              <div className="public-listing-grid">
                {sortedItems.map((listing) => (
                  <ListingCard listing={listing} key={listing.id} />
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

function ListingCard({ listing }: { listing: ListingSummary }) {
  const href = `/listing-details?id=${listing.id}`;
  const imageUrl = listing.primaryImageUrl || listing.imageUrls?.[0] || "";
  const rating = Number(listing.averageRating || listing.rating || 0);
  const displayRating = rating > 0 ? rating : 5;
  const openLabel = getOpenStatusLabel(listing);

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
        <div className="public-listing-actions">
          <Link to={href}>Get quote</Link>
        </div>
      </div>
    </article>
  );
}

function getCategory(value: string | null): PublicListingQuery["category"] {
  return value === "real-estate" || value === "restaurants-food" || value === "vehicles" || value === "electronics-appliances" || value === "care-services" ? value : undefined;
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
  const defaultOptions: Array<{ value: PublicCategory; label: string }> = [
    { value: "real-estate", label: "Real Estate" },
    { value: "restaurants-food", label: "Restaurants & Food" },
    { value: "vehicles", label: "Vehicles" },
    { value: "electronics-appliances", label: "Electronics & Appliances" },
    { value: "care-services", label: "Care Services" },
  ];
  const options = [...defaultOptions];

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

function getFacetItemsForCategory(items: ListingSummary[], category?: PublicCategory) {
  if (!category) {
    return items;
  }

  return items.filter((item) => categorySlugFromLabel(item.categoryName) === category);
}

function categorySlugFromLabel(label: string): PublicCategory | "" {
  if (label === "Real Estate") return "real-estate";
  if (label === "Restaurants & Food") return "restaurants-food";
  if (label === "Vehicles") return "vehicles";
  if (label === "Electronics & Appliances") return "electronics-appliances";
  if (label === "Care Services") return "care-services";
  return "";
}

function buildCategoryLabel(category: PublicCategory) {
  if (category === "real-estate") return "Real Estate";
  if (category === "restaurants-food") return "Restaurants & Food";
  if (category === "vehicles") return "Vehicles";
  if (category === "electronics-appliances") return "Electronics & Appliances";
  if (category === "care-services") return "Care Services";
  return "Listings";
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

function renderStars(rating: number) {
  const stars = Math.max(1, Math.min(5, Math.round(rating)));
  return "★".repeat(stars);
}
