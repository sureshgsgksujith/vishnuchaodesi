import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
import {
  getListing,
  getListingApiErrorMessage,
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../../dashboard/utils/listingImages";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import "../../listing/styles/publicListings.css";
import "../styles/classifieds.css";

const CLASSIFIED_PAGE_SIZE = 12;
const primaryClassifiedCategoryNames = [
  "Real Estate",
  "Restaurants & Food",
  "Vehicles",
  "Care Services",
  "Events & Tickets",
  "Roommates & Rentals",
  "Jobs",
  "Electronics & Appliances",
  "Pets & Animals",
];
const fallbackCategoryNames = primaryClassifiedCategoryNames;
const classifiedCategoryImages: Record<string, string> = {
  "Real Estate": "/template-17/images/services/villa-1.jpg",
  "Restaurants & Food": "/template-17/images/services/resto-1.jpg",
  Vehicles: "/template-17/images/home/usedcar-bg.jpg",
  "Care Services": "/template-17/images/listing-ban/14944pexels-gustavo-fring-3985159.jpg",
  "Events & Tickets": "/template-17/images/events/4.jpg",
  "Roommates & Rentals": "/template-17/images/chao-home-room-listings/2.jpeg",
  Jobs: "/template-17/images/all-job-bg.jpg",
  "Electronics & Appliances": "/template-17/images/products/8.jpeg",
  "Pets & Animals": "/template-17/images/services/pets-1.jpg",
};
const fallbackClassifiedHeroBanners: PageBanner[] = [
  {
    id: 0,
    pageKey: "classifieds",
    slot: "hero",
    title: "Free classifieds near {location}",
    subtitle: "Browse listings, compare counts, and post classified ads in your area.",
    imageUrl: "/template-17/images/places/banne.png",
    displayOrder: 1,
    isActive: true,
  },
];
const fallbackClassifiedLeftBanners: PageBanner[] = [
  {
    id: -1,
    pageKey: "classifieds",
    slot: "left",
    title: "Sidebar banner",
    imageUrl: "/template-17/images/ads/ads1.jpg",
    displayOrder: 1,
    isActive: true,
  },
];
const fallbackClassifiedTopBanners: PageBanner[] = [
  {
    id: -2,
    pageKey: "classifieds",
    slot: "top",
    title: "Classified listing banner",
    imageUrl: "/template-17/images/ads/32207ads.png",
    displayOrder: 1,
    isActive: true,
  },
];
const fallbackClassifiedListBanners = [
  ...fallbackClassifiedTopBanners,
  ...fallbackClassifiedLeftBanners,
];

export function ClassifiedsHomePage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [areCategoryCountsLoading, setAreCategoryCountsLoading] = useState(true);
  const [heroBanners, setHeroBanners] = useState<PageBanner[]>(fallbackClassifiedHeroBanners);
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { activeCity, activeLocationLabel } = useHomeSelectedLocation();
  const currentCity = activeCity;
  const currentLocationLabel = activeLocationLabel || currentCity;
  const visibleHeroBanners = useMemo(() => getBannersForSlot(heroBanners, "hero"), [heroBanners]);
  const activeHeroBanner = visibleHeroBanners[heroBannerIndex] || visibleHeroBanners[0] || fallbackClassifiedHeroBanners[0];
  const heroTitle = formatBannerText(activeHeroBanner.title, fallbackClassifiedHeroBanners[0].title, currentLocationLabel);
  const heroSubtitle = formatBannerText(activeHeroBanner.subtitle, fallbackClassifiedHeroBanners[0].subtitle || "", currentLocationLabel);
  const categoryCards = useMemo(
    () => primaryClassifiedCategoryNames.map((name) => ({
      name,
      count: categoryCounts[name],
      href: buildClassifiedCategoryHref(name, currentCity || ""),
      image: getClassifiedCategoryImage(name),
    })),
    [categoryCounts, currentCity],
  );
  const popularListings = useMemo(() => listings.slice(0, 12), [listings]);
  const popularMarqueeListings = useMemo(
    () => (popularListings.length > 1 ? [...popularListings, ...popularListings] : popularListings),
    [popularListings],
  );

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const listingResult = await getPublicListings({ categoryName: "Classifieds", city: currentCity || undefined, page: 1, pageSize: 12 });

        if (!isActive) return;
        setListings(listingResult.items || []);
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

    void loadData();

    return () => {
      isActive = false;
    };
  }, [currentCity]);

  useEffect(() => {
    let isActive = true;

    async function loadCategoryCounts() {
      try {
        setAreCategoryCountsLoading(true);
        const countEntries = await Promise.all(
          primaryClassifiedCategoryNames.map(async (name) => {
            const result = await getPublicListings({
              categoryName: "Classifieds",
              subCategory: name,
              city: currentCity || undefined,
              page: 1,
              pageSize: 1,
            });

            return [name, result.totalCount || 0] as const;
          }),
        );

        if (!isActive) return;
        setCategoryCounts(Object.fromEntries(countEntries));
      } catch {
        if (isActive) {
          setCategoryCounts({});
        }
      } finally {
        if (isActive) {
          setAreCategoryCountsLoading(false);
        }
      }
    }

    void loadCategoryCounts();

    return () => {
      isActive = false;
    };
  }, [currentCity]);

  useEffect(() => {
    let isActive = true;

    getPageBanners("classifieds")
      .then((items) => {
        if (isActive) {
          const nextBanners = getBannersForSlot(items, "hero");
          setHeroBanners(nextBanners.length ? nextBanners : fallbackClassifiedHeroBanners);
        }
      })
      .catch(() => {
        if (isActive) {
          setHeroBanners(fallbackClassifiedHeroBanners);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setHeroBannerIndex(0);
  }, [visibleHeroBanners.length]);

  useEffect(() => {
    if (visibleHeroBanners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeroBannerIndex((current) => (current + 1) % visibleHeroBanners.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [visibleHeroBanners.length]);

  return (
    <>
      <CustomerHeader />
      <main className="classified-template-page">
        <section className="modu-hom-ban ads-hom-ban classified-hero">
          <div className="classified-hero-track" style={{ transform: `translateX(-${heroBannerIndex * 100}%)` }}>
            {visibleHeroBanners.map((banner) => (
              <ClassifiedHeroBannerSlide banner={banner} key={banner.id} />
            ))}
          </div>
          <div className="modu-hom-ban-inn">
            <div className="container">
              <div className="row">
                <h1>{heroTitle}</h1>
                {heroSubtitle ? <p>{heroSubtitle}</p> : null}
              </div>
            </div>
          </div>
          {visibleHeroBanners.length > 1 ? (
            <div className="classified-hero-dots" aria-label="Classified banner slides">
              {visibleHeroBanners.map((banner, index) => (
                <button
                  type="button"
                  className={index === heroBannerIndex ? "is-active" : ""}
                  key={banner.id}
                  onClick={() => setHeroBannerIndex(index)}
                  aria-label={`Show banner ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="classified-category-section">
          <div className="container">
            <div className="classified-section-title">
              <h2>Classified Categories</h2>
            </div>
            <div className="classified-category-grid">
              <ul>
                {categoryCards.map((item) => (
                  <li key={item.name}>
                    <Link className="classified-category-card" to={item.href}>
                      <div className="plac-hom-box-im">
                        <img src={item.image} alt="" onError={setFallbackListingImage} />
                      </div>
                      <div className="ad-box-txt">
                        <h3>{item.name}</h3>
                        <span>{formatCategoryCount(item.count, areCategoryCountsLoading)} ads</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="ad-modu-com ad-sec-pad plac-deta-sec classified-popular-section">
          <div className="container">
            <div className="row">
              <div className="classified-popular-head">
                <div className="plac-det-tit-inn">
                  <h2>Today Popular Ads</h2>
                </div>
              </div>
              {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
              {isLoading ? <div className="alert alert-info">Loading popular ads...</div> : null}
              <div className="plac-hom-all-pla classified-popular-scroll">
                <ul className={`multiple-items1 classified-card-row classified-popular-row${popularListings.length > 1 ? " is-marquee" : ""}`}>
                  {popularMarqueeListings.map((listing, index) => (
                    <li key={`${listing.id}-${index}`} aria-hidden={index >= popularListings.length}>
                      <ClassifiedAdCard listing={listing} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <div className="row">
              <div className="plac-hom-tit plac-hom-tit-ic-sugg classified-submit-block">
                <h2>Start adding a new Post</h2>
                <p>Post your local classified ad and manage it from your dashboard.</p>
                <Link to={isCustomerAuthenticated() ? "/dashboard/classifieds/step-1" : "/login?login=register&returnUrl=/dashboard/classifieds/step-1"}>Submit a Post</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function ClassifiedHeroBannerSlide({ banner }: { banner: PageBanner }) {
  const image = <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="eager" onError={setFallbackListingImage} />;

  if (banner.linkUrl) {
    return (
      <a className="classified-hero-slide" href={banner.linkUrl}>
        {image}
      </a>
    );
  }

  return <div className="classified-hero-slide">{image}</div>;
}

function ClassifiedListingBanner({ banners, className, index }: { banners: PageBanner[]; className: string; index: number }) {
  const banner = banners[index] || banners[0];

  if (!banner) {
    return null;
  }

  const image = (
    <>
      <span>Ad</span>
      <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="lazy" onError={setFallbackListingImage} />
    </>
  );

  return (
    <div className={className}>
      {banner.linkUrl ? <a href={banner.linkUrl}>{image}</a> : image}
    </div>
  );
}

export function ClassifiedAdsAllPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [facets, setFacets] = useState<ListingSummary[]>([]);
  const [categoryFacetListings, setCategoryFacetListings] = useState<ListingSummary[]>([]);
  const [categories, setCategories] = useState<ListingCategoryOption[]>([]);
  const [pageBanners, setPageBanners] = useState<PageBanner[]>(fallbackClassifiedListBanners);
  const [topBannerIndex, setTopBannerIndex] = useState(0);
  const [leftBannerIndex, setLeftBannerIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const category = searchParams.get("category") || "";
  const detailCategory = searchParams.get("detailCategory") || "";
  const city = searchParams.get("city") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const shouldClientFilterByClassifiedSubcategory = Boolean(category && detailCategory);
        const result = await getPublicListings({
          categoryName: "Classifieds",
          subCategory: category || undefined,
          city: city || undefined,
          search: search || undefined,
          page: shouldClientFilterByClassifiedSubcategory ? 1 : page,
          pageSize: shouldClientFilterByClassifiedSubcategory ? 500 : CLASSIFIED_PAGE_SIZE,
        });
        const categoryItems = result.items || [];
        const filteredItems = detailCategory
          ? categoryItems.filter((item) => getClassifiedSubcategory(item) === detailCategory)
          : categoryItems;
        const pageItems = shouldClientFilterByClassifiedSubcategory
          ? filteredItems.slice((page - 1) * CLASSIFIED_PAGE_SIZE, page * CLASSIFIED_PAGE_SIZE)
          : filteredItems;

        if (!isActive) return;
        setItems(pageItems);
        setTotalCount(shouldClientFilterByClassifiedSubcategory ? filteredItems.length : result.totalCount || 0);
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
  }, [category, city, detailCategory, page, search]);

  useEffect(() => {
    let isActive = true;

    if (!category) {
      setCategoryFacetListings([]);
      return () => {
        isActive = false;
      };
    }

    getPublicListings({
      categoryName: "Classifieds",
      subCategory: category,
      city: city || undefined,
      page: 1,
      pageSize: 200,
    })
      .then((result) => {
        if (isActive) {
          setCategoryFacetListings(result.items || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setCategoryFacetListings([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [category, city]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getPublicListings({ categoryName: "Classifieds", page: 1, pageSize: 50 }),
      getListingCategoryTree().catch(() => []),
    ])
      .then(([result, categoryTree]) => {
        if (isActive) {
          setFacets(result.items || []);
          setCategories(categoryTree);
        }
      })
      .catch(() => {
        if (isActive) {
          setFacets([]);
          setCategories([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const fromTree = categories.map((item) => item.name);
    const fromListings = uniqueValues(facets.map((item) => item.subCategory)).filter(Boolean);
    return uniqueValues([...fromTree, ...fromListings, ...fallbackCategoryNames]);
  }, [categories, facets]);
  const selectedCategoryTree = useMemo(
    () => categories.find((item) => item.name === category),
    [categories, category],
  );
  const detailOptions = useMemo(
    () => buildClassifiedDetailOptions(selectedCategoryTree, categoryFacetListings),
    [categoryFacetListings, selectedCategoryTree],
  );
  const cityOptions = useMemo(() => uniqueValues(facets.map(buildCityText)), [facets]);
  const topBanners = useMemo(() => getBannersForSlot(pageBanners, "top"), [pageBanners]);
  const leftBanners = useMemo(() => getBannersForSlot(pageBanners, "left"), [pageBanners]);
  const topClassifiedAds = useMemo(() => {
    const source = (category ? categoryFacetListings : facets).length
      ? (category ? categoryFacetListings : facets)
      : items;

    return [...source]
      .sort((left, right) => getListingTime(right) - getListingTime(left))
      .slice(0, 5);
  }, [category, categoryFacetListings, facets, items]);
  const pageHeading = detailCategory || category || "Classified Ads";
  const totalPages = Math.max(1, Math.ceil(totalCount / CLASSIFIED_PAGE_SIZE));

  useEffect(() => {
    let isActive = true;

    getPageBanners("classifieds")
      .then((items) => {
        if (isActive) {
          const postedTopBanners = getBannersForSlot(items, "top");
          const postedLeftBanners = getBannersForSlot(items, "left");

          setPageBanners([
            ...(postedTopBanners.length ? postedTopBanners : fallbackClassifiedTopBanners),
            ...(postedLeftBanners.length ? postedLeftBanners : fallbackClassifiedLeftBanners),
          ]);
        }
      })
      .catch(() => {
        if (isActive) {
          setPageBanners(fallbackClassifiedListBanners);
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

  function updateQuery(updates: Record<string, string | number | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null) {
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
      <main className="classified-template-page">
        <section className="event-body ad-modu-com classified-list-page">
          <div className="public-listing-shell classified-public-shell">
            <aside className="public-filter-panel classified-filter-panel">
              <div className="public-filter-title">
                <h1>{pageHeading}</h1>
                <nav aria-label="Breadcrumb">
                  <Link to="/">Home</Link>
                  <Link to="/classifieds/index">Classifieds</Link>
                  {category ? <span>{category}</span> : null}
                  {detailCategory ? <span>{detailCategory}</span> : null}
                </nav>
              </div>

              <section className="public-sidebar-card public-provider-card classified-provider-card">
                <h2>Top Classified Ads</h2>
                {topClassifiedAds.length ? (
                  topClassifiedAds.map((listing) => (
                    <Link to={`/classifieds/ads-details?id=${listing.id}`} className="public-provider-row classified-provider-row" key={listing.id}>
                      <img src={getListingImages(listing)[0]} alt="" loading="lazy" onError={setFallbackListingImage} />
                      <span>
                        <strong>{listing.title}</strong>
                        <small>{buildLocationText(listing) || listing.subCategory || "Classifieds"}</small>
                      </span>
                      <b>Ad</b>
                    </Link>
                  ))
                ) : (
                  <div className="classified-provider-empty">No classified ads yet.</div>
                )}
              </section>

              <section className="public-sidebar-card classified-sidebar-filters">
                <h2><i className="material-icons">tune</i>Filters</h2>
                <form onSubmit={(event) => event.preventDefault()}>
                  <label>
                    <span>Search</span>
                    <input value={search} onChange={(event) => updateQuery({ search: event.target.value, page: 1 })} placeholder="Search ads in your city..." />
                  </label>
                  <label>
                    <span>City</span>
                    <select value={city} onChange={(event) => updateQuery({ city: event.target.value, page: 1 })}>
                      <option value="">All City</option>
                      {cityOptions.map((option) => (
                        <option value={option} key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Category</span>
                    <select value={category} onChange={(event) => updateQuery({ category: event.target.value, detailCategory: null, page: 1 })}>
                      <option value="">All Category</option>
                      {categoryOptions.map((option) => (
                        <option value={option} key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Subcategory</span>
                    <select value={detailCategory} onChange={(event) => updateQuery({ detailCategory: event.target.value, page: 1 })} disabled={!category}>
                      <option value="">All Subcategory</option>
                      {detailOptions.map((option) => (
                        <option value={option} key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </form>
              </section>

              <ClassifiedListingBanner banners={leftBanners} className="public-side-ad classified-side-ad" index={leftBannerIndex} />
            </aside>

            <div className="public-listing-results classified-listing-results-panel">
              <ClassifiedListingBanner banners={topBanners} className="public-wide-ad classified-wide-ad" index={topBannerIndex} />

              <div className="public-listing-toolbar classified-listing-toolbar">
                <div>
                  Total of <strong>{totalCount}</strong> ads found.
                </div>
                <div className="public-filter-tags">
                  {category ? <span>{category} <button type="button" onClick={() => updateQuery({ category: null, detailCategory: null, page: 1 })}>x</button></span> : null}
                  {detailCategory ? <span>{detailCategory} <button type="button" onClick={() => updateQuery({ detailCategory: null, page: 1 })}>x</button></span> : null}
                  {city ? <span>{city} <button type="button" onClick={() => updateQuery({ city: null, page: 1 })}>x</button></span> : null}
                  {search ? <span>{search} <button type="button" onClick={() => updateQuery({ search: null, page: 1 })}>x</button></span> : null}
                </div>
              </div>

              {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
              {isLoading ? <div className="alert alert-info">Loading ads...</div> : null}
              {!isLoading && !items.length ? <div className="classified-empty">No classified ads found.</div> : null}

              <ul id="intseres" className="events-wrapper classified-list-results">
                {items.map((listing) => (
                  <li key={listing.id}>
                    <ClassifiedAdCard listing={listing} />
                  </li>
                ))}
              </ul>

              <div className="classified-pagination">
                <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: page - 1 })}>Previous</button>
                <strong>{page} / {totalPages}</strong>
                <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: page + 1 })}>Next</button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

export function ClassifiedAdDetailsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [relatedListings, setRelatedListings] = useState<ListingSummary[]>([]);
  const isAuthenticated = isCustomerAuthenticated();
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");
  const requestedId = Number(searchParams.get("id") || searchParams.get("listingId"));

  useEffect(() => {
    let isActive = true;

    async function loadListing() {
      if (!isAuthenticated) {
        setListing(null);
        setRelatedListings([]);
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        let currentListing: ListingSummary | null = null;

        if (Number.isFinite(requestedId) && requestedId > 0) {
          currentListing = await getListing(requestedId);
        } else {
          const result = await getPublicListings({ categoryName: "Classifieds", page: 1, pageSize: 1 });
          currentListing = result.items[0] || null;
        }

        if (!isActive) return;

        if (!currentListing) {
          setListing(null);
          setRelatedListings([]);
          setErrorMessage("Classified ad not found.");
          return;
        }

        setListing(currentListing);
        const related = await getPublicListings({
          categoryName: "Classifieds",
          subCategory: currentListing.subCategory || undefined,
          page: 1,
          pageSize: 8,
        });

        if (isActive) {
          setRelatedListings((related.items || []).filter((item) => item.id !== currentListing?.id));
        }
      } catch (error) {
        if (isActive) {
          setListing(null);
          setRelatedListings([]);
          setErrorMessage(getListingApiErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, requestedId]);

  return (
    <>
      <CustomerHeader />
      <main className="classified-template-page">
        <section className="ad-post-detai-pg classified-detail-page">
          <div className="container">
            {isLoading ? <div className="alert alert-info">Loading classified ad...</div> : null}
            {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
            {listing ? <ClassifiedDetail listing={listing} relatedListings={relatedListings} /> : null}
            {!isAuthenticated ? (
              <ClassifiedLoginRequiredPrompt
                title="Login required"
                message="Please login to view classified ad details."
                closeTo="/classifieds/ads-all"
                returnTo={`${location.pathname}${location.search}`}
              />
            ) : null}
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function ClassifiedLoginRequiredPrompt({
  title,
  message,
  closeTo,
  returnTo,
}: {
  title: string;
  message: string;
  closeTo: string;
  returnTo: string;
}) {
  const loginPath = `/login?returnUrl=${encodeURIComponent(returnTo)}`;

  return (
    <div className="public-login-prompt-backdrop" role="dialog" aria-modal="true" aria-labelledby="classified-login-prompt-title">
      <div className="public-login-prompt">
        <h4 id="classified-login-prompt-title">{title}</h4>
        <p>{message}</p>
        <div>
          <Link className="btn btn-primary" to={loginPath}>Login</Link>
          <Link className="btn btn-default" to={closeTo}>Close</Link>
        </div>
      </div>
    </div>
  );
}

function ClassifiedDetail({ listing, relatedListings }: { listing: ListingSummary; relatedListings: ListingSummary[] }) {
  const images = getListingImages(listing);
  const rows = getClassifiedDetailRows(listing);
  const address = buildLocationText(listing);
  const sellerName = listing.sellerName || getRecordString(listing.sellerInformation, "name") || "Seller";
  const postedDate = formatDate(listing.createdAt);
  const contactRows = buildClassifiedContactRows(listing, sellerName);
  const phoneRow = contactRows.find((row) => row.label === "Phone");
  const emailRow = contactRows.find((row) => row.label === "Email");
  const locationRows = buildClassifiedLocationRows(listing);
  const overviewRows = buildClassifiedOverviewRows(listing, postedDate);
  const pricingRows = buildRecordRows(listing.priceDetails, ["price"]);
  const sellerRows = buildRecordRows(listing.sellerInformation, ["name", "email", "phone", "phoneNumber", "mobile", "mobileNumber", "contactNumber", "whatsappNumber"]);
  const settingRows = buildRecordRows(listing.settings, ["metaTitle", "metaDescription"]);
  const amenityRows = Object.entries(listing.amenities || {})
    .filter(([, value]) => value)
    .map(([key]) => ({ label: toTitleLabel(key), value: "Available" }));
  const mediaRows = buildClassifiedMediaRows(listing);
  const detailTabs = useMemo(() => [
    { id: "contact", title: "Contact", icon: "contact_phone", rows: contactRows },
    { id: "location", title: "Location", icon: "location_on", rows: locationRows },
    { id: "overview", title: "Overview", icon: "assignment", rows: overviewRows },
    { id: "price", title: "Price", icon: "payments", rows: pricingRows },
    { id: "details", title: "Details", icon: "fact_check", rows },
    { id: "seller", title: "Seller", icon: "person", rows: sellerRows },
    { id: "amenities", title: "Amenities", icon: "check_circle", rows: amenityRows },
    { id: "media", title: "Media", icon: "perm_media", rows: mediaRows },
    { id: "settings", title: "Settings", icon: "settings", rows: settingRows },
  ].filter((tab) => tab.rows.length), [amenityRows, contactRows, locationRows, mediaRows, overviewRows, pricingRows, rows, sellerRows, settingRows]);
  const companyRows: ClassifiedDetailRow[] = [
    phoneRow,
    emailRow,
    { label: "Seller", value: sellerName, icon: "person" },
    address ? { label: "Location", value: address, icon: "location_on" } : null,
    listing.city ? { label: "City", value: listing.city, icon: "location_city" } : null,
    listing.subCategory ? { label: "Category", value: listing.subCategory, icon: "category" } : null,
  ].filter((row): row is ClassifiedDetailRow => Boolean(row?.value));
  const whatsappNumber = normalizePhoneNumber(
    getFirstRecordString(listing.sellerInformation, ["whatsappNumber", "phoneNumber", "phone", "mobileNumber", "mobile", "contactNumber"]) || phoneRow?.value || "",
  );
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
  const enquiryFormId = `classified-enquiry-${listing.id}`;
  const [isLiked, setIsLiked] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [enquiryStatus, setEnquiryStatus] = useState("");
  const [activeDetailTabId, setActiveDetailTabId] = useState("contact");
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    message: "",
  });
  const activeDetailTab = detailTabs.find((tab) => tab.id === activeDetailTabId) || detailTabs[0];

  async function handleShare() {
    const shareUrl = window.location.href;
    const shareData = {
      title: listing.title,
      text: `${listing.title} - ${formatListingPrice(listing)}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Link copied");
      }
    } catch {
      setShareStatus("");
      return;
    }

    window.setTimeout(() => setShareStatus(""), 2200);
  }

  function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enquiryForm.name.trim() || !enquiryForm.email.trim() || !enquiryForm.mobileNumber.trim()) {
      setEnquiryStatus("Please enter name, email, and mobile number.");
      return;
    }

    setEnquiryStatus("Enquiry submitted. The seller can follow up with you.");
  }

  return (
    <>
      <div className="eve-deta-pg-main classified-detail-shell">
        <div className="lhs">
          <div className="plac-hom-all-pla ad-post-detai-ban">
            <ul className="postbansli classified-detail-images">
              <li>
                <img src={images[0]} alt="" onError={setFallbackListingImage} />
              </li>
            </ul>
            <div className="classified-gallery-dots">
              <span className="active"></span>
              <span></span>
            </div>
          </div>
          <div className="eve-deta-body blog-deta-body">
            <div className="eve-deta-body-main row">
              <div className="lhs">
                <div className="head row">
                  <div className="eve-bred-crum">
                    <ul>
                      <li><Link to="/">Home</Link></li>
                      <li><Link to={`/classifieds/ads-all?category=${encodeURIComponent(listing.subCategory || "")}`}>{listing.subCategory || "Classifieds"}</Link></li>
                      <li><span>{listing.title}</span></li>
                    </ul>
                  </div>
                  <h1 className="a_name">{listing.title}</h1>
                  <div className="blog-bred-post-date">
                    <span className="ic-time">{postedDate}</span>
                    <span className="ic-view">{listing.views || 0}</span>
                  </div>
                </div>
                <div className="as-details">
                  <div className="desc">{listing.description}</div>
                  <ClassifiedTabbedDetails
                    activeTabId={activeDetailTab?.id || ""}
                    activeTab={activeDetailTab}
                    tabs={detailTabs}
                    onTabChange={setActiveDetailTabId}
                  />
                  <div className="tags">
                    <span>{listing.title} sale in {listing.city || listing.subCategory || "your city"}</span>
                    {address ? <span>{listing.title} sale in {address}</span> : null}
                  </div>
                </div>
                <div className="list-sh classified-detail-actions">
                  <button type="button" className="share-new" onClick={handleShare}><i className="material-icons">share</i> Share now</button>
                  <button type="button" className={`classified-save-action${isLiked ? " is-active" : ""}`} onClick={() => setIsLiked((current) => !current)}>
                    <i className="material-icons">{isLiked ? "thumb_up" : "thumb_up_off_alt"}</i>
                    {isLiked ? "Saved" : "Save"}
                  </button>
                  {shareStatus ? <span className="classified-action-status">{shareStatus}</span> : null}
                </div>
                <div className="sec-3">
                  <div className="pro-bad-sml">
                    <img src="/template-17/images/user/970813.jpg" alt="" />
                    <h4>{sellerName}</h4>
                    <b>Joined on {postedDate}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside className="rhs">
          <div className="apost-detals-box">
            <div className="apost-bio">
              <h2 className="a_price">{formatListingPrice(listing)}</h2>
              <div className="share">
                <button type="button" className="share-ic" onClick={handleShare} aria-label="Share classified ad"><i className="material-icons">share</i></button>
                <button type="button" className={`share-ic${isLiked ? " is-active" : ""}`} onClick={() => setIsLiked((current) => !current)} aria-label="Save classified ad">
                  <i className="material-icons">{isLiked ? "thumb_up" : "thumb_up_off_alt"}</i>
                </button>
              </div>
              <p>{listing.title}</p>
            </div>
            <div className="adost-bio-2">
              <p className="addr a_addr">{address || "Location not provided"}</p>
              <div className="classified-detail-side-actions">
                {phoneRow?.href ? (
                  <a href={phoneRow.href} className="classified-detail-action-button"><i className="material-icons">phone</i> Call Now</a>
                ) : (
                  <span className="classified-detail-action-button is-disabled"><i className="material-icons">phone</i> Call Now</span>
                )}
              </div>
            </div>
            <div className="classified-detail-side-stats">
              <span className="classified-detail-stat-action">
                <i className="material-icons">visibility</i>
                <b>{listing.views || 0} Views</b>
              </span>
              {whatsappHref ? (
                <a className="classified-detail-stat-action" href={whatsappHref} target="_blank" rel="noreferrer">
                  <i className="material-icons">chat</i>
                  <b>WhatsApp</b>
                </a>
              ) : (
                <span className="classified-detail-stat-action is-disabled">
                  <i className="material-icons">chat</i>
                  <b>WhatsApp</b>
                </span>
              )}
              <button type="button" className="classified-detail-stat-action" onClick={handleShare}>
                <i className="material-icons">share</i>
                <b>Share</b>
              </button>
            </div>
            <section className="classified-company-info">
              <h3><span>Company</span> Info</h3>
              <div className="classified-company-info-list">
                {companyRows.map((row) => {
                  const content = (
                    <>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </>
                  );

                  return row.href ? (
                    <a href={row.href} key={`${row.label}-${row.value}`}>
                      {content}
                    </a>
                  ) : (
                    <div key={`${row.label}-${row.value}`}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="list-rhs-form pglist-bg pglist-p-com">
              <div className="quote-pop" id={enquiryFormId}>
                <h3>Send enquiry</h3>
                <form onSubmit={submitEnquiry}>
                  <fieldset disabled={!isCustomerAuthenticated()}>
                    <div className="form-group ic-user"><i className="material-icons">person</i><input className="form-control" placeholder="Enter name*" value={enquiryForm.name} onChange={(event) => setEnquiryForm((current) => ({ ...current, name: event.target.value }))} /></div>
                    <div className="form-group ic-eml"><i className="material-icons">email</i><input className="form-control" type="email" placeholder="Enter email*" value={enquiryForm.email} onChange={(event) => setEnquiryForm((current) => ({ ...current, email: event.target.value }))} /></div>
                    <div className="form-group ic-pho"><i className="material-icons">phone</i><PhoneNumberInput value={enquiryForm.mobileNumber} onChange={(mobileNumber) => setEnquiryForm((current) => ({ ...current, mobileNumber }))} placeholder="Enter mobile number *" required /></div>
                    <div className="form-group"><textarea className="form-control" rows={3} placeholder="Enter your query or message" value={enquiryForm.message} onChange={(event) => setEnquiryForm((current) => ({ ...current, message: event.target.value }))}></textarea></div>
                  </fieldset>
                  {enquiryStatus ? <p className="classified-enquiry-status">{enquiryStatus}</p> : null}
                  {isCustomerAuthenticated() ? (
                    <button type="submit" className="btn btn-primary">Submit</button>
                  ) : (
                    <Link to={`/login?returnUrl=/classifieds/ads-details?id=${listing.id}`} className="btn btn-primary">Login &amp; Enjoy Our Services</Link>
                  )}
                </form>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {relatedListings.length ? (
        <div className="pro-rel-posts classified-related-posts">
          <h4>Related Posts</h4>
          <div className="plac-hom-all-pla plac-det-eve">
            <ul className="multiple-items1 classified-card-row">
              {relatedListings.slice(0, 4).map((related) => (
                <li key={related.id}>
                  <ClassifiedRelatedCard listing={related} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

type ClassifiedDetailRow = {
  label: string;
  value: string;
  href?: string;
  icon?: string;
};

type ClassifiedDetailTab = {
  id: string;
  title: string;
  icon: string;
  rows: ClassifiedDetailRow[];
};

function ClassifiedTabbedDetails({
  tabs,
  activeTab,
  activeTabId,
  onTabChange,
}: {
  tabs: ClassifiedDetailTab[];
  activeTab?: ClassifiedDetailTab;
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}) {
  if (!tabs.length || !activeTab) {
    return null;
  }

  return (
    <section className="classified-tabbed-details">
      <div className="classified-tab-list" role="tablist" aria-label="Classified details">
        {tabs.map((tab) => (
          <button
            type="button"
            className={tab.id === activeTabId ? "is-active" : ""}
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTabId}
            onClick={() => onTabChange(tab.id)}
          >
            <i className="material-icons">{tab.icon}</i>
            <span>{tab.title}</span>
          </button>
        ))}
      </div>
      <div className="classified-tab-panel" role="tabpanel">
        <div className="classified-tab-panel-head">
          <i className="material-icons">{activeTab.icon}</i>
          <div>
            <span>Classified information</span>
            <h2>{activeTab.title}</h2>
          </div>
        </div>
        <dl>
          {activeTab.rows.map((row) => (
            <div key={`${activeTab.id}-${row.label}-${row.value}`}>
              <dt>{row.label}</dt>
              <dd>{row.href ? <a href={row.href}>{row.value}</a> : row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ClassifiedAdCard({ listing, compact = false }: { listing: ListingSummary; compact?: boolean }) {
  const image = getListingImages(listing)[0];

  return (
    <Link to={`/classifieds/ads-details?id=${listing.id}`} className={`plac-hom-box ad-box classified-ad-card${compact ? " compact" : ""}`}>
      <div className="plac-hom-box-im">
        <img src={image} alt="" onError={setFallbackListingImage} />
        <h4>{formatListingPrice(listing)}</h4>
      </div>
      <div className="ad-box-txt">
        <h3>{listing.title}</h3>
        <span className="loc">{buildLocationText(listing) || listing.subCategory || "Classifieds"}</span>
        <span className="dat">{formatAge(listing.createdAt)}</span>
      </div>
    </Link>
  );
}

function ClassifiedRelatedCard({ listing }: { listing: ListingSummary }) {
  const image = getListingImages(listing)[0];

  return (
    <Link to={`/classifieds/ads-details?id=${listing.id}`} className="all-pro-box classified-related-card">
      <div className="all-pro-img">
        <img src={image} alt="" onError={setFallbackListingImage} />
      </div>
      <div className="all-pro-txt">
        <h4>{listing.title}</h4>
        <span className="pri">
          <b className="pro-off">{formatListingPrice(listing)}</b>
        </span>
      </div>
    </Link>
  );
}

function getClassifiedCategoryImage(categoryName: string, category?: ListingCategoryOption) {
  if (category?.iconUrl) {
    return resolveListingImageUrl(category.iconUrl);
  }

  return classifiedCategoryImages[categoryName] || "/template-17/classifieds/images/4.jpeg";
}

function buildClassifiedCategoryHref(categoryName: string, city: string) {
  const params = new URLSearchParams({ category: categoryName });
  if (city) {
    params.set("city", city);
  }

  return `/classifieds/ads-all?${params.toString()}`;
}

function getBannersForSlot(banners: PageBanner[], slot: string) {
  return banners
    .filter((banner) => banner.isActive && banner.slot.trim().toLowerCase() === slot)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}

function formatBannerText(value: string | null | undefined, fallback: string, locationLabel: string) {
  return (value?.trim() || fallback)
    .replace(/\{location\}/gi, locationLabel || "you")
    .replace(/\s+/g, " ")
    .trim();
}

function buildClassifiedDetailOptions(category: ListingCategoryOption | undefined, listings: ListingSummary[]) {
  const fromTree = category ? category.subCategories.map((subCategory) => subCategory.name) : [];
  const fromListings = listings.map(getClassifiedSubcategory);
  return uniqueValues([...fromTree, ...fromListings]);
}

function getClassifiedSubcategory(listing: ListingSummary) {
  const parsedOther = parseOtherInformation(listing.propertyDetails?.otherInformation);
  return getRecordString(parsedOther, "classifiedSubCategory") || listing.detailCategory || "";
}

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count).padStart(2, "0");
}

function formatCategoryCount(count: number | undefined, isLoading: boolean) {
  if (count === undefined && isLoading) {
    return "...";
  }

  return formatCount(count || 0);
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getListingImages(listing: ListingSummary) {
  const imageUrls = [
    listing.primaryImageUrl,
    ...(listing.imageUrls || []),
  ].filter(Boolean) as string[];

  if (!imageUrls.length) {
    return ["/template-17/classifieds/images/1.jpg"];
  }

  return uniqueValues(imageUrls).map(resolveListingImageUrl);
}

function getClassifiedDetailRows(listing: ListingSummary) {
  const details = { ...(listing.propertyDetails || {}) };
  delete details.listingKind;
  delete details.propertyType;
  delete details.otherInformation;

  const parsedOther = parseOtherInformation(listing.propertyDetails?.otherInformation);
  const customFields = parsedOther.customFields && typeof parsedOther.customFields === "object"
    ? parsedOther.customFields as Record<string, unknown>
    : {};

  return Object.entries({ ...details, ...customFields })
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 16)
    .map(([key, value]) => ({
      label: toTitleLabel(key),
      value: String(value),
    }));
}

function buildClassifiedContactRows(listing: ListingSummary, sellerName: string): ClassifiedDetailRow[] {
  const sellerInfo = listing.sellerInformation || {};
  const email = getFirstRecordString(sellerInfo, ["email", "sellerEmail", "contactEmail", "emailAddress"]);
  const phone = getFirstRecordString(sellerInfo, ["phoneNumber", "phone", "mobileNumber", "mobile", "contactNumber", "whatsappNumber"]);
  const phoneCode = getFirstRecordString(sellerInfo, ["phoneCountryCode", "countryCode", "dialCode"]);
  const rows: ClassifiedDetailRow[] = [{ label: "Seller", value: sellerName, icon: "person" }];

  if (email) {
    rows.push({ label: "Email", value: email, href: `mailto:${email}`, icon: "email" });
  }

  if (phone || phoneCode) {
    const phoneValue = uniqueValues([phoneCode, phone]).join(" ");
    rows.push({ label: "Phone", value: phoneValue, href: phone ? `tel:${phoneValue.replace(/\s+/g, "")}` : undefined, icon: "phone" });
  }

  return rows;
}

function buildClassifiedLocationRows(listing: ListingSummary): ClassifiedDetailRow[] {
  const location = listing.locationDetails || {};
  const rows = [
    { label: "Locality", value: getRecordString(location, "locality") || listing.locality || "" },
    { label: "City", value: getRecordString(location, "city") || listing.city || "" },
    { label: "State", value: getRecordString(location, "state") },
    { label: "Country", value: getRecordString(location, "country") },
    { label: "Pincode", value: getRecordString(location, "pincode") },
    { label: "Landmark", value: getRecordString(location, "landmark") },
    { label: "Latitude", value: getRecordString(location, "latitude") },
    { label: "Longitude", value: getRecordString(location, "longitude") },
  ];

  return rows.filter((row) => row.value.trim());
}

function buildClassifiedOverviewRows(listing: ListingSummary, postedDate: string): ClassifiedDetailRow[] {
  return [
    { label: "Category", value: listing.categoryName },
    { label: "Subcategory", value: listing.subCategory },
    { label: "Detail Category", value: listing.detailCategory },
    { label: "Status", value: listing.status },
    { label: "Price", value: formatListingPrice(listing) },
    { label: "Views", value: String(listing.views || 0) },
    { label: "Rating", value: listing.averageRating || listing.rating ? String(listing.averageRating || listing.rating) : "" },
    { label: "Reviews", value: listing.totalReviews ? String(listing.totalReviews) : "" },
    { label: "Posted", value: postedDate },
    { label: "Updated", value: formatDate(listing.updatedAt) },
    { label: "Plan", value: listing.userPlanName || listing.userPlanCode || "" },
    { label: "Plan Expiry", value: formatDate(listing.userPlanExpiryDate) },
  ].filter((row) => row.value.trim());
}

function buildClassifiedMediaRows(listing: ListingSummary): ClassifiedDetailRow[] {
  return [
    { label: "Video", value: listing.videoUrl || "", href: listing.videoUrl || undefined },
    { label: "Virtual Tour", value: listing.virtualTourUrl || "", href: listing.virtualTourUrl || undefined },
    { label: "Logo", value: listing.logoUrl || "", href: listing.logoUrl ? resolveListingImageUrl(listing.logoUrl) : undefined },
    { label: "Cover Banner", value: listing.coverBannerUrl || "", href: listing.coverBannerUrl ? resolveListingImageUrl(listing.coverBannerUrl) : undefined },
  ].filter((row) => row.value.trim());
}

function buildRecordRows(
  record: Record<string, unknown> | undefined,
  excludeKeys: string[] = [],
): ClassifiedDetailRow[] {
  if (!record) {
    return [];
  }

  const excluded = new Set(excludeKeys.map((key) => key.toLowerCase()));

  return Object.entries(record)
    .filter(([key, value]) => !excluded.has(key.toLowerCase()) && hasDisplayValue(value))
    .map(([key, value]) => ({
      label: toTitleLabel(key),
      value: formatDetailValue(value),
    }));
}

function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function formatDetailValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatDetailValue).filter(Boolean).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, childValue]) => hasDisplayValue(childValue))
      .map(([key, childValue]) => `${toTitleLabel(key)}: ${formatDetailValue(childValue)}`)
      .join(", ");
  }

  return String(value ?? "").trim();
}

function parseOtherInformation(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatListingPrice(listing: ListingSummary) {
  const price = Number(listing.price ?? listing.priceDetails?.price ?? 0);
  return price > 0 ? formatCurrencyAmount(price, getRecordString(listing.locationDetails, "country")) : "Contact seller";
}

function buildLocationText(listing: ListingSummary) {
  return uniqueValues([
    getRecordString(listing.locationDetails, "locality") || listing.locality || "",
    getRecordString(listing.locationDetails, "city") || listing.city || "",
    getRecordString(listing.locationDetails, "state"),
  ]).join(", ");
}

function buildCityText(listing: ListingSummary) {
  return listing.city || getRecordString(listing.locationDetails, "city");
}

function getRecordString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

function getFirstRecordString(record: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = getRecordString(record, key).trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatAge(value?: string | null) {
  if (!value) {
    return "Recently posted";
  }

  const createdAt = new Date(value).getTime();
  const now = Date.now();
  if (Number.isNaN(createdAt) || createdAt > now) {
    return "Recently posted";
  }

  const days = Math.max(0, Math.floor((now - createdAt) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

function getListingTime(listing: ListingSummary) {
  const value = listing.updatedAt || listing.createdAt;
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function toTitleLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
