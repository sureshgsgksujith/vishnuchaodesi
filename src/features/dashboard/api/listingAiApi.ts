import axios from "axios";
import { apiClient } from "../../../shared/api/client";

export type ListingAiSuggestionRequest = {
  mode: "listing" | "classified";
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  sellerName: string;
  title: string;
  description: string;
  businessDescription: string;
  city: string;
  state: string;
  country: string;
  price: string;
  attributes: Record<string, string>;
  fields: ListingAiFieldContext[];
  targetFieldLabel?: string;
  prompt?: string;
  characterLimit?: number;
  source: "customer";
};

export type ListingAiFieldContext = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  value: string;
};

export type ListingAiSuggestionResponse = {
  title: string;
  shortTagline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  fieldValues: Record<string, string>;
  highlights: string[];
  missingFields: string[];
  tips: string[];
};

export type ListingAiImageRequest = {
  mode: "listing" | "classified";
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  sellerName: string;
  city: string;
  state: string;
  country: string;
  attributes: Record<string, string>;
  generateProfile: boolean;
  generateCover: boolean;
  source: "customer";
};

export type ListingAiGeneratedImage = {
  type: "profile" | "cover";
  fileName: string;
  mimeType: string;
  base64: string;
  prompt: string;
};

export type ListingAiImageResponse = {
  images: ListingAiGeneratedImage[];
  errors: string[];
};

export async function getListingAiSuggestions(payload: ListingAiSuggestionRequest) {
  const response = await apiClient.post<ListingAiSuggestionResponse>("/ChatBot/listing-suggestions", payload);
  return response.data;
}

export async function generateListingAiImages(payload: ListingAiImageRequest) {
  const response = await apiClient.post<ListingAiImageResponse>("/ChatBot/listing-images", payload);
  return response.data;
}

export function getListingAiImageErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors;
    if (Array.isArray(errors) && typeof errors[0] === "string" && errors[0].trim()) {
      return errors[0];
    }

    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (error.code === "ECONNABORTED") {
      return "AI image generation is taking too long. Please try again.";
    }
  }

  return "AI image generation is not available right now.";
}
