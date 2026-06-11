import { useEffect, useState } from "react";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";
import { useCurrentCountry } from "../../../shared/hooks/useCurrentCountry";
import { replaceDollarCurrency } from "../../../shared/utils/currency";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";

const whyItems = [
  {
    icon: "groups",
    title: "Active Users",
    description: "Join 200K+ users actively searching for rooms and roommates.",
  },
  {
    icon: "flash_on",
    title: "Quick Matches",
    description: "Find your match fast — most users connect within a week.",
  },
  {
    icon: "description",
    title: "Fresh Listings",
    description: "New rooms and rental listings added regularly.",
  },
  {
    icon: "apps",
    title: "Diverse Choices",
    description: "Choose from shared rooms, apartments, condos and houses.",
  },
  {
    icon: "trending_up",
    title: "High Response Rate",
    description: "Most listings receive responses within 24 hours.",
  },
  {
    icon: "sentiment_satisfied",
    title: "Satisfied Users",
    description: "Thousands of happy users found their perfect match.",
  },
];

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

function formatRoomPrice(listing: ListingSummary, country: string) {
  const explicitPrice = listing.price ? `$${listing.price}` : "";
  const price =
    explicitPrice ||
    getDetailValue(listing, ["priceDetails", "propertyDetails"], [
      "monthlyRent",
      "rent",
      "price",
      "expectedRent",
      "priceRange",
    ]);

  return price ? replaceDollarCurrency(price, country) : "Contact";
}

function getRoomLocation(listing: ListingSummary, fallbackLocation: string) {
  const locality = listing.locality || getDetailValue(listing, ["locationDetails"], ["locality", "neighborhood", "area"]);
  const city = listing.city || getDetailValue(listing, ["locationDetails"], ["city"]);
  const state = getDetailValue(listing, ["locationDetails"], ["state"]);

  return [locality, city, state].filter(Boolean).join(", ") || fallbackLocation;
}

