import { useEffect, useState } from "react";

type LocationStatus = "idle" | "loading" | "ready" | "unavailable";

type CoordinateReverseGeocodeResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
};

type IpLocationResponse = {
  city?: string;
  region?: string;
  region_code?: string;
  country_name?: string;
};

type CurrentLocationState = {
  label: string | null;
  status: LocationStatus;
};

let currentLocationRequest: Promise<string | null> | null = null;

const formatFallbackLocationLabel = (city?: string, state?: string, country?: string) => {
  const locationParts = [city, state || country].filter(Boolean);

  return locationParts.length > 0 ? locationParts.join(", ") : null;
};

const formatSubdivisionCode = (subdivisionCode?: string) => subdivisionCode?.split("-").at(-1);

const getBrowserPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 10000,
    });
  });

const reverseGeocodeCoordinates = async (latitude: number, longitude: number) => {
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

  return formatFallbackLocationLabel(
    data.city || data.locality,
    formatSubdivisionCode(data.principalSubdivisionCode) || data.principalSubdivision,
    data.countryName,
  );
};

const getApproximateLocationFromIp = async () => {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as IpLocationResponse;

  return formatFallbackLocationLabel(data.city, data.region_code || data.region, data.country_name);
};

const getCurrentLocationLabel = async () => {
  try {
    const position = await getBrowserPosition();
    const { latitude, longitude } = position.coords;

    return reverseGeocodeCoordinates(latitude, longitude);
  } catch {
    return getApproximateLocationFromIp();
  }
};

const getCachedCurrentLocationLabel = () => {
  currentLocationRequest ??= getCurrentLocationLabel();

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
        const label = await getCachedCurrentLocationLabel();

        if (isMounted && label) {
          setLocation({ label, status: "ready" });
          return;
        }
      } catch {
        // Keep the UI generic when every JSON location source fails.
      }

      if (isMounted) {
        setLocation({ label: null, status: "unavailable" });
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return location;
}
