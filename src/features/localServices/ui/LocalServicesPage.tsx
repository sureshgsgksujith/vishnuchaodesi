import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getCityFromLocationLabel, useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import { getPublicAllServicePostings } from "../../allServices/api/allServicePostingsApi";
import { getBlogPosts } from "../../blog/api/blogApi";
import { getCoupons } from "../../coupons/api/couponsApi";
import { getPublicListings } from "../../dashboard/api/listingsApi";
import { filterActiveEventListings } from "../../listing/utils/eventListings";
import {
  getLocationCities,
  getLocationCountries,
  getLocationStates,
  type CityOption,
  type CountryOption,
  type StateOption,
} from "../../../shared/api/locationMastersApi";
import "../styles/localServices.css";

type ServiceCategory = {
  title: string;
  icon: string;
  image: string;
  count: number;
  category?: string;
  categoryName?: string;
  categoryId?: number;
  services: ServiceItem[];
};

type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  subCategoryName: string;
};

const fallbackCityOptions = [
  "Novi",
  "New York City",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
];

const categoryAssets = [
  { icon: "/template-17/images/icon/general.png", image: "/template-17/classifieds/images/1.jpg" },
  { icon: "/template-17/images/icon/real-estate.png", image: "/template-17/classifieds/images/2.jpg" },
  { icon: "/template-17/images/icon/event.png", image: "/template-17/classifieds/images/3.jpeg" },
  { icon: "/template-17/images/icon/expert-book.png", image: "/template-17/classifieds/images/4.jpeg" },
  { icon: "/template-17/images/icon/restaurant.png", image: "/template-17/classifieds/images/5.jpg" },
  { icon: "/template-17/images/icon/public-service.png", image: "/template-17/classifieds/images/pets-1.jpg" },
  { icon: "/template-17/images/icon/vehicles.png", image: "/template-17/classifieds/images/7.jpeg" },
  { icon: "/template-17/images/icon/shield.png", image: "/template-17/classifieds/images/8.jpg" },
];

const serviceCategoryImages: Record<string, string> = {
  "educational-institutes": "/images/service-categories/educational-institutes.jpg",
  "religious-community-services": "/images/service-categories/religious-community-services.jpg",
  "astrology-services": "/images/service-categories/astrology-services.jpg",
  "real-estate-services": "/images/service-categories/real-estate-services.jpg",
  "health-wellness": "/images/service-categories/health-wellness.jpg",
  "food-catering": "/images/service-categories/food-catering.jpg",
  "wedding-events": "/images/service-categories/wedding-events.jpg",
  "lessons-tuitions": "/images/service-categories/lessons-tuitions.jpg",
  "home-business-needs": "/images/service-categories/home-business-needs.jpg",
  "lawyers-immigration-services": "/images/service-categories/lawyers-immigration-services.jpg",
  "financial-legal-services": "/images/service-categories/financial-legal-services.jpg",
  "travel-accommodation": "/images/service-categories/travel-accommodation.jpg",
};

