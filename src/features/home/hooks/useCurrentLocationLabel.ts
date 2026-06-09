import { useEffect, useState } from "react";

type LocationStatus = "idle" | "loading" | "ready" | "unavailable";
type LocationPrecision = "city" | "district" | "locality";
type LocationSource = "browser" | "ip" | "none";

type ReverseGeocodeResult = {
  label: string | null;
  city: string | null;
  precision?: LocationPrecision;
};

type CurrentLocationResult = ReverseGeocodeResult & {
  accuracyMeters: number | null;
  source: LocationSource;
};

type CoordinateReverseGeocodeResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
};

type OpenCageReverseGeocodeResponse = {
  results?: Array<{
    components?: {
      _normalized_city?: string;
      city?: string;
      county?: string;
      city_district?: string;
      neighbourhood?: string;
      postcode?: string;
      quarter?: string;
      road?: string;
      state?: string;
      state_code?: string;
      state_district?: string;
      suburb?: string;
      town?: string;
      village?: string;
    };
  }>;
};

type IpLocationResponse = {
  city?: string;
  region?: string;
  region_code?: string;
  country_name?: string;
};

type CurrentLocationState = {
  accuracyMeters?: number | null;
  city?: string | null;
  label: string | null;
  source?: LocationSource;
  status: LocationStatus;
};

let currentLocationRequest: Promise<CurrentLocationResult> | null = null;
let currentLocationRequestedAt = 0;

const openCageApiKey =
  import.meta.env.VITE_OPENCAGE_API_KEY ||
  "586de5899207433193f8840870cc0379";
const currentLocationCacheMs = 5 * 60 * 1000;

const compactLocationParts = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .filter(
      (part, index, values) =>
        values.findIndex((value) => value?.toLowerCase() === part?.toLowerCase()) === index,
    ) as string[];

const formatLocationLabel = (...parts: Array<string | null | undefined>) => {
  const locationParts = compactLocationParts(parts);

  return locationParts.length > 0 ? locationParts.join(", ") : null;
};

const formatSubdivisionCode = (subdivisionCode?: string) => {
  const parts = subdivisionCode?.split("-");

  return parts?.[parts.length - 1];
};

const cleanAdministrativeName = (value?: string | null) =>
  value
    ?.replace(/\s+district$/i, "")
    .replace(/\s+/g, " ")
    .trim() || null;

const getBrowserPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let settled = false;

    const finish = (position?: GeolocationPosition) => {
      if (settled) {
        return;
      }

      settled = true;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      if (position || bestPosition) {
        resolve(position || bestPosition!);
        return;
      }

      reject(new Error("Unable to detect current location."));
    };

    const timeoutId = window.setTimeout(() => finish(), 20000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= 250) {
          finish(position);
        }
      },
      (error) => {
        if (bestPosition) {
          finish(bestPosition);
          return;
        }

        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);

          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }

          reject(error);
        }
      },
      {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
      },
    );
  });

const reverseGeocodeWithOpenCage = async (latitude: number, longitude: number) => {
  if (!openCageApiKey) {
    return null;
  }

  const params = new URLSearchParams({
    q: `${latitude}+${longitude}`,
    key: openCageApiKey,
    language: "en",
    no_annotations: "1",
  });
  const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OpenCageReverseGeocodeResponse;
  const components = data.results?.[0]?.components;

  if (!components) {
    return null;
  }

  const cityName =
    components.city ||
    components._normalized_city ||
    components.town ||
    components.village ||
    null;
  const district = cleanAdministrativeName(components.state_district || components.county);
  const locality = cleanAdministrativeName(
    components.neighbourhood ||
    components.suburb ||
    components.city_district ||
    components.quarter ||
    null,
  );
  const city = cleanAdministrativeName(district || cityName || locality);

  return {
    city,
    label: formatLocationLabel(locality, district, cityName && !district ? cityName : null, components.state_code || components.state),
    precision: locality ? "locality" : district ? "district" : "city",
  } satisfies ReverseGeocodeResult;
};

const reverseGeocodeWithFallbackService = async (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    localityLanguage: "en",
  });
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as CoordinateReverseGeocodeResponse;
  const city = data.city || data.locality || null;
  const state = formatSubdivisionCode(data.principalSubdivisionCode) || data.principalSubdivision;

  return {
    city,
    label: formatLocationLabel(data.locality === city ? null : data.locality, city, state || data.countryName),
    precision: data.locality && data.locality !== city ? "locality" : "city",
  } satisfies ReverseGeocodeResult;
};

const getPrecisionScore = (precision?: LocationPrecision) => {
  if (precision === "locality") return 3;
  if (precision === "district") return 2;
  if (precision === "city") return 1;
  return 0;
};

const getBestReverseGeocodeResult = (results: Array<ReverseGeocodeResult | null>) =>
  results
    .filter((result): result is ReverseGeocodeResult => Boolean(result?.label))
    .sort((a, b) => getPrecisionScore(b.precision) - getPrecisionScore(a.precision))[0] || null;

const reverseGeocodeCoordinates = async (latitude: number, longitude: number) => {
  const [openCageResult, fallbackResult] = await Promise.allSettled([
    reverseGeocodeWithOpenCage(latitude, longitude),
    reverseGeocodeWithFallbackService(latitude, longitude),
  ]);

  return getBestReverseGeocodeResult([
    openCageResult.status === "fulfilled" ? openCageResult.value : null,
    fallbackResult.status === "fulfilled" ? fallbackResult.value : null,
  ]);
};

const getApproximateLocationFromIp = async () => {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as IpLocationResponse;

  return {
    city: data.city || null,
    label: formatLocationLabel(data.city, data.region_code || data.region, data.country_name),
    precision: "city",
  } satisfies ReverseGeocodeResult;
};

const getCurrentLocation = async (): Promise<CurrentLocationResult> => {
  try {
    const position = await getBrowserPosition();
    const { latitude, longitude } = position.coords;
    const location = await reverseGeocodeCoordinates(latitude, longitude);

    if (location?.label) {
      return {
        ...location,
        accuracyMeters: Math.round(position.coords.accuracy),
        source: "browser",
      };
    }
  } catch {
    // Fall back to IP only when the browser denies location or GPS lookup fails.
  }

  const fallbackLocation = await getApproximateLocationFromIp();

  return {
    city: fallbackLocation?.city || null,
    label: fallbackLocation?.label || null,
    accuracyMeters: null,
    source: fallbackLocation?.label ? "ip" : "none",
  };
};

const getCachedCurrentLocation = () => {
  const now = Date.now();

  if (!currentLocationRequest || now - currentLocationRequestedAt > currentLocationCacheMs) {
    currentLocationRequestedAt = now;
    currentLocationRequest = getCurrentLocation();
  }

  return currentLocationRequest;
};

export function useCurrentLocationLabel(): CurrentLocationState {
  const [location, setLocation] = useState<CurrentLocationState>({
    label: null,
    status: "idle",
  });

  useEffect(() => {
    let isMounted = true;

    const loadLocation = async () => {
      setLocation((current) => ({ ...current, status: "loading" }));

      try {
        const nextLocation = await getCachedCurrentLocation();

        if (isMounted && nextLocation.label) {
          setLocation({ ...nextLocation, status: "ready" });
          return;
        }
      } catch {
        // Keep the UI generic when every JSON location source fails.
      }

      if (isMounted) {
        setLocation({ accuracyMeters: null, city: null, label: null, source: "none", status: "unavailable" });
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return location;
}
