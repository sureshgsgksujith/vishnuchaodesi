import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { filterActiveEventListings, getEventDateLabel, getEventStartDate } from "../../listing/utils/eventListings";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

const fallbackImage = "/template-17/images/chao-home-artists/2.jpg";

export default function HomeArtistToursSection() {
  const { currentLocation, selectedCity, activeCity, activeLocationLabel, locationRevision } = useHomeSelectedLocation();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingAllCities, setIsShowingAllCities] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLUListElement>(null);
  const eventsHref = `/all-listing?${new URLSearchParams({
    category: "events-tickets",
    ...(activeCity ? { city: activeCity } : {}),
  }).toString()}`;

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    const query = {
      category: "events-tickets",
      city: activeCity || undefined,
      page: 1,
      pageSize: 30,
      forceRefresh: locationRevision > 0,
    } as const;

    getPublicListings(query)
      .then((result) =>
        result.items?.length || !activeCity
          ? { result, showingAllCities: false }
          : getPublicListings({ ...query, city: undefined }).then((fallbackResult) => ({
              result: fallbackResult,
              showingAllCities: true,
            })),
      )
      .then((result) => {
        if (isActive) {
          const listings = filterActiveEventListings(result.result.items || []).sort(
            (first, second) =>
              getListingTime(second) - getListingTime(first) ||
              new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime(),
          );
          const artistEventListings = listings.filter(isArtistEventListing);

          setItems((artistEventListings.length ? artistEventListings : listings).slice(0, 8));
          setIsShowingAllCities(result.showingAllCities);
        }
      })
      .catch(() => {
        if (isActive) {
          setItems([]);
          setIsShowingAllCities(false);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  const moveSlider = (direction: -1 | 1) => {
    const slider = sliderRef.current;
    if (!slider || !items.length) return;

    const nextSlide = (activeSlide + direction + items.length) % items.length;
    slider.children[nextSlide]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveSlide(nextSlide);
  };

  const syncActiveSlide = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const sliderCenter = slider.scrollLeft + slider.clientWidth / 2;
    const slides = Array.from(slider.children) as HTMLElement[];
    const closest = slides.reduce((best, slide, index) => {
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - sliderCenter);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActiveSlide(closest.index);
  };

  return (
    <section className="home-artist">
      <div className="plac-hom-bd plac-deta-sec plac-deta-sec-com">
        <div className="container">
          <div className="row">
            <div className="plac-det-tit-inn text-center home-artist-head">
              <div>
                <p>
                  Events & Tickets
                  {activeLocationLabel && !isShowingAllCities ? ` in ${activeLocationLabel}` : ""}
                </p>
                <h2>
                  <span>Trending Artist Tours 2026</span>
                </h2>
              </div>
              <Link to="/dashboard/listings/start" className="home-artist-post">
                Post event
              </Link>
            </div>

            <div className="plac-hom-all-pla">
              {isLoading ? (
                <div className="home-artist-empty">Loading Events & Tickets...</div>
              ) : items.length ? (
                <div className="home-artist-carousel">
                  <button className="home-artist-nav home-artist-nav-prev" type="button" onClick={() => moveSlider(-1)} aria-label="Previous event">
                    <i className="material-icons" aria-hidden="true">chevron_left</i>
                  </button>
                  <ul ref={sliderRef} className="artist-sliser-auto" onScroll={syncActiveSlide} aria-label="Trending events carousel">
                    {items.map((listing, index) => {
                          const detailHref = `/event-details?id=${encodeURIComponent(String(listing.id))}`;
                          const image = resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]) || fallbackImage;

                          return (
                          <li key={listing.id} aria-label={`${index + 1} of ${items.length}`}>
                          <Link className="service-card" to={detailHref}>
                            <div className="service-left">
                              <img src={image} alt={listing.title} onError={setFallbackListingImage} />
                            </div>
                            <div className="service-content">
                              <h4>{listing.title}</h4>
                              <p>Tour Date: {getEventSchedule(listing)}</p>
                              <small>Tour at: {getEventLocation(listing)}</small>
                            </div>
                            <div className="service-arrow">
                              <i className="material-icons">chevron_right</i>
                            </div>
                          </Link>
                          </li>
                          );
                        })}
                  </ul>
                  <button className="home-artist-nav home-artist-nav-next" type="button" onClick={() => moveSlider(1)} aria-label="Next event">
                    <i className="material-icons" aria-hidden="true">chevron_right</i>
                  </button>
                  <div className="home-artist-dots" aria-hidden="true">
                    {items.map((item, index) => <span key={item.id} className={index === activeSlide ? "is-active" : ""} />)}
                  </div>
                </div>
              ) : (
                <div className="home-artist-empty">
                  <strong>No Events & Tickets listings available yet.</strong>
                  <Link to="/dashboard/listings/start">Post an event</Link>
                  <Link to={eventsHref}>View Events & Tickets</Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

function isArtistEventListing(listing: ListingSummary) {
  const searchableText = [
    listing.title,
    listing.subCategory,
    listing.detailCategory,
    listing.description,
    getDetailValue(listing, ["propertyDetails", "settings"], ["eventType", "lineup", "performer", "artistName", "tags"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["artist", "music", "concert", "tour", "dj", "band", "live", "show", "festival"].some((term) =>
    searchableText.includes(term),
  );
}

function getEventSchedule(listing: ListingSummary) {
  return getEventDateLabel(listing) || "Date available on details";
}

function getEventLocation(listing: ListingSummary) {
  const venue = getDetailValue(listing, ["propertyDetails", "locationDetails"], ["venue", "venueName", "placeName"]);
  const city = listing.city || getDetailValue(listing, ["locationDetails"], ["city"]);
  const state = getDetailValue(listing, ["locationDetails"], ["state"]);
  const location = [venue, city, state].filter(Boolean).join(", ");

  return location || "Location available on details";
}

function getListingTime(listing: ListingSummary) {
  return getEventStartDate(listing)?.getTime() || 0;
}

function getDetailValue(
  listing: ListingSummary,
  sections: Array<keyof Pick<ListingSummary, "propertyDetails" | "locationDetails" | "settings">>,
  keys: string[],
) {
  for (const sectionName of sections) {
    const section = listing[sectionName];
    if (!section) {
      continue;
    }

    for (const key of keys) {
      const value = section[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }

  return "";
}
