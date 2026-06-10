import { useEffect, useMemo, useState } from "react";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { fallbackListingCategoryTree, supportedListingCategoryNames } from "../../dashboard/config/listingCategoryTree";
import { getPublicListings } from "../../dashboard/api/listingsApi";

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
  { label: "Care Services", href: "/all-listing?category=care-services", icon: "/template-17/images/icon/public-service.png" },
  { label: "Events & Tickets", href: "/all-listing?category=events-tickets", icon: "/template-17/images/icon/calendar.png" },
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
  const [categoryTree, setCategoryTree] = useState<ListingCategoryOption[]>(fallbackListingCategoryTree);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [countsLoaded, setCountsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;
    setCountsLoaded(false);

    async function loadCategories() {
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
  }, []);

  return useMemo(
    () =>
      categoryTree
        .map((category) => ({
          label: category.name,
          href: buildCategoryHref(category.name),
          count: formatCategoryCount(categoryCounts[category.name] || 0),
        })),
    [categoryCounts, categoryTree, countsLoaded],
  );
}

function buildCategoryHref(categoryName: string) {
  if (categoryName === "Roommates & Rentals") {
    return "/all-listing?category=roommates-rentals";
  }

  if (categoryName === "Jobs") {
    return "/all-listing?category=jobs";
  }

  if (categoryName === "Events & Tickets" || categoryName === "Tickets & Events") {
    return "/all-listing?category=events-tickets";
  }

  return `/all-listing?categoryName=${encodeURIComponent(categoryName)}`;
}

function publicCategorySlugFromName(categoryName: string) {
  if (categoryName === "Real Estate") return "real-estate";
  if (categoryName === "Restaurants & Food") return "restaurants-food";
  if (categoryName === "Vehicles") return "vehicles";
  if (categoryName === "Electronics & Appliances") return "electronics-appliances";
  if (categoryName === "Care Services") return "care-services";
  if (categoryName === "Roommates & Rentals") return "roommates-rentals";
  if (categoryName === "Jobs") return "jobs";
  if (categoryName === "Events & Tickets" || categoryName === "Tickets & Events") return "events-tickets";
  return undefined;
}

function formatCategoryCount(count: number) {
  return String(count).padStart(2, "0");
}
