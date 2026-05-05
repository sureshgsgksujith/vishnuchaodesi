import type React from "react";
import { env } from "../../../app/config/env";

const fallbackListingImageUrl = "/template-17/images/listings/1.jpeg";

function getApiOrigin() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return "";
  }
}

export function resolveListingImageUrl(value?: string | null) {
  const imageUrl = value?.trim();

  if (!imageUrl) {
    return fallbackListingImageUrl;
  }

  if (imageUrl.startsWith("/uploads/")) {
    const apiOrigin = getApiOrigin();
    return apiOrigin ? `${apiOrigin}${imageUrl}` : imageUrl;
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
