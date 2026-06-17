import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPublicListings,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import {
  getLocationCities,
  getLocationCountries,
  getLocationStates,
  type CityOption,
  type CountryOption,
  type StateOption,
} from "../../../shared/api/locationMastersApi";
import {
  getCityFromLocationLabel,
  useHomeSelectedLocation,
} from "../hooks/useHomeSelectedLocation";

type HomeCategorySlug = NonNullable<PublicListingQuery["category"]>;

const quickLinks = [
  { title: "All Services", image: "/template-17/images/icon/shop.png", href: "/all-category" },
  { title: "Classified Listings", image: "/template-17/images/icon/ads.png", href: "/classifieds/index" },
  { title: "Real Estate", image: "/template-17/images/icon/real-estate.png", category: "real-estate" },
  { title: "Restaurants & Food", image: "/template-17/images/icon/restaurant.png", category: "restaurants-food" },
  { title: "Vehicles", image: "/template-17/images/icon/vehicles.png", category: "vehicles" },
  { title: "Care Services", image: "/template-17/images/icon/public-service.png", category: "care-services" },
  { title: "Events & Tickets", image: "/template-17/images/icon/calendar.png", category: "events-tickets" },
  { title: "Chao TV", image: "/template-17/images/icon/calendar.png", category: "chao-tv" },
  { title: "Roommates & Rentals", image: "/template-17/images/icon/home.png", category: "roommates-rentals" },
  { title: "Jobs", image: "/template-17/images/icon/employee.png", category: "jobs" },
  { title: "Electronics & Appliances", image: "/template-17/images/icon/electronics.png", category: "electronics-appliances" },
  { title: "Pets & Animals", image: "/template-17/classifieds/images/pets-1.jpg", category: "pets-animals" },
];

const listingCategoryOptions: Array<{ label: string; value: HomeCategorySlug }> = [
  { label: "Real Estate", value: "real-estate" },
  { label: "Restaurants & Food", value: "restaurants-food" },
  { label: "Vehicles", value: "vehicles" },
  { label: "Care Services", value: "care-services" },
  { label: "Events & Tickets", value: "events-tickets" },
  { label: "Chao TV", value: "chao-tv" },
  { label: "Roommates & Rentals", value: "roommates-rentals" },
  { label: "Jobs", value: "jobs" },
  { label: "Electronics & Appliances", value: "electronics-appliances" },
  { label: "Pets & Animals", value: "pets-animals" },
];

const defaultCityOptions = [
  "Novi",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
];

const searchKeywordOptions = [
  "Restaurants",
  "Roommates & Rentals",
  "Jobs",
  "Events & Tickets",
  "Chao TV",
  "Care Services",
  "Real Estate",
  "Vehicles",
  "Electronics & Appliances",
  "Pets & Animals",
];

type HomeListingSummary = {
  totalCount: number;
  categoryCounts: Partial<Record<HomeCategorySlug, number>>;
  cities: string[];
};

const emptySummary: HomeListingSummary = {
  totalCount: 0,
  categoryCounts: {},
  cities: [],
};

function buildQuickLinkHref(item: (typeof quickLinks)[number], city: string) {
  if (item.href) {
    return item.href;
  }

  if (!item.category) {
    return "/all-category";
  }

  if (item.category === "chao-tv") {
    return "/chao-tv";
  }

  const params = new URLSearchParams({ category: item.category });

  if (city) {
    params.set("city", city);
  }

  return `/all-listing?${params.toString()}`;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b));
}

