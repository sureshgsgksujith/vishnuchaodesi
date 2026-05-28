import { apiClient } from "../../../shared/api/client";

export type ListingDetailedCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type ListingSubCategoryOption = {
  id: number;
  name: string;
  slug: string;
  detailedCategories: ListingDetailedCategoryOption[];
};

export type ListingCategoryOption = {
  id: number;
  name: string;
  slug: string;
  subCategories: ListingSubCategoryOption[];
};

export type ListingCategoryFieldDefinition = {
  id: number;
  listingCategoryId?: number | null;
  listingSubCategoryId?: number | null;
  listingDetailedCategoryId?: number | null;
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "dropdown" | "checkbox" | "textarea";
  placeholder?: string | null;
  options: string[];
  sectionName: string;
  sectionOrder: number;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
};

export async function getListingCategoryTree() {
  const response = await apiClient.get<ListingCategoryOption[]>("/ListingCategories/tree", {
    timeout: 8000,
  });

  return response.data;
}

export async function getListingCategoryFields(
  categoryId?: number,
  subCategoryId?: number,
  detailedCategoryId?: number,
  fieldContext?: "YellowPages" | "Classifieds",
) {
  const response = await apiClient.get<ListingCategoryFieldDefinition[]>("/ListingCategoryFields", {
    params: {
      categoryId,
      subCategoryId,
      detailedCategoryId,
      fieldContext,
    },
    timeout: 8000,
  });

  return response.data;
}

export function getClassifiedSpecificationFields(
  categoryId?: number,
  subCategoryId?: number,
  detailedCategoryId?: number,
) {
  return getListingCategoryFields(categoryId, subCategoryId, detailedCategoryId, "Classifieds")
    .then((fields) => fields.length ? fields : getListingCategoryFields(categoryId, subCategoryId, detailedCategoryId));
}