export default function HomeRoommatesSection() {
  const { currentLocation, selectedCity, activeCity, activeLocationLabel, locationRevision } = useHomeSelectedLocation();
  const currentCountry = useCurrentCountry();
  const [roommateListings, setRoommateListings] = useState<ListingSummary[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const hasCurrentLocation = Boolean(activeLocationLabel);
  const locationChipText =
    currentLocation.status === "loading" && !activeLocationLabel
      ? "Detecting current location"
      : activeLocationLabel || "Current location unavailable";
  const listingTitle = hasCurrentLocation
    ? `Explore Rooms for Rent & Roommate Listings in and near ${activeLocationLabel}`
    : "Explore Rooms for Rent & Roommate Listings near your current location";
  const listingLocationText = activeLocationLabel || "Near your current location";
  const roommatesHref = `/all-listing?${new URLSearchParams({
    category: "roommates-rentals",
    ...(activeCity ? { city: activeCity } : {}),
  }).toString()}`;
  const rentalHousesHref = `/all-listing?${new URLSearchParams({
    category: "roommates-rentals",
    subCategory: "Shared Houses",
    ...(activeCity ? { city: activeCity } : {}),
  }).toString()}`;
  const rentersHref = `/all-listing?${new URLSearchParams({
    category: "roommates-rentals",
    subCategory: "Roommates Wanted",
    ...(activeCity ? { city: activeCity } : {}),
  }).toString()}`;

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    setIsLoadingListings(true);
    getPublicListings({
      category: "roommates-rentals",
      city: activeCity || undefined,
      page: 1,
      pageSize: 3,
      forceRefresh: locationRevision > 0,
    })
      .then((result) => {
        if (isActive) {
          setRoommateListings(result.items);
        }
      })
      .catch(() => {
        if (isActive) {
          setRoommateListings([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingListings(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  return (
    <section className="home-roommates">
      <div className="container">
        <div className="roommates-header text-center">
          <h2>Roommates & Rentals</h2>
          <p>
            Whether you're looking for a place to stay or offering a place, we've got you covered!
          </p>
        </div>

        <div className="row roommates-cards">
          <div className="col-md-6">
            <div className="room-card">
              <div className="room-card-header">
                <i className="material-icons">home</i>
                <div>
                  <h4>List my place</h4>
                  <span>(Offering a home)</span>
                </div>
              </div>

              <ul className="room-features">
                <li><i className="material-icons">check</i> List your room, apartment, condo or house</li>
                <li><i className="material-icons">check</i> Connect with potential tenants</li>
                <li><i className="material-icons">check</i> Get notified when users show interest</li>
                <li><i className="material-icons">check</i> Manage listings easily</li>
              </ul>

              <a href="/dashboard/listings/new" className="room-btn">List my place</a>
            </div>
          </div>

          <div className="col-md-6">
            <div className="room-card">
              <div className="room-card-header">
                <i className="material-icons">search</i>
                <div>
                  <h4>Find a place</h4>
                  <span>(Looking for a home)</span>
                </div>
              </div>

              <ul className="room-features">
                <li><i className="material-icons">check</i> Browse available rooms & apartments</li>
                <li><i className="material-icons">check</i> Connect with owners & agents</li>
                <li><i className="material-icons">check</i> Get personalized matches</li>
                <li><i className="material-icons">check</i> Track responses in dashboard</li>
              </ul>

              <a href={roommatesHref} className="room-btn">Find a place</a>
            </div>
          </div>
        </div>

        <div className="why-roommates">
          <div className="text-center why-title">
            <h3>Why Chao Desi Roommates & Rentals?</h3>
          </div>

          <div className="row why-grid">
            {whyItems.map((item) => (
              <div className="col-md-4" key={item.title}>
                <div className="why-card">
                  <i className="material-icons">{item.icon}</i>
                  <div>
                    <h5>{item.title}</h5>
                    <p>{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isLoadingListings ? (
          <div className="home-section-loader">
            <span className="home-location-spinner" aria-hidden="true"></span>
            Loading roommate listings
          </div>
        ) : null}

        {!isLoadingListings && roommateListings.length ? (
          <div className="home-room-listings">
          <div>
            <div className="listing-title text-center">
              <span className="current-location-chip">
                <i className="material-icons">my_location</i>
                {locationChipText}
              </span>
              <h3>{listingTitle}</h3>
            </div>

            <div className="row room-listing-row">
              {roommateListings.map((item) => {
                const availableFrom = getDetailValue(item, ["propertyDetails", "settings"], ["availableFrom", "availableDate", "moveInDate"]) || "Contact";
                const gender = getDetailValue(item, ["propertyDetails", "settings"], ["gender", "preferredGender"]) || "Any";
                const roomType = item.subCategory || getDetailValue(item, ["propertyDetails"], ["roomType", "rentalType"]) || "Room";
                const adType = item.detailCategory || getDetailValue(item, ["propertyDetails"], ["adType"]) || "Rental";
                const extra = getDetailValue(item, ["locationDetails", "propertyDetails"], ["nearby", "landmark", "neighborhood", "area"]) || item.description;
                const image = resolveListingImageUrl(item.primaryImageUrl || item.imageUrls?.[0]);

                return (
                  <div className="col-md-4" key={item.id}>
                  <div className="room-list-card">
                    <div className="room-img">
                      <img src={image} alt={item.title} onError={setFallbackListingImage} />
                    </div>

                    <h4 className="room-title">{item.title}</h4>

                    <ul className="room-details">
                      <li><i className="material-icons">location_on</i> {getRoomLocation(item, listingLocationText)}</li>
                      <li><i className="material-icons">calendar_today</i> Available from: {availableFrom}</li>
                      <li><i className="material-icons">person</i> Gender: {gender}</li>
                      <li><i className="material-icons">meeting_room</i> Room Type: {roomType}</li>
                      <li><i className="material-icons">local_offer</i> Ad Type: {adType}</li>
                      <li><i className="material-icons">school</i> {extra}</li>
                    </ul>

                    <div className="room-bottom">
                      <span className="room-price">{formatRoomPrice(item, currentCountry)} <small>/Month</small></span>
                      <a href={`/listing/${item.id}`} className="room-link">View More</a>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          </div>
        ) : null}

        <div className="home-rental-cta">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <div className="rental-box left-box">
                  <p>Discover offered rental houses available for rent.</p>
                  <a href={rentalHousesHref} className="cta-btn">Find rental houses</a>
                </div>
              </div>
              <div className="col-md-6">
                <div className="rental-box right-box">
                  <p>Search wanted listings for people looking for rental homes.</p>
                  <a href={rentersHref} className="cta-btn">Find renters</a>
                </div>
              </div>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </section>
  );
}
