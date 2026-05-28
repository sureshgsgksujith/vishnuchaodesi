import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getListing,
  getListingApiErrorMessage,
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../../dashboard/utils/listingImages";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/classifieds.css";

const CLASSIFIED_PAGE_SIZE = 12;
const fallbackCategoryNames = ["Vehicles", "Real Estate", "Mobiles", "Jobs", "Electronics & Appliances", "Furniture", "Fashion", "Pets"];
const classifiedHomeCards = [
  { title: "Bike", image: "/template-17/classifieds/images/1.jpg", category: "Vehicles" },
  { title: "House rent", image: "/template-17/classifieds/images/2.jpg", category: "Real Estate" },
  { title: "Villas for sale", image: "/template-17/classifieds/images/3.jpeg", category: "Real Estate" },
  { title: "House for sale", image: "/template-17/classifieds/images/4.jpeg", category: "Real Estate" },
  { title: "Resorts", image: "/template-17/classifieds/images/5.jpg", category: "Restaurants & Food" },
  { title: "Pets", image: "/template-17/classifieds/images/pets-1.jpg", category: "Care Services" },
  { title: "Shoes", image: "/template-17/classifieds/images/7.jpeg", category: "Vehicles" },
  { title: "Electricals", image: "/template-17/classifieds/images/8.jpg", category: "Vehicles" },
];

