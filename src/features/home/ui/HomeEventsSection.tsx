import { useEffect, useState } from "react";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { useCurrentCountry } from "../../../shared/hooks/useCurrentCountry";
import { replaceDollarCurrency } from "../../../shared/utils/currency";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

function getDetailValue(
  listing: ListingSummary,
  sections: Array<keyof Pick<ListingSummary, "propertyDetails" | "priceDetails" | "locationDetails" | "settings">>,
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

function getEventLocation(listing: ListingSummary) {
  const venue = getDetailValue(listing, ["propertyDetails", "locationDetails"], ["venue", "venueName", "placeName"]);
  const locality = listing.locality || getDetailValue(listing, ["locationDetails"], ["locality", "area"]);
  const city = listing.city || getDetailValue(listing, ["locationDetails"], ["city"]);
  const state = getDetailValue(listing, ["locationDetails"], ["state"]);

  return {
    venue: venue || "Venue details",
    location: [locality, city, state].filter(Boolean).join(", "),
  };
}

function getEventSchedule(listing: ListingSummary) {
  return getDetailValue(listing, ["propertyDetails", "settings"], [
    "eventDateTime",
    "eventDate",
    "startDate",
    "date",
    "schedule",
  ]) || "Schedule available on details";
}

function getEventPrice(listing: ListingSummary, country: string) {
  const explicitPrice = listing.price ? `$${listing.price}` : "";
  const price =
    explicitPrice ||
    getDetailValue(listing, ["priceDetails", "propertyDetails"], [
      "ticketPrice",
      "price",
      "priceRange",
      "entryFee",
      "cost",
    ]);

  return price ? replaceDollarCurrency(price, country) : "Contact";
}

export default function HomeEventsSection() {
  const currentCountry = useCurrentCountry();
  const { currentLocation, selectedCity, activeCity, activeLocationLabel, locationRevision } = useHomeSelectedLocation();
  const [events, setEvents] = useState<ListingSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
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

    setIsLoadingEvents(true);
    getPublicListings({
      category: "events-tickets",
      city: activeCity || undefined,
      page: 1,
      pageSize: 6,
      forceRefresh: locationRevision > 0,
    })
      .then((result) => {
        if (isActive) {
          setEvents(result.items);
        }
      })
      .catch(() => {
        if (isActive) {
          setEvents([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingEvents(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  if (!isLoadingEvents && !events.length) {
    return null;
  }

  return (
    <section className="home-events">
      <div className="container">
        <div className="events-header text-center mb-20">
          <h2>Events & Tickets</h2>
          <p className="subtitle">Explore the hottest gigs, shows & more</p>

          <div className="browse-title">
            Browsing events in & near
            <a className="location-pill" href={eventsHref}>
              {activeLocationLabel || "your city"} <i className="material-icons">expand_more</i>
            </a>
          </div>
        </div>

        {isLoadingEvents ? (
          <div className="home-section-loader">
            <span className="home-location-spinner" aria-hidden="true"></span>
            Loading events
          </div>
        ) : (
          <>
            <div className="row">
              {events.map((event) => {
                const image = resolveListingImageUrl(event.primaryImageUrl || event.imageUrls?.[0]);
                const eventLocation = getEventLocation(event);
                const meta =
                  event.subCategory ||
                  getDetailValue(event, ["propertyDetails"], ["lineup", "eventType", "tags"]) ||
                  "Event";

                return (
                  <div className="col-lg-4 col-md-6 mb-4" key={event.id}>
                    <div className="event-card">
                      {event.userPlanName ? <span className="promoted">Promoted</span> : null}

                      <div className="card-main-content">
                        <div className="event-left">
                          <img src={image} alt={event.title} onError={setFallbackListingImage} />
                        </div>

                        <div className="event-right">
                          <h4>{event.title}</h4>
                          <div className="meta">
                            <span>
                              <i className="material-icons">{meta.toLowerCase().includes("lineup") ? "mic" : "local_offer"}</i>
                              {meta}
                            </span>
                            <span>
                              <i className="material-icons">meeting_room</i>
                              {eventLocation.venue}
                            </span>
                            {eventLocation.location ? (
                              <span>
                                <i className="material-icons">location_on</i>
                                {eventLocation.location}
                              </span>
                            ) : null}
                            <span>
                              <i className="material-icons">schedule</i>
                              {getEventSchedule(event)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bottom">
                        <span className="available">
                          <i className="material-icons">check_circle</i>
                          Available
                        </span>
                        <span className="price">{getEventPrice(event, currentCountry)}</span>
                        <a href={`/listing/${event.id}`} className="btn-ticket">
                          Buy Tickets
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="row">
              <div className="col-12 text-center mt-4">
                <a href={eventsHref} className="btn-view-more">
                  View more events <i className="material-icons">arrow_forward</i>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
