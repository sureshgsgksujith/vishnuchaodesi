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
  if (value.startsWith("/template-17/") || value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  return resolveListingImageUrl(value);
}
