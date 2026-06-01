import { apiClient } from "./client";

export type CountryOption = {
  id: number;
  name: string;
  code: string;
};

export type StateOption = {
  id: number;
  countryId: number;
  name: string;
  code: string;
};

export type CityOption = {
  id: number;
  countryId: number;
  stateId: number;
  name: string;
};

export type EnsureLocationRequest = {
  countryName: string;
  countryCode?: string;
  stateName?: string;
  cityName?: string;
};

export type EnsureLocationResponse = {
  country: CountryOption;
  state?: StateOption | null;
  city?: CityOption | null;
};

type ListResponse<T> = {
  items: T[];
};

export async function getLocationCountries() {
  const response = await apiClient.get<ListResponse<CountryOption>>("/location-masters/countries", {
    params: { page: 1, pageSize: 200 },
  });
  return response.data.items;
}

export async function getLocationStates(countryId?: number) {
  const response = await apiClient.get<ListResponse<StateOption>>("/location-masters/states", {
    params: { countryId, page: 1, pageSize: 200 },
  });
  return response.data.items;
}

export async function getLocationCities(stateId?: number) {
  const response = await apiClient.get<ListResponse<CityOption>>("/location-masters/cities", {
    params: { stateId, page: 1, pageSize: 200 },
  });
  return response.data.items;
}

export async function ensureLocationMaster(payload: EnsureLocationRequest) {
  const response = await apiClient.post<EnsureLocationResponse>("/location-masters/ensure", payload);
  return response.data;
}