function namesMatch(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function findCountryByName(countries: CountryOption[], countryName?: string | null) {
  const cleanCountryName = countryName?.trim();

  if (!cleanCountryName) {
    return undefined;
  }

  return countries.find((country) => {
    const isUnitedStates =
      namesMatch(country.name, "United States") ||
      namesMatch(country.name, "United States of America") ||
      namesMatch(country.code, "US") ||
      namesMatch(country.code, "USA");
    const aliases = isUnitedStates
      ? [country.name, country.code, "United States", "United States of America", "USA", "US"]
      : [country.name, country.code];

    return aliases.some((alias) => namesMatch(alias, cleanCountryName));
  });
}

function getCategoryForSearchKeyword(keyword: string): HomeCategorySlug | "" {
  const value = keyword.trim().toLowerCase();
  if (value.includes("restaurant")) return "restaurants-food";
  if (value.includes("roommate") || value.includes("rental")) return "roommates-rentals";
  if (value.includes("job") || value.includes("career") || value.includes("hiring")) return "jobs";
  if (value.includes("event") || value.includes("ticket")) return "events-tickets";
  if (value.includes("chao tv") || value.includes("video") || value.includes("news")) return "chao-tv";
  if (value.includes("real estate")) return "real-estate";
  if (value.includes("care")) return "care-services";
  if (value.includes("furniture") || value.includes("home")) return "furniture-home-decor";
  if (value.includes("vehicle") || value.includes("automobile")) return "vehicles";
  if (value.includes("electronic")) return "electronics-appliances";
  if (value.includes("pet") || value.includes("animal")) return "pets-animals";
  return "";
}

export default function HomeHeroSection() {
  const quickLinksRef = useRef<HTMLUListElement | null>(null);
  const navigate = useNavigate();
  const {
    currentLocation,
    currentCity,
    selectedLocation,
    selectedCity,
    activeCity,
    activeLocationLabel,
    setHomeSelectedLocation,
  } = useHomeSelectedLocation();
  const [selectedCategory, setSelectedCategory] = useState<HomeCategorySlug | "">("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [listingSummary, setListingSummary] = useState<HomeListingSummary>(emptySummary);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [draftCountryId, setDraftCountryId] = useState("");
  const [draftStateId, setDraftStateId] = useState("");
  const [draftCityName, setDraftCityName] = useState("");
  const [pendingStateName, setPendingStateName] = useState("");
  const [pendingCityName, setPendingCityName] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [locationReloadKey, setLocationReloadKey] = useState(0);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const cityOptions = useMemo(
    () => uniqueSorted([...listingSummary.cities, ...defaultCityOptions, currentCity, activeCity]),
    [activeCity, currentCity, listingSummary.cities],
  );
  const modalCityOptions = useMemo(
    () => uniqueSorted([
      ...cities.map((city) => city.name),
      ...cityOptions,
      draftCityName,
      pendingCityName,
    ]),
    [cities, cityOptions, draftCityName, pendingCityName],
  );
  const heroLocationText =
    activeLocationLabel
      ? activeLocationLabel
      : "your current location";
  const locationButtonText =
    currentLocation.status === "loading"
      ? "Detecting location"
      : activeLocationLabel || "Use current location";

  useEffect(() => {
    if (isLocationModalOpen) {
      const nextCity = selectedLocation.cityName || activeCity || currentCity || getCityFromLocationLabel(currentLocation.label);
      const nextState = selectedLocation.stateName || currentLocation.state || "";
      const nextCountry = selectedLocation.countryName || currentLocation.country || "";
      const matchedCountry = findCountryByName(countries, nextCountry);

      setDraftCountryId(matchedCountry ? String(matchedCountry.id) : "");
      setDraftStateId("");
      setDraftCityName(nextCity);
      setPendingStateName(nextState);
      setPendingCityName(nextCity);
    }
  }, [
    activeCity,
    countries,
    currentCity,
    currentLocation.country,
    currentLocation.label,
    currentLocation.state,
    isLocationModalOpen,
    selectedLocation.cityName,
    selectedLocation.countryName,
    selectedLocation.stateName,
  ]);

  useEffect(() => {
    let isActive = true;

    setIsLoadingCountries(true);
    getLocationCountries()
      .then((items) => {
        if (isActive) {
          setCountries(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setCountries([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCountries(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const countryId = Number(draftCountryId);

    if (!countryId) {
      setStates([]);
      setDraftStateId("");
      setCities([]);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingStates(true);
    getLocationStates(countryId)
      .then((items) => {
        if (isActive) {
          setStates(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setStates([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingStates(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [draftCountryId]);

  useEffect(() => {
    if (!pendingStateName || !states.length || draftStateId) {
      return;
    }

    const matchedState = states.find((state) => namesMatch(state.name, pendingStateName) || namesMatch(state.code, pendingStateName));

    if (matchedState) {
      setDraftStateId(String(matchedState.id));
      setPendingStateName("");
    }
  }, [draftStateId, pendingStateName, states]);

  useEffect(() => {
    let isActive = true;
    const stateId = Number(draftStateId);

    if (!stateId) {
      setCities([]);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingCities(true);
    getLocationCities(stateId)
      .then((items) => {
        if (isActive) {
          setCities(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setCities([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCities(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [draftStateId]);

  useEffect(() => {
    if (!pendingCityName || !cities.length) {
      return;
    }

    const matchedCity = cities.find((city) => namesMatch(city.name, pendingCityName));

    if (matchedCity) {
      setDraftCityName(matchedCity.name);
      setPendingCityName("");
    }
  }, [cities, pendingCityName]);

  useEffect(() => {
    if (!isLocationModalOpen) {
      return undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLocationModalOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isLocationModalOpen]);

  useEffect(() => {
    let isActive = true;

    async function loadHomeListings() {
      setIsSummaryLoading(true);
      const cityFilter = activeCity || undefined;
      const forceRefresh = locationReloadKey > 0;
      const [allListingsResult, ...categoryResults] = await Promise.allSettled([
        getPublicListings({ city: cityFilter, page: 1, pageSize: 1, forceRefresh }),
        ...listingCategoryOptions.map((category) =>
          getPublicListings({ category: category.value, city: cityFilter, page: 1, pageSize: 1, forceRefresh }),
        ),
      ]);

      if (!isActive) {
        return;
      }

      const totalCount = allListingsResult.status === "fulfilled" ? allListingsResult.value.totalCount || 0 : 0;
      const categoryCounts = Object.fromEntries(
        listingCategoryOptions.map((category, index) => [
          category.value,
          categoryResults[index]?.status === "fulfilled" ? categoryResults[index].value.totalCount || 0 : 0,
        ]),
      ) as Partial<Record<HomeCategorySlug, number>>;

      setListingSummary({
        totalCount,
        categoryCounts,
        cities: [],
      });
      setIsSummaryLoading(false);
    }

    void loadHomeListings();

    return () => {
      isActive = false;
    };
  }, [activeCity, locationReloadKey]);

  useEffect(() => {
    if (quickLinks.length <= 10) {
      return;
    }

    const timer = window.setInterval(() => {
      const track = quickLinksRef.current;
      if (!track) {
        return;
      }

      const nextLeft = track.scrollLeft + 128;
      const isAtEnd = nextLeft + track.clientWidth >= track.scrollWidth - 8;

      if (isAtEnd) {
        track.scrollTo({ left: 0, behavior: "auto" });
        return;
      }

      track.scrollTo({ left: nextLeft, behavior: "smooth" });
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  function applyLocationSelection() {
    const country = countries.find((item) => String(item.id) === draftCountryId);
    const state = states.find((item) => String(item.id) === draftStateId);
    const nextCity = draftCityName.trim() || currentCity || getCityFromLocationLabel(currentLocation.label);

    setHomeSelectedLocation({
      countryName: country?.name || "",
      stateName: state?.name || "",
      cityName: nextCity,
    });
    setLocationReloadKey((value) => value + 1);
    setIsLocationModalOpen(false);
  }

  function useDetectedLocation() {
    const detectedCity = currentCity || getCityFromLocationLabel(currentLocation.label);
    const matchedCountry = findCountryByName(countries, currentLocation.country);

    setDraftCountryId(matchedCountry ? String(matchedCountry.id) : "");
    setDraftStateId("");
    setDraftCityName(detectedCity);
    setPendingStateName(currentLocation.state || "");
    setPendingCityName(detectedCity);
  }

  function handleCountryChange(countryId: string) {
    setDraftCountryId(countryId);
    setDraftStateId("");
    setDraftCityName("");
    setPendingStateName("");
    setPendingCityName("");
    setCities([]);
  }

  function handleStateChange(stateId: string) {
    setDraftStateId(stateId);
    setDraftCityName("");
    setPendingCityName("");
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const keyword = searchText.trim() || selectedKeyword.trim();
    const keywordCategory = getCategoryForSearchKeyword(keyword);
    const category = selectedCategory || keywordCategory;
    const city = activeCity;

    if (category) {
      params.set("category", category);
    }

    if (city) {
      params.set("city", city);
    }

    if (keyword) {
      params.set("search", keyword);
    }

    navigate(`/all-listing${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="hom-head">
      <video autoPlay muted loop playsInline className="bg-video">
        <source src="/template-17/videos/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="video-overlay"></div>

      <div className="container">
        <div className="row">
          <div className="ban-tit">
            <h1>
              <b>
                Find your{" "}
                <span>
                  Local needs
                  <i></i>
                </span>
              </b>
              Browse Local Businesses, Services, Professionals, Jobs, Events & More in {heroLocationText}
            </h1>
          </div>

          <div className="ban-search ban-sear-all">
            <form name="filter_form" id="filter_form" className="filter_form" onSubmit={handleSearchSubmit}>
              <ul>
                <li className="sr-cate">
                  <select
                    name="explor_select"
                    id="explor_select"
                    className="chosen-select"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value as HomeCategorySlug | "")}
                  >
                    <option value="">All Listings</option>
                    {listingCategoryOptions.map((category) => (
                      <option value={category.value} key={category.value}>{category.label}</option>
                    ))}
                  </select>
                </li>

                <li className="sr-cit">
                  <button
                    type="button"
                    className="home-location-trigger"
                    onClick={() => setIsLocationModalOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={isLocationModalOpen}
                  >
                    <i className="material-icons" aria-hidden="true">my_location</i>
                    <span>{locationButtonText}</span>
                  </button>
                </li>

                <li className="sr-nor">
                  <select
                    id="expert-select-search"
                    name="expert-select-search"
                    className="chosen-select"
                    value={selectedKeyword}
                    onChange={(event) => setSelectedKeyword(event.target.value)}
                  >
                    <option value="">What are you looking for?</option>
                    {searchKeywordOptions.map((keyword) => (
                      <option value={keyword} key={keyword}>{keyword}</option>
                    ))}
                  </select>
                </li>

                <li className="sr-sea">
                  <input
                    type="text"
                    autoComplete="off"
                    id="select-search"
                    placeholder="What are you looking for?"
                    className="search-field"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                  <ul id="tser-res" className="tser-res tser-res1"></ul>
                </li>

                <li className="sr-btn">
                  <input
                    type="submit"
                    id="filter_submit"
                    name="filter_submit"
                    value="Search"
                    className="filter_submit"
                  />
                </li>
              </ul>
            </form>
          </div>

          {isLocationModalOpen ? (
            <div
              className="home-location-modal-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setIsLocationModalOpen(false);
                }
              }}
            >
              <div
                className="home-location-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="home-location-title"
              >
                <button
                  type="button"
                  className="home-location-modal-close"
                  onClick={() => setIsLocationModalOpen(false)}
                  aria-label="Close location popup"
                >
                  <i className="material-icons" aria-hidden="true">close</i>
                </button>

                <div className="home-location-modal-head">
                  <i className="material-icons" aria-hidden="true">location_on</i>
                  <div>
                    <h3 id="home-location-title">Location</h3>
                    <p>{currentLocation.label || selectedCity || "Current location unavailable"}</p>
                  </div>
                </div>

                <div className="home-location-select-grid">
                  <label htmlFor="home-location-country">
                    Country
                    <select
                      id="home-location-country"
                      value={draftCountryId}
                      onChange={(event) => handleCountryChange(event.target.value)}
                      disabled={isLoadingCountries}
                      autoFocus
                    >
                      <option value="">{isLoadingCountries ? "Loading countries" : "Select Country"}</option>
                      {countries.map((country) => (
                        <option value={country.id} key={country.id}>{country.name}</option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="home-location-state">
                    State
                    <select
                      id="home-location-state"
                      value={draftStateId}
                      onChange={(event) => handleStateChange(event.target.value)}
                      disabled={!draftCountryId || isLoadingStates}
                    >
                      <option value="">{isLoadingStates ? "Loading states" : "Select State"}</option>
                      {states.map((state) => (
                        <option value={state.id} key={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="home-location-city">
                    City
                    <select
                      id="home-location-city"
                      value={draftCityName}
                      onChange={(event) => setDraftCityName(event.target.value)}
                      disabled={!draftStateId || isLoadingCities}
                    >
                      <option value="">{isLoadingCities ? "Loading cities" : "Select City"}</option>
                      {modalCityOptions.map((city) => (
                        <option value={city} key={city}>{city}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {isLoadingCountries || isLoadingStates || isLoadingCities ? (
                  <div className="home-location-loading">
                    <span className="home-location-spinner" aria-hidden="true"></span>
                    {isLoadingCountries
                      ? "Loading countries"
                      : isLoadingStates
                        ? "Loading states"
                        : "Loading cities"}
                  </div>
                ) : null}

                <div className="home-location-modal-actions">
                  <button
                    type="button"
                    className="home-location-secondary"
                    onClick={useDetectedLocation}
                    disabled={!currentCity && !currentLocation.label}
                  >
                    <i className="material-icons" aria-hidden="true">my_location</i>
                    Use current
                  </button>
                  <button
                    type="button"
                    className="home-location-primary"
                    onClick={applyLocationSelection}
                    disabled={isSummaryLoading || !draftCityName.trim()}
                  >
                    <i className="material-icons" aria-hidden="true">refresh</i>
                    {isSummaryLoading ? "Loading" : "Reload"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="ban-short-links ani">
            <ul ref={quickLinksRef}>
              {quickLinks.map((item) => (
                <li key={item.title}>
                  <div>
                    <img src={item.image} alt={item.title} />
                    <h4>{item.title}</h4>
                    <span className="quick-link-tooltip">{item.title}</span>
                    <a href={buildQuickLinkHref(item, activeCity)} className="fclick"></a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
