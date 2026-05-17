import { useEffect, useState } from "react";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { useCurrentLocationLabel } from "../hooks/useCurrentLocationLabel";

type FeaturedListingCard = {
  title: string;
  image: string;
  location?: string;
  rating?: number;
  href: string;
};

type FeaturedListingGroup = {
  titleLead: string;
  titleRest: string;
  description: string;
  iconClass: string;
  wrapperClass?: string;
  showDetails: boolean;
  items: FeaturedListingCard[];
};

const realEstateFallbackItems: FeaturedListingCard[] = [
  {
    title: "Skyline Luxury Apartments",
    image: "https://img.magnific.com/premium-photo/artist-s-impression-apartment-complex_1104763-48492.jpg?w=1480",
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Green Valley Villas",
    image: "https://img.magnific.com/premium-photo/modern-residential-complex-with-lush-greenery_1249787-22984.jpg?w=1480",
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Urban Heights Residency",
    image: "https://img.magnific.com/premium-photo/stunning-conference-center-building-featured-beautiful-architectural-photography_880278-17361.jpg?w=1480",
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Prime Commercial Spaces",
    image: "https://img.magnific.com/premium-photo/aerial-view-high-tower-crane-residential-apartment-buildings-construction-real-estate-development_127089-14836.jpg?w=1480",
    rating: 5,
    href: "/all-listing",
  },
];

const restaurantFallbackItems: FeaturedListingCard[] = [
  {
    title: "Spice Route Restaurant",
    image: "https://img.magnific.com/premium-photo/cozy-restaurant-with-people-waiter_175935-230.jpg?w=1480",
    href: "/all-listing",
  },
  {
    title: "Royal Biryani House",
    image: "https://img.magnific.com/premium-photo/interior-restaurant_961307-26292.jpg?w=1480",
    href: "/all-listing",
  },
  {
    title: "Urban Tandoori Kitchen",
    image: "https://img.magnific.com/premium-photo/building-space_664434-5479.jpg?w=1480",
    href: "/all-listing",
  },
  {
    title: "Cafe Downtown",
    image: "https://img.magnific.com/premium-photo/restaurant-with-plant-wall-sign-that-says-potted-plants_763111-304778.jpg?w=1480",
    href: "/all-listing",
  },
];

const vehicleFallbackItems: FeaturedListingCard[] = [
  {
    title: "Hyderabad Creta SUV",
    image: resolveListingImageUrl("/uploads/listings/demo-vehicle-01.png"),
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Banjara Hills Sedan",
    image: resolveListingImageUrl("/uploads/listings/demo-vehicle-02.png"),
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Jubilee Hills Cruiser Bike",
    image: resolveListingImageUrl("/uploads/listings/demo-vehicle-05.png"),
    rating: 5,
    href: "/all-listing",
  },
  {
    title: "Medchal Pickup Truck",
    image: resolveListingImageUrl("/uploads/listings/demo-vehicle-07.png"),
    rating: 5,
    href: "/all-listing",
  },
];

type FeaturedListingCategory = "real-estate" | "restaurants-food" | "vehicles";

function getCityFromLocationLabel(label?: string | null) {
  return label?.split(",")[0]?.trim() || "";
}

function buildListingGroupHref(category: FeaturedListingCategory, listing?: ListingSummary, selectedCity?: string) {
  const params = new URLSearchParams({ category });
  const city = listing?.city || selectedCity;

  if (city) {
    params.set("city", city);
  }

  return `/all-listing?${params.toString()}`;
}

function getLocationDetailValue(listing: ListingSummary, key: string) {
  const value = listing.locationDetails?.[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function getListingLocationLabel(listing: ListingSummary, selectedCity?: string) {
  const locality = listing.locality || getLocationDetailValue(listing, "locality");
  const city = listing.city || getLocationDetailValue(listing, "city") || selectedCity;

  return [locality, city].filter(Boolean).join(", ");
}

function mapListingsToCards(
  listings: ListingSummary[],
  fallbackItems: FeaturedListingCard[],
  category: FeaturedListingCategory,
  selectedCity?: string,
) {
  if (!listings.length) {
    return fallbackItems.map((item) => ({
      ...item,
      href: buildListingGroupHref(category, undefined, selectedCity),
    }));
  }

  return listings.slice(0, 10).map((listing) => ({
    title: listing.title,
    image: resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]),
    location: getListingLocationLabel(listing, selectedCity),
    rating: listing.rating || 5,
    href: buildListingGroupHref(category, listing, selectedCity),
  }));
}

