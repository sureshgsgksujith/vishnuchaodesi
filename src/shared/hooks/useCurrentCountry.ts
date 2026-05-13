import { useEffect, useState } from "react";

type IpCountryResponse = {
  country?: string;
  country_name?: string;
};

let currentCountryRequest: Promise<string | null> | null = null;

const countryNamesByCode: Record<string, string> = {
  AU: "Australia",
  CA: "Canada",
  GB: "United Kingdom",
  IN: "India",
  SG: "Singapore",
  US: "United States",
};

async function getApproximateCountryFromIp() {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as IpCountryResponse;
  const countryCode = data.country?.trim().toUpperCase();

  return data.country_name?.trim() || (countryCode ? countryNamesByCode[countryCode] || countryCode : null);
}

function getCachedCurrentCountry() {
  currentCountryRequest ??= getApproximateCountryFromIp();

  return currentCountryRequest;
}

export function useCurrentCountry(fallbackCountry = "United States") {
  const [country, setCountry] = useState(fallbackCountry);

  useEffect(() => {
    let isMounted = true;

    getCachedCurrentCountry()
      .then((detectedCountry) => {
        if (isMounted && detectedCountry) {
          setCountry(detectedCountry);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  return country;
}
