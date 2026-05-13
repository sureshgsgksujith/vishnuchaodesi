import { apiClient } from "./client";

export type AddressPrediction = {
  description: string;
  placeId: string;
};

export type AddressPlaceDetail = {
  formattedAddress: string;
  postalCode: string;
  country: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export async function searchAddressPredictions(
  query: string,
  country: string,
  state: string,
  city: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<AddressPrediction[]>("/Address/search", {
    params: { query, country, state, city },
    signal,
  });

  return response.data;
}

export async function getAddressPlaceDetail(placeId: string, signal?: AbortSignal) {
  const response = await apiClient.get<AddressPlaceDetail>("/Address/details", {
    params: { placeId },
    signal,
  });

  return response.data;
}