const fallbackServiceCategories: ServiceCategory[] = [
  {
    title: "Financial & Taxation Services",
    icon: categoryAssets[0].icon,
    image: serviceCategoryImages["financial-legal-services"],
    count: 18,
    categoryName: "Financial & Taxation Services",
    services: buildFallbackItems("Finance & Tax", ["Tax Filing", "Accounting Services", "Bookkeeping", "Insurance Services", "Loan Services", "Financial Planning"]),
  },
  {
    title: "Real Estate Services",
    icon: categoryAssets[1].icon,
    image: serviceCategoryImages["real-estate-services"],
    count: 24,
    category: "real-estate",
    services: buildFallbackItems("Real Estate Services", ["Buy Property", "Sell Property", "Rental Homes", "Commercial Space", "Property Management", "Mortgage Services"]),
  },
  {
    title: "Wedding & Events",
    icon: categoryAssets[2].icon,
    image: serviceCategoryImages["wedding-events"],
    count: 16,
    category: "events-tickets",
    services: buildFallbackItems("Wedding & Events", ["Wedding Planning", "Photography", "Videography", "Decoration", "DJ Services", "Event Venues"]),
  },
  {
    title: "Lessons/Tuitions",
    icon: categoryAssets[3].icon,
    image: serviceCategoryImages["lessons-tuitions"],
    count: 20,
    categoryName: "Lessons/Tuitions",
    services: buildFallbackItems("Lessons/Tuitions", ["Math Tutors", "Science Tutors", "Music Classes", "Dance Classes", "Language Training", "Online Tutoring"]),
  },
  {
    title: "Food & Catering",
    icon: categoryAssets[4].icon,
    image: serviceCategoryImages["food-catering"],
    count: 22,
    category: "restaurants-food",
    services: buildFallbackItems("Food Services", ["Indian Catering", "Party Catering", "Wedding Catering", "Private Chef", "Tiffin Services", "Bakery Services"]),
  },
  {
    title: "Home & Business Needs",
    icon: categoryAssets[5].icon,
    image: serviceCategoryImages["home-business-needs"],
    count: 28,
    categoryName: "Home & Business Needs",
    services: buildFallbackItems("Home Services", ["Cleaning Services", "Electricians", "Plumbing", "Handyman", "Office Setup", "Pest Control"]),
  },
  {
    title: "Travel & Accommodation",
    icon: categoryAssets[6].icon,
    image: serviceCategoryImages["travel-accommodation"],
    count: 14,
    categoryName: "Travel & Accommodation",
    services: buildFallbackItems("Travel Services", ["Travel Agents", "Vacation Packages", "Hotels", "Air Tickets", "Car Rentals", "Tour Guides"]),
  },
  {
    title: "Health & Wellness",
    icon: categoryAssets[7].icon,
    image: serviceCategoryImages["health-wellness"],
    count: 26,
    categoryName: "Health & Wellness",
    services: buildFallbackItems("Health & Wellness", ["Doctors", "Dental Care", "Yoga Classes", "Fitness Trainers", "Massage Therapy", "Mental Wellness"]),
  },
];

type SummaryCountKey = "allServices" | "serviceExperts" | "jobs" | "events" | "coupons" | "blogs" | "community";

const summaryCards: Array<{ key: SummaryCountKey; title: string; icon: string; href: string }> = [
  { key: "allServices", title: "All Services", icon: "/template-17/images/icon/shop.png", href: "/all-services" },
  { key: "serviceExperts", title: "Service Experts", icon: "/template-17/images/icon/expert.png", href: "/service-experts/all-experts" },
  { key: "jobs", title: "Jobs", icon: "/template-17/images/icon/employee.png", href: "/all-listing?category=jobs" },
  { key: "events", title: "Events", icon: "/template-17/images/icon/event.png", href: "/all-listing?category=events-tickets" },
  { key: "coupons", title: "Coupons", icon: "/template-17/images/icon/coupons.png", href: "/coupons" },
  { key: "blogs", title: "Blogs", icon: "/template-17/images/icon/blog.png", href: "/blog-posts" },
  { key: "community", title: "Groups & Communities", icon: "/template-17/images/icon/general.png", href: "/community" },
];

const initialSummaryCounts: Record<SummaryCountKey, number | null> = {
  allServices: null,
  serviceExperts: null,
  jobs: null,
  events: null,
  coupons: null,
  blogs: null,
  community: null,
};

function getListingCountCity(city: string) {
  return city.split(/[–—]/, 1)[0]?.trim() || city.trim();
}

function getLocationAwareSummaryHref(card: (typeof summaryCards)[number], city: string) {
  if (!city || !["jobs", "events", "community"].includes(card.key)) return card.href;

  const params = new URLSearchParams(card.href.split("?", 2)[1] || "");
  params.set("city", city);
  return `${card.href.split("?", 1)[0]}?${params.toString()}`;
}

