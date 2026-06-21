import { useCallback, useEffect, useState } from "react";
import { useCurrentLocationLabel } from "./useCurrentLocationLabel";

const homeLocationStorageKey = "chaodesi.home.selectedCity";
const homeLocationDetailsStorageKey = "chaodesi.home.selectedLocation";
const homeLocationChangedEvent = "chaodesi:home-location-change";

export type HomeSelectedLocation = {
  countryName?: string;
  stateName?: string;
  cityName?: string;
};

export function getCityFromLocationLabel(label?: string | null) {
  return label?.split(",")[0]?.trim() || "";
}

function cleanLocationDetails(location?: HomeSelectedLocation | null): HomeSelectedLocation {
  return {
    countryName: location?.countryName?.trim() || "",
    stateName: location?.stateName?.trim() || "",
    cityName: location?.cityName?.trim() || "",
  };
}

function getLocationLabel(location: HomeSelectedLocation) {
  return [location.cityName, location.stateName, location.countryName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

function readStoredHomeLocation(): HomeSelectedLocation {
  if (typeof window === "undefined") {
    return {};
  }

  const storedLocation = window.localStorage.getItem(homeLocationDetailsStorageKey);

  if (storedLocation) {
    try {
      return cleanLocationDetails(JSON.parse(storedLocation) as HomeSelectedLocation);
    } catch {
      window.localStorage.removeItem(homeLocationDetailsStorageKey);
    }
  }

  return { cityName: window.localStorage.getItem(homeLocationStorageKey)?.trim() || "" };
}

function writeStoredHomeLocation(location: HomeSelectedLocation) {
  if (typeof window === "undefined") {
    return;
  }

  const cleanLocation = cleanLocationDetails(location);

  if (cleanLocation.cityName || cleanLocation.stateName || cleanLocation.countryName) {
    window.localStorage.setItem(homeLocationDetailsStorageKey, JSON.stringify(cleanLocation));
    window.localStorage.setItem(homeLocationStorageKey, cleanLocation.cityName || "");
  } else {
    window.localStorage.removeItem(homeLocationDetailsStorageKey);
    window.localStorage.removeItem(homeLocationStorageKey);
  }

  window.dispatchEvent(new CustomEvent(homeLocationChangedEvent, { detail: cleanLocation }));
}

export function clearHomeSelectedLocation() {
  writeStoredHomeLocation({});
}

export function useHomeSelectedLocation() {
  const currentLocation = useCurrentLocationLabel();
  const [selectedLocation, setSelectedLocation] = useState(readStoredHomeLocation);
  const [locationRevision, setLocationRevision] = useState(0);
  const currentCity = currentLocation.city || getCityFromLocationLabel(currentLocation.label);
  const selectedCity = selectedLocation.cityName || "";
  const activeCity = selectedCity || currentCity;
  const selectedLocationLabel = getLocationLabel(selectedLocation);
  const activeLocationLabel = selectedLocationLabel || currentLocation.label || currentCity;

  useEffect(() => {
    function syncSelectedLocation(event?: Event) {
      const nextLocation =
        event instanceof CustomEvent
          ? typeof event.detail === "string"
            ? { cityName: event.detail.trim() }
            : cleanLocationDetails(event.detail as HomeSelectedLocation)
          : readStoredHomeLocation();

      setSelectedLocation(nextLocation);
      setLocationRevision((value) => value + 1);
    }

    window.addEventListener(homeLocationChangedEvent, syncSelectedLocation);
    window.addEventListener("storage", syncSelectedLocation);

    return () => {
      window.removeEventListener(homeLocationChangedEvent, syncSelectedLocation);
      window.removeEventListener("storage", syncSelectedLocation);
    };
  }, []);

  const setHomeSelectedCity = useCallback((city: string) => {
    writeStoredHomeLocation({ cityName: city });
  }, []);

  const setHomeSelectedLocation = useCallback((location: HomeSelectedLocation) => {
    writeStoredHomeLocation(location);
  }, []);

  return {
    currentLocation,
    currentCity,
    selectedLocation,
    selectedCity,
    activeCity,
    activeLocationLabel,
    locationRevision,
    setHomeSelectedCity,
    setHomeSelectedLocation,
  };
}
