import { useEffect, useState } from "react";
import {
  getRealEstateListings,
  getRestaurantFoodListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";

type FeaturedListingCard = {
  title: string;
  image: string;
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

function mapListingsToCards(listings: ListingSummary[], fallbackItems: FeaturedListingCard[]) {
  if (!listings.length) {
    return fallbackItems;
  }

  return listings.slice(0, 4).map((listing) => ({
    title: listing.title,
    image: resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]),
    rating: listing.rating || 5,
    href: "/all-listing",
  }));
}

function useFeaturedListingGroups() {
  const [realEstateItems, setRealEstateItems] = useState(realEstateFallbackItems);
  const [restaurantItems, setRestaurantItems] = useState(restaurantFallbackItems);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      getRealEstateListings(1, 4),
      getRestaurantFoodListings(1, 4),
    ]).then(([realEstateResult, restaurantResult]) => {
      if (!isActive) {
        return;
      }

      if (realEstateResult.status === "fulfilled") {
        setRealEstateItems(mapListingsToCards(realEstateResult.value.items, realEstateFallbackItems));
      }

      if (restaurantResult.status === "fulfilled") {
        setRestaurantItems(mapListingsToCards(restaurantResult.value.items, restaurantFallbackItems));
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  return [
    {
      titleLead: "Featured Real Estate",
      titleRest: "in your city",
      description: "Explore premium apartments, commercial spaces, villas, and properties near you.",
      iconClass: "plac-hom-tit-ic-ser",
      showDetails: true,
      items: realEstateItems,
    },
    {
      titleLead: "Top Restaurants",
      titleRest: "Near You",
      description: "Discover popular restaurants, cafes, and fine dining experiences in your city.",
      iconClass: "plac-hom-tit-ic-eve",
      wrapperClass: "plac-det-eve",
      showDetails: false,
      items: restaurantItems,
    },
  ] satisfies FeaturedListingGroup[];
}

function useFeaturedListingsSlider(groups: FeaturedListingGroup[]) {
  const sliderSignature = groups
    .map((group) => group.items.map((item) => item.title).join("|"))
    .join("::");

  useEffect(() => {
    let tries = 0;

    const initSlider = () => {
      const $ = window.$ || window.jQuery;

      if ($ && $.fn && $.fn.slick) {
        $(".home-featured-listings-slider").each(function initFeaturedSlider(this: HTMLElement) {
          const slider = $(this);

          if (slider.hasClass("slick-initialized")) {
            slider.slick("unslick");
          }

          slider.slick({
            infinite: true,
            slidesToShow: 3,
            slidesToScroll: 1,
            autoplay: false,
            responsive: [
              {
                breakpoint: 992,
                settings: {
                  slidesToShow: 1,
                  slidesToScroll: 1,
                  centerMode: false,
                },
              },
            ],
          });
        });

        return;
      }

      tries += 1;
      if (tries < 20) {
        setTimeout(initSlider, 300);
      }
    };

    initSlider();
  }, [sliderSignature]);
}

function FeaturedListingGroup({ group }: { group: FeaturedListingGroup }) {
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
                {group.items.map((item) => (
                  <li key={`${group.titleLead}-${item.title}`}>
                    <div className="plac-hom-box">
                      <div className="plac-hom-box-im">
                        <img src={item.image} alt={item.title} loading="lazy" onError={setFallbackListingImage} />
                        <h4>{item.title}</h4>
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
  useFeaturedListingsSlider(groups);

  return (
    <>
      {groups.map((group) => (
        <FeaturedListingGroup group={group} key={group.titleLead} />
      ))}
    </>
  );
}
