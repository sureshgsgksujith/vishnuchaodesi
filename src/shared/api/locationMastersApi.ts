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
  totalCount?: number;
};

let countriesCache: CountryOption[] | null = null;
const statesCache = new Map<string, StateOption[]>();
const citiesCache = new Map<string, CityOption[]>();

export async function getLocationCountries() {
  if (countriesCache) {
    return countriesCache;
  }

  const response = await apiClient.get<ListResponse<CountryOption>>("/location-masters/countries", {
    params: { page: 1, pageSize: 200 },
  });
  countriesCache = response.data.items;
  return countriesCache;
}

export async function getLocationStates(countryId?: number) {
  const cacheKey = String(countryId || "all");
  const cachedStates = statesCache.get(cacheKey);

  if (cachedStates) {
    return cachedStates;
  }

  const response = await apiClient.get<ListResponse<StateOption>>("/location-masters/states", {
    params: { countryId, page: 1, pageSize: 200 },
  });
  statesCache.set(cacheKey, response.data.items);
  return response.data.items;
}

export async function getLocationCities(stateId?: number) {
  const cacheKey = String(stateId || "all");
  const cachedCities = citiesCache.get(cacheKey);

  if (cachedCities) {
    return cachedCities;
  }

  const response = await apiClient.get<ListResponse<CityOption>>("/location-masters/cities", {
    params: { stateId, page: 1, pageSize: 200 },
  });
  const totalCount = response.data.totalCount ?? response.data.items.length;
  const pageCount = Math.ceil(totalCount / 200);
  const remainingPages = pageCount > 1
    ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
        apiClient.get<ListResponse<CityOption>>("/location-masters/cities", {
          params: { stateId, page: index + 2, pageSize: 200 },
        })))
    : [];
  const allCities = [response.data.items, ...remainingPages.map(page => page.data.items)]
    .flat()
    .filter((city, index, list) => list.findIndex(item => item.id === city.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
  citiesCache.set(cacheKey, allCities);
  return allCities;
}

export async function ensureLocationMaster(payload: EnsureLocationRequest) {
  const response = await apiClient.post<EnsureLocationResponse>("/location-masters/ensure", payload);
  return response.data;
}
