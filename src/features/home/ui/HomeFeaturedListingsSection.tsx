import { useEffect, useState } from "react";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

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

type FeaturedListingCategory =
  "real-estate" |
  "restaurants-food" |
  "vehicles" |
  "furniture-home-decor" |
  "electronics-appliances" |
  "care-services";

function buildListingGroupHref(
  category: FeaturedListingCategory,
  listing?: ListingSummary,
  selectedCity?: string,
  subCategory?: string,
) {
  const params = new URLSearchParams({ category });
  const city = listing?.city || selectedCity;

  if (subCategory) {
    params.set("subCategory", subCategory);
  }

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
  category: FeaturedListingCategory,
  selectedCity?: string,
  subCategory?: string,
) {
  return [...listings]
    .sort(
      (first, second) =>
        new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
    )
    .slice(0, 10)
    .map((listing) => ({
    title: listing.title,
    image: resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]),
    location: getListingLocationLabel(listing, selectedCity),
    rating: listing.rating || 5,
    href: buildListingGroupHref(category, listing, selectedCity, subCategory),
  }));
}

function useFeaturedListingGroups() {
  const [realEstateItems, setRealEstateItems] = useState<FeaturedListingCard[]>([]);
  const [restaurantItems, setRestaurantItems] = useState<FeaturedListingCard[]>([]);
  const [vehicleItems, setVehicleItems] = useState<FeaturedListingCard[]>([]);
  const [furnitureItems, setFurnitureItems] = useState<FeaturedListingCard[]>([]);
  const [electronicsItems, setElectronicsItems] = useState<FeaturedListingCard[]>([]);
  const { currentLocation, selectedCity, activeCity, locationRevision } = useHomeSelectedLocation();

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    const cityFilter = activeCity || undefined;
    const forceRefresh = locationRevision > 0;

    setRealEstateItems([]);
    setRestaurantItems([]);
    setVehicleItems([]);
    setFurnitureItems([]);
    setElectronicsItems([]);

    Promise.allSettled([
      getPublicListings({ category: "real-estate", city: cityFilter, page: 1, pageSize: 10, forceRefresh }),
      getPublicListings({ category: "restaurants-food", city: cityFilter, page: 1, pageSize: 10, forceRefresh }),
      getPublicListings({ category: "vehicles", city: cityFilter, page: 1, pageSize: 10, forceRefresh }),
      getPublicListings({ category: "furniture-home-decor", city: cityFilter, page: 1, pageSize: 10, forceRefresh }),
      getPublicListings({ category: "electronics-appliances", city: cityFilter, page: 1, pageSize: 10, forceRefresh }),
    ]).then(([realEstateResult, restaurantResult, vehicleResult, furnitureResult, electronicsResult]) => {
      if (!isActive) {
        return;
      }

      if (realEstateResult.status === "fulfilled") {
        setRealEstateItems(
          mapListingsToCards(realEstateResult.value.items, "real-estate", activeCity),
        );
      }

      if (restaurantResult.status === "fulfilled") {
        setRestaurantItems(
          mapListingsToCards(restaurantResult.value.items, "restaurants-food", activeCity),
        );
      }

      if (vehicleResult.status === "fulfilled") {
        setVehicleItems(
          mapListingsToCards(vehicleResult.value.items, "vehicles", activeCity),
        );
      }

      if (furnitureResult.status === "fulfilled") {
        setFurnitureItems(
          mapListingsToCards(furnitureResult.value.items, "furniture-home-decor", activeCity),
        );
      }

      if (electronicsResult.status === "fulfilled") {
        setElectronicsItems(
          mapListingsToCards(electronicsResult.value.items, "electronics-appliances", activeCity),
        );
      }
    });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  return [
    {
      titleLead: "Featured Real Estate",
      titleRest: activeCity ? `in ${activeCity}` : "in your city",
      description: "Explore premium apartments, commercial spaces, villas, and properties near you.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: realEstateItems,
    },
    {
      titleLead: "Top Restaurants",
      titleRest: activeCity ? `near ${activeCity}` : "Near You",
      description: activeCity
        ? `Discover popular restaurants, cafes, and fine dining experiences near ${activeCity}.`
        : "Discover popular restaurants, cafes, and fine dining experiences near you.",
      iconClass: "plac-hom-tit-ic-eve",
      wrapperClass: "plac-det-eve",
      showDetails: false,
      items: restaurantItems,
    },
    {
      titleLead: "Featured Automobiles",
      titleRest: activeCity ? `in ${activeCity}` : "in your city",
      description: "Browse cars, bikes, rentals, commercial vehicles, and parts from local sellers.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: vehicleItems,
    },
    {
      titleLead: "Furniture & Home",
      titleRest: activeCity ? `in ${activeCity}` : "near you",
      description: "Browse sofas, bedroom sets, dining furniture, lighting, decor, bedding, and home essentials.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: furnitureItems,
    },
    {
      titleLead: "Electronics & Appliances",
      titleRest: activeCity ? `in ${activeCity}` : "near you",
      description: "Browse mobiles, laptops, TVs, appliances, accessories, and gadgets from local sellers.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: electronicsItems,
    },
  ] satisfies FeaturedListingGroup[];
}

function useCareFeaturedListingGroup() {
  const [careServiceItems, setCareServiceItems] = useState<FeaturedListingCard[]>([]);
  const { currentLocation, selectedCity, activeCity, locationRevision } = useHomeSelectedLocation();

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    const cityFilter = activeCity || undefined;

    setCareServiceItems([]);

    getPublicListings({
      category: "care-services",
      city: cityFilter,
      page: 1,
      pageSize: 10,
      forceRefresh: locationRevision > 0,
    })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setCareServiceItems(
          mapListingsToCards(result.items, "care-services", activeCity),
        );
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setCareServiceItems([]);
      });

    return () => {
      isActive = false;
    };
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  return {
    titleLead: "Care Services",
    titleRest: activeCity ? `near ${activeCity}` : "near you",
    description: "Browse child care, elder care, nursing, home health, special needs, and pet care providers.",
    iconClass: "plac-hom-tit-ic-ser",
    showDetails: true,
    items: careServiceItems,
  } satisfies FeaturedListingGroup;
}

function FeaturedListingGroup({ group }: { group: FeaturedListingGroup }) {
  if (!group.items.length) {
    return null;
  }

  const shouldScroll = group.items.length > 4;
  const displayItems = shouldScroll ? [...group.items, ...group.items] : group.items;

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
              <ul className={`travel-sliser home-featured-listings-slider ${shouldScroll ? "is-scrolling" : "is-static"}`}>
                {displayItems.map((item, index) => (
                  <li key={`${group.titleLead}-${item.title}-${index}`} aria-hidden={shouldScroll && index >= group.items.length}>
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

export function HomeCareFeaturedListingsSection() {
  const group = useCareFeaturedListingGroup();

  return <FeaturedListingGroup group={group} />;
}