async function getActiveEventCount(city?: string) {
  const firstPage = await getPublicListings({
    category: "events-tickets",
    city: city || undefined,
    page: 1,
    pageSize: 100,
    forceRefresh: true,
  });
  const pageSize = Math.max(1, firstPage.pageSize || firstPage.items.length || 100);
  const pageCount = Math.ceil(firstPage.totalCount / pageSize);
  const remainingPages = pageCount > 1
    ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => getPublicListings({
        category: "events-tickets",
        city: city || undefined,
        page: index + 2,
        pageSize,
        forceRefresh: true,
      })))
    : [];
  const items = [firstPage, ...remainingPages].flatMap((result) => result.items || []);

  return { totalCount: filterActiveEventListings(items).length };
}

export default function LocalServicesPage() {
  const navigate = useNavigate();
  const {
    activeCity,
    activeLocationLabel,
    currentCity,
    currentLocation,
    selectedCity,
    selectedLocation,
    setHomeSelectedLocation,
  } = useHomeSelectedLocation();
  const [service, setService] = useState("");
  const [keyword, setKeyword] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(fallbackServiceCategories);
  const [summaryCounts, setSummaryCounts] = useState(initialSummaryCounts);
  const [draftCountryId, setDraftCountryId] = useState("");
  const [draftStateId, setDraftStateId] = useState("");
  const [draftCityName, setDraftCityName] = useState("");
  const [pendingStateName, setPendingStateName] = useState("");
  const [pendingCityName, setPendingCityName] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const city = activeCity || "Novi";
  const listingCountCity = getListingCountCity(activeCity);
  const locationButtonText =
    currentLocation.status === "loading" && !activeLocationLabel
      ? "Detecting location"
      : activeLocationLabel || "Use current location";
  const modalCityOptions = useMemo(
    () => uniqueSorted([
      ...cities.map((item) => item.name),
      ...fallbackCityOptions,
      currentCity,
      activeCity,
      draftCityName,
      pendingCityName,
    ]),
    [activeCity, cities, currentCity, draftCityName, pendingCityName],
  );

  const featuredServices = useMemo(
    () => serviceCategories.flatMap((category) => category.services.slice(0, 2).map((serviceItem) => ({ serviceItem, category }))).slice(0, 10),
    [serviceCategories]
  );

  useEffect(() => {
    let isActive = true;

    getAllServiceDirectoryTree()
      .then((categories) => {
        if (!isActive) {
          return;
        }

        const nextCategories = categories.map(mapDirectoryCategoryToLocalCard).filter((category) => category.services.length);
        setServiceCategories(nextCategories.length ? mergeFallbackCategories(nextCategories) : fallbackServiceCategories);
        setSummaryCounts((current) => ({
          ...current,
          allServices: categories.reduce(
            (categoryTotal, category) => categoryTotal + category.subCategories.reduce(
              (subCategoryTotal, subCategory) => subCategoryTotal + Math.max(1, subCategory.detailedCategories.length),
              0,
            ),
            0,
          ),
        }));
      })
      .catch(() => {
        if (isActive) {
          setServiceCategories(fallbackServiceCategories);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setSummaryCounts((current) => ({
      ...current,
      serviceExperts: null,
      jobs: null,
      events: null,
      community: null,
    }));

    Promise.allSettled([
      getPublicAllServicePostings({ city: listingCountCity || undefined, page: 1, pageSize: 1 }),
      getPublicListings({ category: "jobs", city: listingCountCity || undefined, page: 1, pageSize: 1, forceRefresh: true }),
      getActiveEventCount(listingCountCity),
      getCoupons("", 1, 1),
      getBlogPosts({ page: 1, pageSize: 1 }),
      getPublicListings({ category: "groups-communities", city: listingCountCity || undefined, page: 1, pageSize: 1, forceRefresh: true }),
    ]).then((results) => {
      if (!isActive) return;

      const keys: SummaryCountKey[] = ["serviceExperts", "jobs", "events", "coupons", "blogs", "community"];
      setSummaryCounts((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          next[keys[index]] = result.status === "fulfilled" ? result.value.totalCount || 0 : null;
        });
        return next;
      });
    });

    return () => {
      isActive = false;
    };
  }, [listingCountCity]);

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
    if (!isLocationModalOpen) {
      return;
    }

    const nextCity = selectedLocation.cityName || activeCity || currentCity || getCityFromLocationLabel(currentLocation.label);
    const nextState = selectedLocation.stateName || currentLocation.state || "";
    const nextCountry = selectedLocation.countryName || currentLocation.country || "";
    const matchedCountry = findCountryByName(countries, nextCountry);

    setDraftCountryId(matchedCountry ? String(matchedCountry.id) : "");
    setDraftStateId("");
    setDraftCityName(nextCity);
    setPendingStateName(nextState);
    setPendingCityName(nextCity);
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

    const matchedCity = cities.find((item) => namesMatch(item.name, pendingCityName));

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCategory = serviceCategories.find((item) => item.title === service);
    const selectedService = findMatchingService(selectedCategory ? [selectedCategory] : serviceCategories, keyword || service);

    if (selectedService) {
      navigate(buildDetailedHref(selectedService.serviceItem, selectedService.category));
      return;
    }

    if (selectedCategory?.services[0]) {
      navigate(buildDetailedHref(selectedCategory.services[0], selectedCategory));
      return;
    }

    navigate("/all-services");
  }

  function openCategory(category: ServiceCategory, serviceItem?: ServiceItem) {
    const nextService = serviceItem || category.services[0];

    if (nextService) {
      navigate(buildDetailedHref(nextService, category));
      return;
    }

    navigate(`/all-services?category=${encodeURIComponent(category.title)}`);
  }

  function applyLocationSelection() {
    const country = countries.find((item) => String(item.id) === draftCountryId);
    const state = states.find((item) => String(item.id) === draftStateId);
    const nextCity = draftCityName.trim() || currentCity || getCityFromLocationLabel(currentLocation.label);

    setHomeSelectedLocation({
      countryName: country?.name || "",
      stateName: state?.name || "",
      cityName: nextCity,
    });
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

  return (
    <>
      <CustomerHeader />
      <main className="local-services-page">
        <section className="local-services-hero">
          <video className="local-services-video" autoPlay muted loop playsInline>
            <source src="/template-17/videos/bg-video.mp4" type="video/mp4" />
          </video>
          <div className="local-services-overlay" />
          <div className="local-services-hero-inner">
            <p className="local-services-kicker">Local service directory</p>
            <h1>
              Find trusted <span>Service Professionals</span>
            </h1>
            <p className="local-services-copy">
              Browse local businesses, service providers, experts, events, and more near you.
            </p>

            <form className="local-services-search" onSubmit={submitSearch}>
              <button
                type="button"
                className="local-services-location-trigger"
                onClick={() => setIsLocationModalOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isLocationModalOpen}
              >
                <span className="material-icons" aria-hidden="true">place</span>
                <span>{locationButtonText}</span>
                <span className="material-icons" aria-hidden="true">expand_more</span>
              </button>
              <label>
                <span className="material-icons">business_center</span>
                <select value={service} onChange={(event) => setService(event.target.value)} aria-label="Select service">
                  <option value="">What service are you looking for?</option>
                  {serviceCategories.map((item) => (
                    <option value={item.title} key={item.title}>{item.title}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="material-icons">search</span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search service, business, or keyword"
                />
              </label>
              <button type="submit">Get Quotes</button>
            </form>

            <div className="local-services-shortcuts">
              <button type="button" className="local-services-shortcut-featured" onClick={() => navigate("/all-services")}>
                <img src="/template-17/images/icon/shop.png" alt="" />
                <span>All Services</span>
              </button>
              {serviceCategories.map((category) => (
                <button type="button" onClick={() => openCategory(category)} key={category.title}>
                  <img src={category.icon} alt="" />
                  <span>{category.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLocationModalOpen ? (
          <div
            className="local-services-location-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsLocationModalOpen(false);
              }
            }}
          >
            <div className="local-services-location-modal" role="dialog" aria-modal="true" aria-labelledby="local-services-location-title">
              <button
                type="button"
                className="local-services-location-modal-close"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Close location popup"
              >
                <i className="material-icons" aria-hidden="true">close</i>
              </button>

              <div className="local-services-location-modal-head">
                <i className="material-icons" aria-hidden="true">location_on</i>
                <div>
                  <h3 id="local-services-location-title">Location</h3>
                  <p>{currentLocation.label || selectedCity || "Current location unavailable"}</p>
                </div>
              </div>

              <div className="local-services-location-select-grid">
                <label htmlFor="local-services-location-country">
                  Country
                  <select
                    id="local-services-location-country"
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

                <label htmlFor="local-services-location-state">
                  State
                  <select
                    id="local-services-location-state"
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

                <label htmlFor="local-services-location-city">
                  City
                  <select
                    id="local-services-location-city"
                    value={draftCityName}
                    onChange={(event) => setDraftCityName(event.target.value)}
                    disabled={!draftStateId || isLoadingCities}
                  >
                    <option value="">{isLoadingCities ? "Loading cities" : "Select City"}</option>
                    {modalCityOptions.map((item) => (
                      <option value={item} key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoadingCountries || isLoadingStates || isLoadingCities ? (
                <div className="local-services-location-loading">
                  <span className="local-services-location-spinner" aria-hidden="true"></span>
                  {isLoadingCountries ? "Loading countries" : isLoadingStates ? "Loading states" : "Loading cities"}
                </div>
              ) : null}

              <div className="local-services-location-modal-actions">
                <button
                  type="button"
                  className="local-services-location-secondary"
                  onClick={useDetectedLocation}
                  disabled={!currentCity && !currentLocation.label}
                >
                  <i className="material-icons" aria-hidden="true">my_location</i>
                  Use current
                </button>
                <button
                  type="button"
                  className="local-services-location-primary"
                  onClick={applyLocationSelection}
                  disabled={!draftCityName.trim()}
                >
                  <i className="material-icons" aria-hidden="true">refresh</i>
                  Reload
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="local-services-summary" aria-label="Service summary">
          <div className="local-services-container local-services-summary-grid">
            {summaryCards.map((card) => (
              <Link to={getLocationAwareSummaryHref(card, listingCountCity)} className="local-services-summary-card" key={card.title}>
                <img src={card.icon} alt="" />
                <strong>{summaryCounts[card.key] ?? "—"}</strong>
                <span>{card.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="local-services-section">
          <div className="local-services-container">
            <div className="local-services-section-title">
              <p>Popular near {city}</p>
              <h2>Top Local Service Categories</h2>
            </div>
            <div className="local-services-grid">
              {serviceCategories.map((category) => (
                <article className="local-services-card" key={category.title}>
                  <img src={category.image} alt={category.title} />
                  <div className="local-services-card-title">
                    <h3>{category.title}</h3>
                    <span>{category.count} services</span>
                  </div>
                  <div className="local-services-card-hover">
                    <h4>{category.title}</h4>
                    <ul>
                      {category.services.map((item) => (
                        <li key={`${category.title}-${item.subCategoryName}-${item.slug}-${item.id}`}>
                          <button type="button" onClick={() => openCategory(category, item)}>{item.name}</button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="local-services-more" onClick={() => openCategory(category)}>
                      More Services
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="local-services-featured">
          <div className="local-services-container">
            <div>
              <p>Customer needs</p>
              <h2>Frequently requested services</h2>
            </div>
            <div className="local-services-feature-list">
              {featuredServices.map((item) => (
                <button
                  type="button"
                  key={`${item.category.title}-${item.serviceItem.slug}-${item.serviceItem.id}`}
                  onClick={() => openCategory(item.category, item.serviceItem)}
                >
                  <span>{item.serviceItem.name}</span>
                  <small>{item.category.title}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="local-services-cta">
          <div className="local-services-container">
            <div>
              <p>List your business</p>
              <h2>Start receiving enquiries from customers near you.</h2>
            </div>
            <Link to="/dashboard/services/new">Add Service <span className="material-icons">arrow_forward</span></Link>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function mapDirectoryCategoryToLocalCard(category: AllServiceCategoryOption, index: number): ServiceCategory {
  const assets = categoryAssets[index % categoryAssets.length];
  const services = category.subCategories.flatMap(mapDirectorySubCategoryToItems);
  const isAstrology = /astro|horoscope|kundali/i.test(`${category.name} ${category.slug}`);
  const categorySlug = category.slug || buildSlug(category.name);

  return {
    title: category.name,
    icon: isAstrology ? "/template-17/images/icon/expert-book.png" : assets.icon,
    image: serviceCategoryImages[categorySlug] || assets.image,
    count: services.length,
    categoryId: category.id,
    categoryName: category.name,
    services,
  };
}

function mapDirectorySubCategoryToItems(subCategory: AllServiceSubCategoryOption): ServiceItem[] {
  if (subCategory.detailedCategories.length) {
    return subCategory.detailedCategories.map((detailCategory) => mapDirectoryDetailToItem(detailCategory, subCategory.name));
  }

  return [{
    id: subCategory.id,
    name: subCategory.name,
    slug: subCategory.slug || buildSlug(subCategory.name),
    subCategoryName: subCategory.name,
  }];
}

function mapDirectoryDetailToItem(detailCategory: AllServiceDetailedCategoryOption, subCategoryName: string): ServiceItem {
  return {
    id: detailCategory.id,
    name: detailCategory.name,
    slug: detailCategory.slug || buildSlug(detailCategory.name),
    subCategoryName,
  };
}

function buildFallbackItems(subCategoryName: string, names: string[]) {
  return names.map((name, index) => ({
    id: index + 1,
    name,
    slug: buildSlug(name),
    subCategoryName,
  }));
}

function mergeFallbackCategories(categories: ServiceCategory[]) {
  const hasCategory = (fallback: ServiceCategory) =>
    categories.some((category) =>
      namesMatch(category.categoryName || category.title, fallback.categoryName || fallback.title) ||
      buildSlug(category.categoryName || category.title) === buildSlug(fallback.categoryName || fallback.title),
    );
  const missingFallbackCategories = fallbackServiceCategories.filter((fallback) => !hasCategory(fallback));

  return [...missingFallbackCategories, ...categories];
}

function findMatchingService(categories: ServiceCategory[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const allItems = categories.flatMap((category) => category.services.map((serviceItem) => ({ category, serviceItem })));

  if (!allItems.length) {
    return undefined;
  }

  if (!normalizedQuery) {
    return allItems[0];
  }

  return (
    allItems.find(({ serviceItem }) => serviceItem.name.toLowerCase() === normalizedQuery) ||
    allItems.find(({ serviceItem }) => serviceItem.name.toLowerCase().includes(normalizedQuery)) ||
    allItems.find(({ category }) => category.title.toLowerCase().includes(normalizedQuery)) ||
    allItems[0]
  );
}

function buildDetailedHref(serviceItem: ServiceItem, category: ServiceCategory) {
  const params = new URLSearchParams();

  params.set("service", serviceItem.name);
  params.set("detail", serviceItem.slug);
  params.set("subCategory", serviceItem.subCategoryName);
  params.set("category", category.categoryName || category.title);

  if (category.categoryId) {
    params.set("categoryId", String(category.categoryId));
  }

  return `/all-services-detailed?${params.toString()}`;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right));
}

function findCountryByName(countries: CountryOption[], name?: string | null) {
  if (!name) {
    return undefined;
  }

  return countries.find((country) => namesMatch(country.name, name) || namesMatch(country.code, name));
}

function namesMatch(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
