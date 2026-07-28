import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import { getPublicListings, type ListingSummary } from "../../dashboard/api/listingsApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../../dashboard/utils/listingImages";
import {
  getPublicAllServicePostings,
  type PublicAllServicePosting,
} from "../../allServices/api/allServicePostingsApi";
import "./globalSearch.css";

export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCity, currentLocation, selectedCity } = useHomeSelectedLocation();
  const search = searchParams.get("search")?.trim() || "";
  const city = searchParams.get("city")?.trim() || activeCity;
  const [draft, setDraft] = useState(search);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [services, setServices] = useState<PublicAllServicePosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => setDraft(search), [search]);

  useEffect(() => {
    if (!selectedCity && (currentLocation.status === "idle" || currentLocation.status === "loading")) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage("");

    Promise.allSettled([
      getPublicListings({ search: search || undefined, city: city || undefined, page: 1, pageSize: 24 }),
      getPublicAllServicePostings({ search: search || undefined, city: city || undefined, page: 1, pageSize: 24 }),
    ]).then(([listingResult, serviceResult]) => {
      if (!isActive) return;
      setListings(listingResult.status === "fulfilled" ? listingResult.value.items || [] : []);
      setServices(serviceResult.status === "fulfilled" ? serviceResult.value.items || [] : []);
      if (listingResult.status === "rejected" && serviceResult.status === "rejected") {
        setErrorMessage("Unable to load search results right now.");
      }
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [city, currentLocation.status, search, selectedCity]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draft.trim()) params.set("search", draft.trim());
    if (city) params.set("city", city);
    setSearchParams(params);
  }

  return (
    <>
      <CustomerHeader />
      <main className="global-search-page">
        <section className="global-search-hero">
          <div className="global-search-container">
            <h1>Search Chao Desi</h1>
            <p>{city ? `Yellow Pages, classifieds, and local services near ${city}.` : "Yellow Pages, classifieds, and local services in one place."}</p>
            <form onSubmit={submit}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What are you looking for?" autoFocus />
              <button type="submit">Search</button>
            </form>
          </div>
        </section>

        <div className="global-search-container global-search-results">
          {isLoading ? <p className="global-search-status">Searching...</p> : null}
          {errorMessage ? <p className="global-search-status global-search-error">{errorMessage}</p> : null}
          {!isLoading && !errorMessage && listings.length + services.length === 0 ? (
            <p className="global-search-status">No results found{city ? ` in ${city}` : ""}.</p>
          ) : null}

          {listings.length ? (
            <section>
              <header><h2>Yellow Pages &amp; Classifieds</h2><Link to={`/all-listing?${new URLSearchParams({ ...(search ? { search } : {}), ...(city ? { city } : {}) })}`}>View all</Link></header>
              <div className="global-search-grid">
                {listings.map((listing) => (
                  <Link className="global-search-card" to={`/listing-details?id=${listing.id}`} key={`listing-${listing.id}`}>
                    <img src={resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0])} alt="" onError={setFallbackListingImage} />
                    <div><small>{listing.categoryName || listing.subCategory || "Listing"}</small><h3>{listing.title}</h3><p>{listing.city || city || "Location available on request"}</p></div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {services.length ? (
            <section>
              <header><h2>Local Services</h2><Link to="/all-services">Browse services</Link></header>
              <div className="global-search-grid">
                {services.map((service) => (
                  <Link className="global-search-card" to={`/local-service-details/${service.id}`} key={`service-${service.id}`}>
                    <img src={service.businessImageUrl || "/template-17/images/services/1.jpg"} alt="" onError={setFallbackListingImage} />
                    <div><small>{service.allServiceCategoryName}</small><h3>{service.businessName}</h3><p>{service.primaryServiceLocation}</p></div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <HomeFooterSection />
    </>
  );
}