export function ClassifiedsHomePage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const listingResult = await getPublicListings({ categoryName: "Classifieds", page: 1, pageSize: 12 });

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
  }, []);

  return (
    <>
      <CustomerHeader />
      <main className="classified-template-page">
        <section className="modu-hom-ban ads-hom-ban classified-hero">
          <div className="modu-hom-ban-inn">
            <div className="container">
              <div className="row">
                <h1>Free classifieds in <strong>India</strong></h1>
                <p>Buy and Sell for free anywhere in <strong>India</strong> with <strong>OLX</strong> Online Classified Advertising</p>
              </div>
            </div>
          </div>
        </section>

        <section className="ad-modu-com ad-sec-pad asd-all-hom">
          <div className="container">
            <div className="row">
              <div className="plac-det-tit-inn">
                <h2>All Ads</h2>
              </div>
              {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
              {isLoading ? <div className="alert alert-info">Loading classified ads...</div> : null}
              <div className="plac-hom-all-pla classified-category-grid">
                <ul className="row">
                  {classifiedHomeCards.map((category) => (
                    <li className="col-lg-3 col-md-6 col-sm-6" key={category.title}>
                      <Link className="plac-hom-box ad-box classified-category-card" to={`/classifieds/ads-all?category=${encodeURIComponent(category.category)}`}>
                        <div className="plac-hom-box-im">
                          <img src={category.image} alt="" onError={setFallbackListingImage} />
                        </div>
                        <div className="ad-box-txt">
                          <h3>{category.title}</h3>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="ad-modu-com ad-sec-pad plac-deta-sec">
          <div className="container">
            <div className="row">
              <div className="plac-det-tit-inn">
                <h2>Today Popular Ads</h2>
              </div>
              <div className="plac-hom-all-pla">
                <ul className="multiple-items1 classified-card-row">
                  {listings.slice(0, 5).map((listing) => (
                    <li key={listing.id}>
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

export function ClassifiedAdsAllPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [facets, setFacets] = useState<ListingSummary[]>([]);
  const [categories, setCategories] = useState<ListingCategoryOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const category = searchParams.get("category") || "";
  const city = searchParams.get("city") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const result = await getPublicListings({
          categoryName: "Classifieds",
          subCategory: category || undefined,
          city: city || undefined,
          search: search || undefined,
          page,
          pageSize: CLASSIFIED_PAGE_SIZE,
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
  }, [category, city, page, search]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getPublicListings({ categoryName: "Classifieds", page: 1, pageSize: 200 }),
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
    const fromListings = uniqueValues(facets.map((item) => item.subCategory));
    return uniqueValues([...fromTree, ...fromListings, ...fallbackCategoryNames]);
  }, [categories, facets]);
  const cityOptions = useMemo(() => uniqueValues(facets.map(buildCityText)), [facets]);
  const totalPages = Math.max(1, Math.ceil(totalCount / CLASSIFIED_PAGE_SIZE));

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
          <div className="container">
            <div className="row">
              <aside className="col-md-3 fil-mob-view classified-filter-panel">
                <div className="ban-search">
                  <h1>{category ? `${category} Ads` : "Classified Ads"}</h1>
                  <p>{totalCount} ads found</p>
                  <form onSubmit={(event) => event.preventDefault()}>
                    <ul className="row">
                      <li className="sr-sea">
                        <input value={search} onChange={(event) => updateQuery({ search: event.target.value, page: 1 })} placeholder="Search ads in your city..." />
                      </li>
                      <li className="sr-cit">
                        <select value={city} onChange={(event) => updateQuery({ city: event.target.value, page: 1 })}>
                          <option value="">All City</option>
                          {cityOptions.map((option) => (
                            <option value={option} key={option}>{option}</option>
                          ))}
                        </select>
                      </li>
                      <li className="sr-cate">
                        <select value={category} onChange={(event) => updateQuery({ category: event.target.value, page: 1 })}>
                          <option value="">All Category</option>
                          {categoryOptions.map((option) => (
                            <option value={option} key={option}>{option}</option>
                          ))}
                        </select>
                      </li>
                    </ul>
                  </form>
                  <div className="filt-com lhs-ads">
                    <div className="ads-box">
                      <Link to="/pricing-details">
                        <span>Ad</span>
                        <img src="/template-17/images/ads/ads1.jpg" alt="" />
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="col-md-9 us-ppg-com">
                <ul id="intseres" className="events-wrapper classified-list-results">
                  <div className="listng-res">
                    <div className="count_no">Total of <span>{totalCount}</span> events found.</div>
                    <div className="list-res-selt"></div>
                  </div>
                  {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
                  {isLoading ? <div className="alert alert-info">Loading ads...</div> : null}
                  {!isLoading && !items.length ? <div className="classified-empty">No classified ads found.</div> : null}
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
                  {rows.length ? (
                    <div className="list">
                      <ul>
                        {rows.map((row) => (
                          <li key={row.label}>{row.label}: {row.value}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="tags">
                    <span>{listing.title} sale in {listing.city || listing.subCategory || "your city"}</span>
                    {address ? <span>{listing.title} sale in {address}</span> : null}
                  </div>
                </div>
                <div className="list-sh">
                  <button type="button" className="share-new"><i className="material-icons">share</i> Share now</button>
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
                <span className="share-ic"><i className="material-icons">share</i></span>
                <span className="share-ic"><i className="material-icons">thumb_up</i></span>
              </div>
              <p>{listing.title}</p>
            </div>
            <div className="adost-bio-2">
              <p className="addr a_addr">{address || "Location not provided"}</p>
              <p className="addr a_loca">{listing.city || getRecordString(listing.locationDetails, "city")}</p>
            </div>
            <div className="list-rhs-form pglist-bg pglist-p-com">
              <div className="quote-pop">
                <h3>Send enquiry</h3>
                <form>
                  <fieldset disabled={!isCustomerAuthenticated()}>
                    <div className="form-group ic-user"><i className="material-icons">person</i><input className="form-control" placeholder="Enter name*" /></div>
                    <div className="form-group ic-eml"><i className="material-icons">email</i><input className="form-control" placeholder="Enter email*" /></div>
                    <div className="form-group ic-pho"><i className="material-icons">phone</i><input className="form-control" placeholder="Enter mobile number *" /></div>
                    <div className="form-group"><textarea className="form-control" rows={3} placeholder="Enter your query or message"></textarea></div>
                  </fieldset>
                  {isCustomerAuthenticated() ? (
                    <button type="button" className="btn btn-primary">Submit</button>
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

function getRecordString(record: Record<string, string | number | boolean | null> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
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

function toTitleLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
