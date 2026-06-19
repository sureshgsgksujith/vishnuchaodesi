import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { fallbackListingCategoryTree, supportedListingCategoryNames } from "../../dashboard/config/listingCategoryTree";
import { getPublicListings } from "../../dashboard/api/listingsApi";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

export type ExploreMenuLink = {
  label: string;
  href: string;
  icon: string;
};

export type ExploreCategoryLink = {
  label: string;
  href: string;
  count: string;
};

const supportedListingCategoryNameSet = new Set<string>(supportedListingCategoryNames);

export const categoryLinks: ExploreMenuLink[] = [
  { label: "All Services", href: "/all-category", icon: "/template-17/images/icon/shop.png" },
  { label: "Real Estate", href: "/all-listing?category=real-estate", icon: "/template-17/images/icon/real-estate.png" },
  { label: "Restaurants & Food", href: "/all-listing?category=restaurants-food", icon: "/template-17/images/icon/restaurant.png" },
  { label: "Vehicles", href: "/all-listing?category=vehicles", icon: "/template-17/images/icon/vehicles.png" },
  { label: "Furniture & Home", href: "/all-listing?category=furniture-home-decor", icon: "/template-17/images/icon/home.png" },
  { label: "Care Services", href: "/all-listing?category=care-services", icon: "/template-17/images/icon/public-service.png" },
  { label: "Events & Tickets", href: "/all-listing?category=events-tickets", icon: "/template-17/images/icon/calendar.png" },
  { label: "Chao TV", href: "/chao-tv", icon: "/template-17/images/icon/calendar.png" },
  { label: "Roommates & Rentals", href: "/all-listing?category=roommates-rentals", icon: "/template-17/images/icon/home.png" },
  { label: "Jobs", href: "/all-listing?category=jobs", icon: "/template-17/images/icon/employee.png" },
  { label: "Electronics & Appliances", href: "/all-listing?category=electronics-appliances", icon: "/template-17/images/icon/cart.png" },
  { label: "Pets & Animals", href: "/all-listing?category=pets-animals", icon: "/template-17/classifieds/images/pets-1.jpg" },
  { label: "Classified Ads", href: "/classifieds/index", icon: "/template-17/images/icon/ads.png" },
  { label: "Service Experts", href: "/service-experts/index", icon: "/template-17/images/icon/expert.png" },
  { label: "Explore Travel", href: "/places/index", icon: "/template-17/images/places/icons/hot-air-balloon.png" },
  { label: "News & Magazines", href: "/news/index", icon: "/template-17/images/icon/news.png" },
  { label: "Products", href: "/products", icon: "/template-17/images/icon/cart.png" },
  { label: "Coupon & Deals", href: "/coupons", icon: "/template-17/images/icon/coupons.png" },
  { label: "Blogs", href: "/blog-posts", icon: "/template-17/images/icon/blog1.png" },
  { label: "Community", href: "/community", icon: "/template-17/images/icon/11.png" },
];

export function useExploreCategories(): ExploreCategoryLink[] {
  const [searchParams] = useSearchParams();
  const { activeCity, currentLocation, locationRevision, selectedCity } = useHomeSelectedLocation();
  const [categoryTree, setCategoryTree] = useState<ListingCategoryOption[]>(fallbackListingCategoryTree);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [countsLoaded, setCountsLoaded] = useState(false);
  const urlCity = searchParams.get("city")?.trim() || "";
  const countCity = urlCity || activeCity.trim();
  const isWaitingForCurrentCity = !urlCity &&
    !selectedCity &&
    !activeCity &&
    (currentLocation.status === "idle" || currentLocation.status === "loading");

  useEffect(() => {
    let isActive = true;
    setCountsLoaded(false);

    async function loadCategories() {
      if (isWaitingForCurrentCity) {
        return;
      }

      const nextTree = await getListingCategoryTree()
        .then((items) => (items.length ? items : fallbackListingCategoryTree))
        .catch(() => fallbackListingCategoryTree);

      if (!isActive) return;
      const supportedTree = nextTree.filter((category) => supportedListingCategoryNameSet.has(category.name));
      setCategoryTree(supportedTree);

      const counts = await Promise.all(
        supportedTree.map(async (category) => {
          const totalCount = await getPublicListings({
            category: publicCategorySlugFromName(category.name),
            categoryName: publicCategorySlugFromName(category.name) ? undefined : category.name,
            city: countCity || undefined,
            page: 1,
            pageSize: 1,
          })
            .then((result) => result.totalCount || 0)
            .catch(() => 0);

          return [category.name, totalCount] as const;
        }),
      );

      if (isActive) {
        setCategoryCounts(Object.fromEntries(counts));
        setCountsLoaded(true);
      }
    }

    void loadCategories();

    return () => {
      isActive = false;
    };
  }, [countCity, isWaitingForCurrentCity, locationRevision]);

  return useMemo(
    () =>
      categoryTree
        .map((category) => ({
          label: publicCategoryLabel(category.name),
          href: buildCategoryHref(category.name, countCity),
          count: formatCategoryCount(categoryCounts[category.name] || 0),
        })),
    [categoryCounts, categoryTree, countCity, countsLoaded],
  );
}

function buildCategoryHref(categoryName: string, city: string) {
  const params = new URLSearchParams();
  const publicSlug = publicCategorySlugFromName(categoryName);

  if (publicSlug) {
    params.set("category", publicSlug);
  } else {
    params.set("categoryName", categoryName);
  }

  if (city) {
    params.set("city", city);
  }

  return `/all-listing?${params.toString()}`;
}

function publicCategorySlugFromName(categoryName: string) {
  if (categoryName === "Real Estate") return "real-estate";
  if (categoryName === "Restaurants & Food") return "restaurants-food";
  if (categoryName === "Vehicles") return "vehicles";
  if (categoryName === "Furniture & Home" || categoryName === "Furniture & Home Decor") return "furniture-home-decor";
  if (categoryName === "Electronics & Appliances") return "electronics-appliances";
  if (categoryName === "Care Services") return "care-services";
  if (categoryName === "Roommates & Rentals") return "roommates-rentals";
  if (categoryName === "Jobs") return "jobs";
  if (categoryName === "Events & Tickets" || categoryName === "Tickets & Events") return "events-tickets";
  if (categoryName === "Chao TV") return "chao-tv";
  return undefined;
}

function publicCategoryLabel(categoryName: string) {
  return categoryName;
}

function formatCategoryCount(count: number) {
  return String(count).padStart(2, "0");
}
