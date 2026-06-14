import type { ListingSummary } from "../../dashboard/api/listingsApi";

type ListingWithModule = ListingSummary & {
  listingModule?: string | null;
};

export function shouldShowQuoteAction(listing: ListingSummary) {
  const item = listing as ListingWithModule;
  const categoryName = normalizeListingName(item.categoryName);
  const listingKind = normalizeListingName(String(item.propertyDetails?.listingKind || ""));
  const listingModule = normalizeListingName(item.listingModule || "");

  return categoryName === "real estate" ||
    categoryName.includes("yellow pages") ||
    listingKind.includes("yellow pages") ||
    listingModule.includes("yellow pages");
}

function normalizeListingName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ") || "";
}
