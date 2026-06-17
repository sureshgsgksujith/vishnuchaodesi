import type { ListingSummary } from "../dashboard/api/listingsApi";
import { resolveListingImageUrl } from "../dashboard/utils/listingImages";

export function getChaoTvHref(listing: ListingSummary) {
  return listing.videoUrl ? resolveListingImageUrl(listing.videoUrl) : `/listing-details?id=${listing.id}`;
}

export function getChaoTvThumbnail(listing: ListingSummary) {
  const imageUrl = listing.primaryImageUrl || listing.imageUrls?.[0];
  if (imageUrl) {
    return resolveListingImageUrl(imageUrl);
  }

  const youtubeId = getYouTubeId(listing.videoUrl || "");
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return "/template-17/images/events/4.jpg";
}

export function isExternalVideoUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function getYouTubeId(value: string) {
  if (!value.trim()) {
    return "";
  }

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/i,
    /youtube\.com\/embed\/([^?]+)/i,
    /youtu\.be\/([^?]+)/i,
    /youtube\.com\/shorts\/([^?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}