function useFeaturedListingGroups() {
  const [realEstateItems, setRealEstateItems] = useState(realEstateFallbackItems);
  const [restaurantItems, setRestaurantItems] = useState(restaurantFallbackItems);
  const [vehicleItems, setVehicleItems] = useState(vehicleFallbackItems);
  const currentLocation = useCurrentLocationLabel();
  const currentCity = getCityFromLocationLabel(currentLocation.label);

  useEffect(() => {
    let isActive = true;

    if (currentLocation.status === "loading" || currentLocation.status === "idle") {
      return () => {
        isActive = false;
      };
    }

    Promise.allSettled([
      getPublicListings({ category: "real-estate", city: currentCity || undefined, page: 1, pageSize: 10 }),
      getPublicListings({ category: "restaurants-food", city: currentCity || undefined, page: 1, pageSize: 10 }),
      getPublicListings({ category: "vehicles", city: currentCity || undefined, page: 1, pageSize: 10 }),
    ]).then(([realEstateResult, restaurantResult, vehicleResult]) => {
      if (!isActive) {
        return;
      }

      if (realEstateResult.status === "fulfilled") {
        setRealEstateItems(
          mapListingsToCards(realEstateResult.value.items, realEstateFallbackItems, "real-estate", currentCity),
        );
      }

      if (restaurantResult.status === "fulfilled") {
        setRestaurantItems(
          mapListingsToCards(restaurantResult.value.items, restaurantFallbackItems, "restaurants-food", currentCity),
        );
      }

      if (vehicleResult.status === "fulfilled") {
        setVehicleItems(
          mapListingsToCards(vehicleResult.value.items, vehicleFallbackItems, "vehicles", currentCity),
        );
      }
    });

    return () => {
      isActive = false;
    };
  }, [currentCity, currentLocation.status]);

  return [
    {
      titleLead: "Featured Real Estate",
      titleRest: currentCity ? `in ${currentCity}` : "in your city",
      description: "Explore premium apartments, commercial spaces, villas, and properties near you.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: realEstateItems,
    },
    {
      titleLead: "Top Restaurants",
      titleRest: currentCity ? `near ${currentCity}` : "Near You",
      description: currentCity
        ? `Discover popular restaurants, cafes, and fine dining experiences near ${currentCity}.`
        : "Discover popular restaurants, cafes, and fine dining experiences near you.",
      iconClass: "plac-hom-tit-ic-eve",
      wrapperClass: "plac-det-eve",
      showDetails: false,
      items: restaurantItems,
    },
    {
      titleLead: "Featured Vehicles",
      titleRest: currentCity ? `in ${currentCity}` : "in your city",
      description: "Browse cars, bikes, rentals, commercial vehicles, and parts from local sellers.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: vehicleItems,
    },
  ] satisfies FeaturedListingGroup[];
}

function FeaturedListingGroup({ group }: { group: FeaturedListingGroup }) {
  const scrollingItems = [...group.items, ...group.items];

  return (
    <section>
      <div className="plac-hom-bd plac-deta-sec plac-deta-sec-com">
        <div className="container">
          <div className="row">
            <div className={`plac-hom-tit ${group.iconClass}`}>
              <h2>
                <span>{group.titleLead} </span>
                {group.titleRest}
              </h2>
              <p>{group.description}</p>
            </div>

            <div className={`plac-hom-all-pla ${group.wrapperClass || ""}`.trim()}>
              <ul className="travel-sliser home-featured-listings-slider">
                {scrollingItems.map((item, index) => (
                  <li key={`${group.titleLead}-${item.title}-${index}`} aria-hidden={index >= group.items.length}>
                    <div className="plac-hom-box">
                      <div className="plac-hom-box-im">
                        <img src={item.image} alt={item.title} loading="lazy" onError={setFallbackListingImage} />
                        <div className="home-featured-card-copy">
                          <h4>{item.title}</h4>
                          {item.location ? <p>{item.location}</p> : null}
                        </div>
                      </div>

                      {group.showDetails ? (
                        <div className="plac-hom-box-txt">
                          <div className="revi-box-1">
                            <b>{(item.rating || 5).toFixed(1)}</b>
                            <span className="re-cnt">Reviews</span>
                          </div>
                          <span>More details</span>
                        </div>
                      ) : null}

                      <a href={item.href} className="fclick" aria-label={item.title}></a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeFeaturedListingsSection() {
  const groups = useFeaturedListingGroups();

  return (
    <>
      {groups.map((group) => (
        <FeaturedListingGroup group={group} key={group.titleLead} />
      ))}
    </>
  );
}
