import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../api/allServiceDirectoryApi";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getCityFromLocationLabel, useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import {
  getLocationCities,
  getLocationCountries,
  getLocationStates,
  type CityOption,
  type CountryOption,
  type StateOption,
} from "../../../shared/api/locationMastersApi";
import "../styles/allServices.css";

type ServiceGroup = {
  id: number;
  slug: string;
  title: string;
  items: ServiceItem[];
};

type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  subCategoryName: string;
};

type ServiceSection = {
  id: string;
  code: string;
  name: string;
  categoryId: number;
  groups: ServiceGroup[];
};

const fallbackServiceSections: ServiceSection[] = [
  buildFallbackSection("educational-institutes", "EI", "Educational Institutes", [
    ["Schools", ["Public Schools", "Private High Schools", "Private Secondary Schools", "Grade School", "Preschools", "Kindergarten"]],
    ["College & Universities", ["Medical College", "Private Colleges", "College Counseling Services", "Indian Universities", "American Universities"]],
  ]),
  buildFallbackSection("religious-community-services", "RC", "Religious & Community Services", [
    ["Religious Services", ["Palm Reading", "Tarot Card Reading", "Hindu Wedding Officiant", "Hindu Priest", "Bhajan Singers", "Hindu Temples"]],
    ["Community & Charity", ["Charity Organization Services", "Community Organization Services", "Cultural Organization", "Professional Associations", "Adoption Agencies", "Social Service Organizations"]],
  ]),
  buildFallbackSection("real-estate-services", "RE", "Real Estate Services", [
    ["Real Estate Agents", ["Buying/Selling Agents", "Commercial Agents", "Rental Agents", "Residential Agents", "Buyers Agents", "Sellers Agents", "Condos Realtor", "Apartments Realtor"]],
    ["Management & Inspection", ["Property Management Agency", "Tenant Screening", "Property Inspections", "Pest Inspection", "Mold Inspection", "New Home Construction Sales"]],
  ]),
  buildFallbackSection("health-wellness", "HW", "Health & Wellness", [
    ["Doctors & Care", ["Dentist", "Dermatologists", "Pediatricians", "Physicians & Surgeons", "Home Health Care Services", "Telemedicine"]],
    ["Wellness & Counselling", ["Yoga Classes", "Massage Centers", "Ayurvedic Spas", "Marriage Counselling", "Career Counselling", "Reiki Healing"]],
  ]),
  buildFallbackSection("food-catering", "FC", "Food & Catering", [
    ["Food Services", ["Homemade Indian Food", "Indian Tiffin Service", "Lunch Services", "Dinner Delivery", "Snacks Services", "Idli / Dosa Batter"]],
    ["Catering & Bakeries", ["Event & Party Catering", "Wedding Catering Services", "Vegetarian Catering", "Bakeries", "Sweet Shops", "Restaurants"]],
  ]),
  buildFallbackSection("wedding-events", "WE", "Wedding & Events", [
    ["Event Professionals", ["DJ Services", "Punjabi DJs", "Wedding Photographers", "Videographers", "Event Planners", "Wedding Decorators"]],
    ["Wedding Needs", ["Wedding Halls", "Bridal Makeup Artists", "Mehndi Services", "Wedding Catering", "Flower Decorators", "Priest Services"]],
  ]),
  buildFallbackSection("lessons-tuitions", "LT", "Lessons / Tuitions", [
    ["Academic Lessons", ["Algebra Tutor", "Calculus Tutor", "Biology Tutor", "Chemistry Tutor", "ACT Tutor", "Basic Computer Classes"]],
    ["Arts & Culture", ["Bharatanatyam Dance Classes", "Kathak Dance Classes", "Hip Hop Dance Classes", "Salsa Dance Classes", "Vocal Music Classes", "Instrument Classes"]],
  ]),
  buildFallbackSection("home-business-needs", "HB", "Home & Business Needs", [
    ["Home Services", ["Home Cleaning Services", "Pest Control", "Movers & Packers", "Appliance Repair", "Cooking Services", "Housekeeping"]],
    ["Business & Technical", ["Data Recovery Services", "Laptop Repair Services", "Software Installation", "Office Network Services", "Grocery Stores", "Clothing Stores"]],
  ]),
  buildFallbackSection("financial-legal-services", "FL", "Financial & Legal Services", [
    ["Finance & Tax", ["Accountant Services", "Tax Consultants", "Tax Preparation Services", "Bookkeeping", "Payroll Processing", "Investment Management"]],
    ["Legal & Immigration", ["Immigration Services", "Visa Service", "Legal Attorney Services", "Indian Lawyers", "Tax Lawyer", "Real Estate Lawyer"]],
  ]),
  buildFallbackSection("travel-accommodation", "TA", "Travel & Accommodation", [
    ["Travel Services", ["Flight Tickets", "Travel Agents", "Tour Packages", "Honeymoon Trips", "Corporate Travel", "Visa Travel Help"]],
    ["Accommodation & Transport", ["Hotel Booking", "Vacation Rentals", "Car Rentals", "Airport Pickup", "Cab Services", "Travel Planning"]],
  ]),
];

