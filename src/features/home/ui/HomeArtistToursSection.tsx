import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { filterUpcomingDatedEventListings, getEventDateLabel, getEventStartDate } from "../../listing/utils/eventListings";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

const fallbackImage = "/template-17/images/chao-home-artists/2.jpg";

export default function HomeArtistToursSection() {
  const { currentLocation, selectedCity, activeCity, activeLocationLabel, locationRevision } = useHomeSelectedLocation();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingAllCities, setIsShowingAllCities] = useState(false);
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
          const listings = filterUpcomingDatedEventListings(result.result.items || []).sort(
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

  const groups = useMemo(() => chunk(items, 2), [items]);
  const scrollingSlides = groups.length ? [...groups, ...groups] : [];

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
              ) : scrollingSlides.length ? (
                <ul className="artist-sliser-auto">
                  {scrollingSlides.map((group, index) => (
                    <li key={`${index}-${group[0]?.id}`} aria-hidden={index >= groups.length}>
                      <div className="artist-slide-group">
                        {group.map((listing) => {
                          const detailHref = `/event-details?id=${encodeURIComponent(String(listing.id))}`;
                          const image = resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]) || fallbackImage;

                          return (
                          <Link className="service-card" key={listing.id} to={detailHref}>
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
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
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

function chunk(items: ListingSummary[], size: number) {
  const groups: ListingSummary[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
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
