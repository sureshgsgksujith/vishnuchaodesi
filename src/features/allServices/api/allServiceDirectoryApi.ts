import { apiClient } from "../../../shared/api/client";

export type AllServiceDetailedCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type AllServiceSubCategoryOption = {
  id: number;
  name: string;
  slug: string;
  detailedCategories: AllServiceDetailedCategoryOption[];
};

export type AllServiceCategoryOption = {
  id: number;
  name: string;
  slug: string;
  code?: string | null;
  subCategories: AllServiceSubCategoryOption[];
};

export async function getAllServiceDirectoryTree() {
  const response = await apiClient.get<AllServiceCategoryOption[]>("/AllServiceDirectory/tree", {
    timeout: 8000,
  });

  return response.data;
}
