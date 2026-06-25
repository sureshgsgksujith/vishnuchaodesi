import type { ListingSummary } from "../../dashboard/api/listingsApi";

type ListingWithModule = ListingSummary & {
  listingModule?: string | null;
};

export function shouldShowQuoteAction(listing: ListingSummary) {
  const item = listing as ListingWithModule;
  const categoryName = normalizeListingName(item.categoryName);

  if (!categoryName) {
    return false;
  }

  if (categoryName === "chao tv") {
    return false;
  }

  return true;
}

export function getQuoteActionLabel(listing: ListingSummary) {
  return normalizeListingName(listing.categoryName) === "real estate"
    ? "Get quote"
    : "Enquiry";
}

function normalizeListingName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ") || "";
}