const preferredFilterSlugs = [
  "educational-institutes",
  "religious-community-services",
  "real-estate-services",
  "health-wellness",
  "food-catering",
  "wedding-events",
  "lessons-tuitions",
  "home-business-needs",
  "financial-legal-services",
  "travel-accommodation",
];

const fallbackCityOptions = [
  "Novi",
  "New York City",
  "Chicago",
  "Houston",
  "Dallas",
  "San Francisco",
  "Toronto",
  "Vancouver",
];

export default function AllServicesPage() {
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
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [serviceSections, setServiceSections] = useState<ServiceSection[]>(fallbackServiceSections);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");
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
  const locationButtonText =
    currentLocation.status === "loading" && !activeLocationLabel
      ? "Detecting location"
      : activeLocationLabel || "Use current location";
  const modalCityOptions = useMemo(
    () => uniqueSorted([
      ...cities.map((city) => city.name),
      ...fallbackCityOptions,
      currentCity,
      activeCity,
      draftCityName,
      pendingCityName,
    ]),
    [activeCity, cities, currentCity, draftCityName, pendingCityName],
  );

  useEffect(() => {
    let isActive = true;
    setIsLoadingCategories(true);

    getAllServiceDirectoryTree()
      .then((categories) => {
        if (!isActive) {
          return;
        }

        const nextSections = categories.map(mapCategoryToSection).filter((section) => section.groups.length);
        setServiceSections(nextSections.length ? nextSections : fallbackServiceSections);
        setCategoryLoadError("");
      })
      .catch(() => {
        if (isActive) {
          setServiceSections(fallbackServiceSections);
          setCategoryLoadError("Showing saved all-service categories while the live directory list is unavailable.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

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

  const filters = useMemo(() => {
    const preferredSections = preferredFilterSlugs
      .map((slug) => serviceSections.find((section) => section.id === slug))
      .filter((section): section is ServiceSection => Boolean(section));
    const otherSections = serviceSections.filter((section) => !preferredFilterSlugs.includes(section.id));
    const visibleFilterSections = [...preferredSections, ...otherSections].slice(0, 7);

    return [
      { label: "All", value: "all", icon: "apps" },
      ...visibleFilterSections.map((section) => ({
        label: buildFilterLabel(section.name),
        value: section.id,
        icon: getCategoryIcon(section.name, section.id),
      })),
    ];
  }, [serviceSections]);

  const heroShortcutSections = useMemo(() => {
    const preferredSections = preferredFilterSlugs
      .map((slug) => serviceSections.find((section) => section.id === slug))
      .filter((section): section is ServiceSection => Boolean(section));
    const otherSections = serviceSections.filter((section) => !preferredFilterSlugs.includes(section.id));

    return [...preferredSections, ...otherSections].slice(0, 8);
  }, [serviceSections]);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return serviceSections.filter((section) => {
      const matchesFilter = activeFilter === "all" || section.id === activeFilter;
      const haystack = `${section.name} ${section.groups.flatMap((group) => [group.title, ...group.items.map((item) => item.name)]).join(" ")}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeFilter, query]);

  const totalSubCategories = useMemo(
    () => serviceSections.reduce((total, section) => total + section.groups.length, 0),
    [serviceSections],
  );
  const totalDetailedCategories = useMemo(
    () => serviceSections.reduce(
      (total, section) => total + section.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0),
      0,
    ),
    [serviceSections],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstService = visibleSections[0]?.groups[0]?.items[0];
    if (firstService) {
      navigate(buildDetailedHref(firstService));
    }
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
      <main className="all-services-page">
        <section className="all-services-hero">
          <video className="all-services-video" autoPlay muted loop playsInline>
            <source src="/template-17/videos/bg-video.mp4" type="video/mp4" />
          </video>
          <div className="all-services-overlay" />
          <div className="all-services-hero-inner">
            <p className="all-services-kicker">Local service directory</p>
            <h1>
              Find trusted <span>Service Professionals</span>
            </h1>
            <p className="all-services-copy">
              Browse local businesses, service providers, experts, events, and more near you.
            </p>

            <form className="all-services-local-search" onSubmit={submitSearch}>
              <button
                type="button"
                className="all-services-local-location"
                onClick={() => setIsLocationModalOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isLocationModalOpen}
              >
                <i className="material-icons" aria-hidden="true">place</i>
                <span>{locationButtonText}</span>
                <i className="material-icons" aria-hidden="true">expand_more</i>
              </button>
              <label>
                <span className="material-icons">business_center</span>
                <select
                  value={activeFilter === "all" ? "" : activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value || "all")}
                  aria-label="Select service"
                >
                  <option value="">What service are you looking for?</option>
                  {serviceSections.map((section) => (
                    <option value={section.id} key={section.id}>{section.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="material-icons">search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search service, business, or keyword"
                />
              </label>
              <button type="submit">Get Quotes</button>
            </form>

            <div className="all-services-shortcuts">
              <button
                type="button"
                className={activeFilter === "all" ? "all-services-shortcut-featured" : ""}
                onClick={() => setActiveFilter("all")}
              >
                <img src="/template-17/images/icon/shop.png" alt="" />
                <span>All Services</span>
              </button>
              {heroShortcutSections.map((section) => (
                <button
                  type="button"
                  className={activeFilter === section.id ? "all-services-shortcut-featured" : ""}
                  onClick={() => setActiveFilter(section.id)}
                  key={section.id}
                >
                  <i className="material-icons" aria-hidden="true">{getCategoryIcon(section.name, section.id)}</i>
                  <span>{buildFilterLabel(section.name)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLocationModalOpen ? (
          <div
            className="all-services-location-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsLocationModalOpen(false);
              }
            }}
          >
            <div className="all-services-location-modal" role="dialog" aria-modal="true" aria-labelledby="all-services-location-title">
              <button
                type="button"
                className="all-services-location-modal-close"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Close location popup"
              >
                <i className="material-icons" aria-hidden="true">close</i>
              </button>

              <div className="all-services-location-modal-head">
                <i className="material-icons" aria-hidden="true">location_on</i>
                <div>
                  <h3 id="all-services-location-title">Location</h3>
                  <p>{currentLocation.label || selectedCity || "Current location unavailable"}</p>
                </div>
              </div>

              <div className="all-services-location-select-grid">
                <label htmlFor="all-services-location-country">
                  Country
                  <select
                    id="all-services-location-country"
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

                <label htmlFor="all-services-location-state">
                  State
                  <select
                    id="all-services-location-state"
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

                <label htmlFor="all-services-location-city">
                  City
                  <select
                    id="all-services-location-city"
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
                <div className="all-services-location-loading">
                  <span className="all-services-location-spinner" aria-hidden="true"></span>
                  {isLoadingCountries ? "Loading countries" : isLoadingStates ? "Loading states" : "Loading cities"}
                </div>
              ) : null}

              <div className="all-services-location-modal-actions">
                <button
                  type="button"
                  className="all-services-location-secondary"
                  onClick={useDetectedLocation}
                  disabled={!currentCity && !currentLocation.label}
                >
                  <i className="material-icons" aria-hidden="true">my_location</i>
                  Use current
                </button>
                <button
                  type="button"
                  className="all-services-location-primary"
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

        <section className="all-services-directory" id="all-services-directory">
          <div className="all-services-container">
            <div className="all-services-stat-grid">
              <Stat icon="apps" value={isLoadingCategories ? "..." : `${serviceSections.length}+`} label="service categories" />
              <Stat icon="business" value={isLoadingCategories ? "..." : `${totalDetailedCategories || totalSubCategories}+`} label="local services" />
              <Stat icon="public" value="USA & Canada" label="community directory" />
              <Stat icon="flash_on" value="Fast Match" label="find and enquire quickly" />
            </div>
            {categoryLoadError ? <div className="all-services-inline-status">{categoryLoadError}</div> : null}

            <div className="all-services-filter-row">
              {filters.map((filter) => (
                <button
                  className={filter.value === activeFilter ? "active" : ""}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  key={filter.value}
                >
                  <i className="material-icons">{filter.icon}</i>
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="all-services-layout">
              <aside className="all-services-side">
                <h3><span>Browse</span> Categories</h3>
                <nav>
                  {serviceSections.map((section, index) => (
                    <a className={index === 0 ? "active" : ""} href={`#${section.id}`} key={section.id}>
                      <b>{section.code}</b>
                      <span>{section.name}</span>
                    </a>
                  ))}
                </nav>
                <div className="all-services-provider-cta">
                  <h3>Are you a business owner?</h3>
                  <p>List your business and get discovered by local customers looking for trusted help.</p>
                  <Link to="/dashboard/services/new">Add Your Service</Link>
                </div>
              </aside>

              <div className="all-services-sections">
                {!visibleSections.length ? (
                  <div className="all-services-empty">
                    <h3>No matching services found</h3>
                    <p>Try another keyword or clear the search to view all services.</p>
                  </div>
                ) : null}

                {visibleSections.map((section) => (
                  <article className="all-services-section-card" id={section.id} key={section.id}>
                    <header>
                      <CategoryTitle name={section.name} />
                      <Link to={`/local-services?category=${encodeURIComponent(section.name)}`}>View providers</Link>
                    </header>
                    <div className="all-services-group-grid">
                      {section.groups.map((group, groupIndex) => (
                        <div className="all-services-group" key={buildGroupKey(section, group, groupIndex)}>
                          <h4>{group.title}</h4>
                          <div className="all-services-link-list">
                            {group.items.map((item, itemIndex) => (
                              <Link to={buildDetailedHref(item, section)} key={buildItemKey(section, group, item, itemIndex)}>{item.name}</Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function CategoryTitle({ name }: { name: string }) {
  const [firstWord, ...restWords] = name.split(" ");
  const rest = restWords.join(" ");

  return (
    <h3>
      <span>{firstWord}</span>{rest ? ` ${rest}` : ""}
    </h3>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="all-services-stat">
      <i className="material-icons">{icon}</i>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function mapCategoryToSection(category: AllServiceCategoryOption): ServiceSection {
  return {
    id: category.slug || buildSlug(category.name),
    categoryId: category.id,
    code: category.code || buildCode(category.name),
    name: category.name,
    groups: category.subCategories.map(mapSubCategoryToGroup).filter((group) => group.items.length),
  };
}

function mapSubCategoryToGroup(subCategory: AllServiceSubCategoryOption): ServiceGroup {
  const detailItems = subCategory.detailedCategories.map((detailCategory) => mapDetailedCategoryToItem(detailCategory, subCategory.name));

  return {
    id: subCategory.id,
    slug: subCategory.slug,
    title: subCategory.name,
    items: detailItems.length
      ? detailItems
      : [{
          id: subCategory.id,
          name: subCategory.name,
          slug: subCategory.slug,
          subCategoryName: subCategory.name,
        }],
  };
}

function mapDetailedCategoryToItem(detailCategory: AllServiceDetailedCategoryOption, subCategoryName: string): ServiceItem {
  return {
    id: detailCategory.id,
    name: detailCategory.name,
    slug: detailCategory.slug,
    subCategoryName,
  };
}

function buildFallbackSection(
  id: string,
  code: string,
  name: string,
  groups: Array<[string, string[]]>,
): ServiceSection {
  return {
    id,
    code,
    name,
    categoryId: 0,
    groups: groups.map(([title, items], index) => ({
      id: index + 1,
      slug: buildSlug(title),
      title,
      items: buildFallbackItems(title, items),
    })),
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

function buildDetailedHref(service: ServiceItem, section?: ServiceSection) {
  const params = new URLSearchParams({
    service: service.name,
    detail: service.slug,
    subCategory: service.subCategoryName,
  });

  if (section) {
    params.set("category", section.name);
    params.set("categoryId", String(section.categoryId));
  }

  return `/all-services-detailed?${params.toString()}`;
}

function buildGroupKey(section: ServiceSection, group: ServiceGroup, index: number) {
  return `${section.id}-${group.id ?? "group"}-${group.slug || buildSlug(group.title)}-${index}`;
}

function buildItemKey(section: ServiceSection, group: ServiceGroup, item: ServiceItem, index: number) {
  return `${section.id}-${group.id ?? "group"}-${group.slug || buildSlug(group.title)}-${item.id ?? "item"}-${item.slug || buildSlug(item.name)}-${index}`;
}

function buildCode(name: string) {
  const words = name.split(/[\s&/,-]+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFilterLabel(name: string) {
  if (name === "Restaurants & Food") {
    return "Food & Catering";
  }

  if (name === "Food & Catering") {
    return "Food & Catering";
  }

  if (name === "Events & Tickets") {
    return "Wedding & Events";
  }

  if (name === "Wedding & Events") {
    return "Wedding & Events";
  }

  if (name === "Care Services") {
    return "Health";
  }

  if (name === "Business & Industrial") {
    return "Finance";
  }

  if (name === "Jobs / Services") {
    return "Jobs";
  }

  return name;
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

function getCategoryIcon(name: string, slug: string) {
  const text = `${name} ${slug}`.toLowerCase();

  if (text.includes("education") || text.includes("school") || text.includes("college")) {
    return "school";
  }

  if (text.includes("estate")) {
    return "home";
  }

  if (text.includes("event") || text.includes("ticket")) {
    return "event";
  }

  if (text.includes("food") || text.includes("restaurant")) {
    return "restaurant";
  }

  if (text.includes("care") || text.includes("health")) {
    return "favorite";
  }

  if (text.includes("business") || text.includes("industrial")) {
    return "account_balance";
  }

  if (text.includes("job")) {
    return "work";
  }

  return "apps";
}
