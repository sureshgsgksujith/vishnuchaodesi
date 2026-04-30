import type React from "react";

const fallbackListingImageUrl = "/template-17/images/listings/1.jpeg";

export function resolveListingImageUrl(value?: string | null) {
  const imageUrl = value?.trim();

  if (!imageUrl) {
    return fallbackListingImageUrl;
  }

  if (
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }

  return `/template-17/images/listings/${imageUrl}`;
}

export function setFallbackListingImage(event: React.SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(fallbackListingImageUrl)) {
    return;
  }

  event.currentTarget.src = fallbackListingImageUrl;
}
