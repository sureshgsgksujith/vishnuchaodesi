import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import { resolveListingImageUrl } from "../../dashboard/utils/listingImages";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

const carsBrowsePath = "/all-listing?category=vehicles&subCategory=Cars";
const carPostPath = "/dashboard/classifieds/step-1?categoryName=Vehicles&subCategory=Cars";
const travelQuotePath = "/all-services-detailed?category=Travel%20%26%20Accommodation&subCategory=Travel%20Services&service=Travel%20Agents&detail=travel-agents";

export default function HomeTravelCarsSection() {
  const { activeCity, currentLocation, locationRevision, selectedCity } = useHomeSelectedLocation();
  const [cars, setCars] = useState<ListingSummary[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setLoadMessage("");

    (async () => {
      const baseQuery = {
        category: "vehicles" as const,
        subCategory: "Cars",
        page: 1,
        pageSize: 10,
        forceRefresh: locationRevision > 0,
      };
      let result = await getPublicListings({
        ...baseQuery,
        city: activeCity || undefined,
      });
      let message = "";

      if (!result.items.length && activeCity) {
        result = await getPublicListings(baseQuery);
        if (result.items.length) {
          message = `No car ads are posted in ${activeCity} yet. Showing the latest cars from other areas.`;
        }
      }

      return {
        items: [...result.items]
          .sort((first, second) => new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime())
          .slice(0, 8),
        message,
      };
    })()
      .then(({ items, message }) => {
        if (!isActive) return;
        setCars(items);
        setActiveIndex(0);
        setLoadMessage(message);
      })
      .catch(() => {
        if (!isActive) return;
        setCars([]);
        setLoadMessage("Unable to load the latest car ads right now.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  useEffect(() => {
    if (cars.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cars.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [cars.length]);

  const activeCar = cars[activeIndex];
  const carBackgroundStyle = useMemo<CSSProperties | undefined>(() => {
    if (!activeCar) return undefined;

    const imageUrl = resolveListingImageUrl(activeCar.primaryImageUrl || activeCar.imageUrls?.[0]);
    return {
      backgroundImage: `linear-gradient(90deg, rgba(3, 12, 24, .94), rgba(3, 12, 24, .73)), url("${imageUrl}")`,
    };
  }, [activeCar]);

  const showPreviousCar = () => {
    setActiveIndex((current) => (current - 1 + cars.length) % cars.length);
  };

  const showNextCar = () => {
    setActiveIndex((current) => (current + 1) % cars.length);
  };

  return (
    <section className="chao-travel-car" aria-label="Travel quotes and latest car ads">
      <div className="container">
        <div className="travel-cars-layout">
          <article className="travel-card">
            <div className="travel-card-content">
              <h3>Travel quotes</h3>
              <p className="travel-card-intro">Get the best flight deals &amp; travel agents in US/Canada</p>

              <div className="travel-block">
                <h4>Make your choice now!</h4>
                <ul>
                  <li>Pick your airlines to India</li>
                  <li>Find the Best Airfare Deal</li>
                </ul>
              </div>

              <div className="travel-block">
                <h4>Your travel made simple!</h4>
                <ul>
                  <li>Find the best travel agent in your city</li>
                  <li>Find your travel companion</li>
                </ul>
              </div>
            </div>

            <Link to={travelQuotePath} className="travel-primary-action">
              Get Quote
            </Link>
          </article>

          <article className="travelcar-card" style={carBackgroundStyle}>
            <div className="travelcar-card-content">
              <h3>Cars</h3>
              <p className="travelcar-intro">The Best Place to Find Used Cars!</p>

              <h4 className="travelcar-label">Trending Tags</h4>
              <div className="car-tags" aria-label="Popular car searches">
                <Link to={carsBrowsePath}>Search Used Cars</Link>
                <Link to={carPostPath}>Sell your car</Link>
                <Link to={`${carsBrowsePath}&search=Toyota`}>Toyota</Link>
                <Link to={`${carsBrowsePath}&search=Honda`}>Honda</Link>
              </div>

              <h4 className="travelcar-label latest-label">Latest Ads</h4>
              {loadMessage ? <p className="home-car-scope-note">{loadMessage}</p> : null}

              <div className={`home-car-carousel ${isLoading ? "is-loading" : ""}`} aria-live="polite">
                {cars.length > 1 ? (
                  <button type="button" className="home-car-arrow previous" onClick={showPreviousCar} aria-label="Previous car ad">
                    <span aria-hidden="true">‹</span>
                  </button>
                ) : null}

                {isLoading ? (
                  <div className="home-car-ad home-car-ad-skeleton">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : activeCar ? (
                  <div className="home-car-ad">
                    <div className="home-car-ad-copy">
                      <h5>{activeCar.title}</h5>
                      <p>
                        <i className="material-icons" aria-hidden="true">location_on</i>
                        {getCarLocation(activeCar)}
                      </p>
                      <strong>{getCarPrice(activeCar)}</strong>
                    </div>
                    <Link to={`/listing/${activeCar.id}`} className="home-car-contact">
                      Contact
                    </Link>
                  </div>
                ) : (
                  <div className="home-car-ad home-car-empty">
                    <div>
                      <h5>No car ads available</h5>
                      <p>Be the first seller to post a car in your area.</p>
                    </div>
                  </div>
                )}

                {cars.length > 1 ? (
                  <button type="button" className="home-car-arrow next" onClick={showNextCar} aria-label="Next car ad">
                    <span aria-hidden="true">›</span>
                  </button>
                ) : null}
              </div>

              {cars.length > 1 ? (
                <div className="home-car-dots" aria-label={`Car ad ${activeIndex + 1} of ${cars.length}`}>
                  {cars.map((car, index) => (
                    <button
                      type="button"
                      className={index === activeIndex ? "active" : ""}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show ${car.title}`}
                      aria-current={index === activeIndex ? "true" : undefined}
                      key={car.id}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="home-car-posting-actions">
              <span>Do you want to sell your car?</span>
              <Link to={carPostPath} className="home-car-post-primary">Post an ad</Link>
              <Link to="/dashboard/services/new" className="home-car-post-secondary">Post a service</Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function getCarLocation(listing: ListingSummary) {
  const locality = listing.locality || getRecordString(listing.locationDetails, "locality");
  const city = listing.city || getRecordString(listing.locationDetails, "city");
  const state = getRecordString(listing.locationDetails, "state");
  const parts = [locality, city, state].filter(Boolean);

  return Array.from(new Set(parts)).join(", ") || "Location available on request";
}

function getCarPrice(listing: ListingSummary) {
  const price = listing.price ?? getRecordNumber(listing.priceDetails, "price");
  return price && price > 0 ? formatCurrencyAmount(price) : "Contact for price";
}

function getRecordString(record: Record<string, string | number | null> | undefined, key: string) {
  const value = record?.[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function getRecordNumber(record: Record<string, string | number | boolean | null> | undefined, key: string) {
  const value = Number(record?.[key]);
  return Number.isFinite(value) ? value : 0;
}
