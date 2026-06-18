import type { ListingSummary } from "../dashboard/api/listingsApi";
import { resolveListingImageUrl } from "../dashboard/utils/listingImages";

export function getChaoTvHref(listing: ListingSummary) {
  const youtubeId = getYouTubeId(listing.videoUrl || "");
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  }

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

export function getChaoTvVideoSource(listing: ListingSummary) {
  const videoUrl = listing.videoUrl?.trim();
  if (!videoUrl) {
    return null;
  }

  const youtubeId = getYouTubeId(videoUrl);
  if (youtubeId) {
    return {
      kind: "youtube" as const,
      src: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0`,
    };
  }

  return {
    kind: "direct" as const,
    src: resolveListingImageUrl(videoUrl),
  };
}

function getYouTubeId(value: string) {
  if (!value.trim()) {
    return "";
  }

  const trimmedValue = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
      return pathParts[0] || "";
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (pathParts[0] === "watch") {
        return url.searchParams.get("v") || "";
      }

      if ((pathParts[0] === "embed" || pathParts[0] === "shorts") && pathParts[1]) {
        return pathParts[1];
      }
    }
  } catch {
    // Fall through to pattern matching for non-URL values.
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
