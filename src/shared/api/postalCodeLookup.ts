const postalLookupBaseUrl =
  import.meta.env.VITE_POSTAL_LOOKUP_URL ||
  "https://nominatim.openstreetmap.org/search";

const postalLookupCachePrefix = "postal_lookup:";
const currentCountryCacheKey = "postal_lookup:current_country";

let currentCountryRequest: Promise<string | null> | null = null;

export type PostalCodeLocation = {
  country: string;
  state: string;
  city: string;
};

type NominatimSearchResult = {
  address?: {
    country?: string;
    state?: string;
    province?: string;
    region?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    suburb?: string;
    postcode?: string;
  };
};

type IpCountryResponse = {
  country_name?: string;
  country_code?: string;
};

function normalizePostalCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCacheKey(postalCode: string, country?: string) {
  return `${postalLookupCachePrefix}${normalizePostalCode(postalCode)}:${country?.trim().toLowerCase() || "any"}`;
}

function getBrowserCountryCode() {
  const locale =
    navigator.languages?.find((language) => language.includes("-")) ||
    navigator.language;
  const countryCode = locale?.split("-").at(-1);

  return countryCode && countryCode.length === 2
    ? countryCode.toLowerCase()
    : null;
}

async function getCurrentCountryHint(signal?: AbortSignal) {
  const cachedCountry = localStorage.getItem(currentCountryCacheKey);

  if (cachedCountry) {
    return cachedCountry;
  }

  currentCountryRequest ??= fetch("https://ipapi.co/json/", {
    headers: {
      Accept: "application/json",
    },
    signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        return getBrowserCountryCode();
      }

      const data = (await response.json()) as IpCountryResponse;
      return data.country_name || data.country_code || getBrowserCountryCode();
    })
    .catch(() => getBrowserCountryCode());

  const country = await currentCountryRequest;

  if (country) {
    localStorage.setItem(currentCountryCacheKey, country);
  }

  return country;
}

function readCachedLocation(cacheKey: string): PostalCodeLocation | null {
  const rawValue = localStorage.getItem(cacheKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PostalCodeLocation;
  } catch {
    return null;
  }
}

function writeCachedLocation(cacheKey: string, location: PostalCodeLocation) {
  localStorage.setItem(cacheKey, JSON.stringify(location));
}

function mapNominatimResult(
  result: NominatimSearchResult,
  postalCode: string
): PostalCodeLocation | null {
  const address = result.address;

  if (!address) {
    return null;
  }

  if (
    address.postcode &&
    normalizePostalCode(address.postcode) !== normalizePostalCode(postalCode)
  ) {
    return null;
  }

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.county ||
    "";

  const location = {
    country: address.country || "",
    state: address.state || address.province || address.region || "",
    city,
  };

  if (!location.country && !location.state && !location.city) {
    return null;
  }

  return location;
}

async function requestPostalLocation(
  postalCode: string,
  country?: string,
  signal?: AbortSignal
) {
  const url = new URL(postalLookupBaseUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", country?.trim() ? "1" : "5");
  url.searchParams.set("postalcode", postalCode);

  if (country?.trim()) {
    const countryHint = country.trim();

    if (/^[a-z]{2}$/i.test(countryHint)) {
      url.searchParams.set("countrycodes", countryHint.toLowerCase());
    } else {
      url.searchParams.set("country", countryHint);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Postal code lookup failed.");
  }

  const results = (await response.json()) as NominatimSearchResult[];
  const locations = results
    .map((result) => mapNominatimResult(result, postalCode))
    .filter((location): location is PostalCodeLocation => Boolean(location));

  if (country?.trim()) {
    return locations[0] || null;
  }

  const countryNames = new Set(
    locations.map((location) => location.country).filter(Boolean)
  );

  if (countryNames.size > 1) {
    return null;
  }

  return locations[0] || null;
}

export async function lookupPostalCodeLocation(
  postalCode: string,
  country?: string,
  signal?: AbortSignal
): Promise<PostalCodeLocation | null> {
  const trimmedPostalCode = postalCode.trim();

  if (trimmedPostalCode.length < 3) {
    return null;
  }

  const countryHint = country?.trim() || (await getCurrentCountryHint(signal));
  const cacheKey = getCacheKey(trimmedPostalCode, countryHint || undefined);
  const cachedLocation = readCachedLocation(cacheKey);

  if (cachedLocation) {
    return cachedLocation;
  }

  let location = await requestPostalLocation(
    trimmedPostalCode,
    countryHint || undefined,
    signal
  );

  if (!location && countryHint) {
    location = await requestPostalLocation(trimmedPostalCode, undefined, signal);
  }

  if (location) {
    writeCachedLocation(cacheKey, location);
  }

  return location;
}
