import { apiClient } from "../../../shared/api/client";
import { resolveListingImageUrl } from "../../dashboard/utils/listingImages";

export type PageBanner = {
  id: number;
  pageKey: string;
  slot: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  altText?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export async function getPageBanners(pageKey: string) {
  const response = await apiClient.get<PageBanner[]>(`/PageBanners/${pageKey}`);
  return response.data.map((banner) => ({
    ...banner,
    imageUrl: resolveBannerImageUrl(banner.imageUrl),
  }));
}

function resolveBannerImageUrl(value: string) {
  const imageUrl = value.trim();

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    try {
      const parsedUrl = new URL(imageUrl);
      const isLocalUpload =
        (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") &&
        parsedUrl.pathname.startsWith("/uploads/");

      if (isLocalUpload) {
        return resolveListingImageUrl(parsedUrl.pathname);
      }
    } catch {
      return imageUrl;
    }

    return imageUrl;
  }

  if (imageUrl.startsWith("/template-17/") || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  return resolveListingImageUrl(imageUrl);
}
