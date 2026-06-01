import { useEffect, useMemo, useState } from "react";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { fallbackListingCategoryTree } from "../../dashboard/config/listingCategoryTree";
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

const furnitureCategoryName = "Furniture & Home";

export const categoryLinks: ExploreMenuLink[] = [
  { label: "All Services", href: "/all-category", icon: "/template-17/images/icon/shop.png" },
  { label: "Furniture & Home", href: "/all-listing?category=furniture-home-decor", icon: "/template-17/images/icon/home.png" },
  { label: "Roommates & Rentals", href: "/all-listing?category=real-estate&subCategory=PG+%2F+Co-living", icon: "/template-17/images/icon/home.png" },
  { label: "Care Services", href: "/all-listing?category=care-services", icon: "/template-17/images/icon/expert.png" },
  { label: "Classified Ads", href: "/classifieds/index", icon: "/template-17/images/icon/ads.png" },
  { label: "Service Experts", href: "/service-experts/index", icon: "/template-17/images/icon/expert.png" },
  { label: "Jobs", href: "/jobs/index", icon: "/template-17/images/icon/employee.png" },
  { label: "Explore Travel", href: "/places/index", icon: "/template-17/images/places/icons/hot-air-balloon.png" },
  { label: "News & Magazines", href: "/news/index", icon: "/template-17/images/icon/news.png" },
  { label: "Events", href: "/events", icon: "/template-17/images/icon/calendar.png" },
  { label: "Products", href: "/products", icon: "/template-17/images/icon/cart.png" },
  { label: "Coupon & Deals", href: "/coupons", icon: "/template-17/images/icon/coupons.png" },
  { label: "Blogs", href: "/blog-posts", icon: "/template-17/images/icon/blog1.png" },
  { label: "Community", href: "/community", icon: "/template-17/images/icon/11.png" },
];

export function useExploreCategories(): ExploreCategoryLink[] {
  const [categoryTree, setCategoryTree] = useState<ListingCategoryOption[]>(fallbackListingCategoryTree);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      const nextTree = await getListingCategoryTree()
        .then((items) => (items.length ? items : fallbackListingCategoryTree))
        .catch(() => fallbackListingCategoryTree);

      if (!isActive) return;
      setCategoryTree(nextTree);

      const counts = await Promise.all(
        nextTree.map(async (category) => {
          const totalCount = await getPublicListings({
            categoryName: category.name,
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
      }
    }

    void loadCategories();

    return () => {
      isActive = false;
    };
  }, []);

  return useMemo(
    () =>
      categoryTree.map((category) => ({
        label: category.name,
        href: buildCategoryHref(category.name),
        count: formatCategoryCount(categoryCounts[category.name] || 0),
      })),
    [categoryCounts, categoryTree],
  );
}

function buildCategoryHref(categoryName: string) {
  if (categoryName === furnitureCategoryName || categoryName === "Furniture & Home Decor") {
    return "/all-listing?category=furniture-home-decor";
  }

  return `/all-listing?categoryName=${encodeURIComponent(categoryName)}`;
}

function formatCategoryCount(count: number) {
  return String(count).padStart(2, "0");
}
