import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPublicListings,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import { useCurrentLocationLabel } from "../hooks/useCurrentLocationLabel";

type HomeCategorySlug = NonNullable<PublicListingQuery["category"]>;

const quickLinks = [
  { title: "All Services", image: "/template-17/images/icon/shop.png", href: "/all-category" },
  { title: "Classified Listings", image: "/template-17/images/icon/ads.png", href: "/classifieds/index" },
  { title: "Real Estate", image: "/template-17/images/icon/real-estate.png", category: "real-estate" },
  { title: "Restaurants & Food", image: "/template-17/images/icon/restaurant.png", category: "restaurants-food" },
  { title: "Vehicles", image: "/template-17/images/icon/vehicles.png", category: "vehicles" },
  { title: "Care Services", image: "/template-17/images/icon/public-service.png", category: "care-services" },
  { title: "Events & Tickets", image: "/template-17/images/icon/calendar.png", category: "events-tickets" },
  { title: "Roommates & Rentals", image: "/template-17/images/icon/home.png", category: "roommates-rentals" },
  { title: "Jobs", image: "/template-17/images/icon/employee.png", category: "jobs" },
];

const listingCategoryOptions: Array<{ label: string; value: HomeCategorySlug }> = [
  { label: "Real Estate", value: "real-estate" },
  { label: "Restaurants & Food", value: "restaurants-food" },
  { label: "Vehicles", value: "vehicles" },
  { label: "Care Services", value: "care-services" },
  { label: "Events & Tickets", value: "events-tickets" },
  { label: "Roommates & Rentals", value: "roommates-rentals" },
  { label: "Jobs", value: "jobs" },
];

const defaultCityOptions = [
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
  "Care Services",
  "Real Estate",
  "Vehicles",
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

function getCityFromLocationLabel(label?: string | null) {
  return label?.split(",")[0]?.trim() || "";
}

function buildQuickLinkHref(item: (typeof quickLinks)[number], city: string) {
  if (item.href) {
    return item.href;
  }

  if (!item.category) {
    return "/all-category";
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

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count).padStart(2, "0");
}

function getCategoryForSearchKeyword(keyword: string): HomeCategorySlug | "" {
  const value = keyword.trim().toLowerCase();
  if (value.includes("restaurant")) return "restaurants-food";
  if (value.includes("roommate") || value.includes("rental")) return "roommates-rentals";
  if (value.includes("job") || value.includes("career") || value.includes("hiring")) return "jobs";
  if (value.includes("event") || value.includes("ticket")) return "events-tickets";
  if (value.includes("real estate")) return "real-estate";
  if (value.includes("care")) return "care-services";
  if (value.includes("furniture") || value.includes("home")) return "furniture-home-decor";
  if (value.includes("vehicle") || value.includes("automobile")) return "vehicles";
  if (value.includes("electronic")) return "electronics-appliances";
  return "";
}

export default function HomeHeroSection() {
  const navigate = useNavigate();
  const currentLocation = useCurrentLocationLabel();
  const [selectedCategory, setSelectedCategory] = useState<HomeCategorySlug | "">("");
  const [selectedCity, setSelectedCity] = useState("current-location");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [listingSummary, setListingSummary] = useState<HomeListingSummary>(emptySummary);
  const currentCity = currentLocation.city || getCityFromLocationLabel(currentLocation.label);
  const cityOptions = useMemo(
    () => uniqueSorted([...listingSummary.cities, ...defaultCityOptions, currentCity]),
    [currentCity, listingSummary.cities],
  );
  const topCounts = useMemo(
    () => [
      { title: "All Listings", count: formatCount(listingSummary.totalCount), image: "/template-17/images/icon/listing.png", href: "/all-listing" },
      ...listingCategoryOptions.map((category) => ({
        title: category.label,
        count: formatCount(listingSummary.categoryCounts[category.value] || 0),
        image: quickLinks.find((item) => item.category === category.value)?.image || "/template-17/images/icon/listing.png",
        href: `/all-listing?category=${category.value}`,
      })),
    ],
    [listingSummary.categoryCounts, listingSummary.totalCount],
  );
  const heroLocationText =
    currentLocation.status === "ready" && currentLocation.label
      ? currentLocation.label
      : "your current location";
  const citySelectText =
    currentLocation.status === "loading"
      ? "Detecting location"
      : currentLocation.label || "Use current location";

  useEffect(() => {
    let isActive = true;

    async function loadHomeListings() {
      const [allListingsResult, ...categoryResults] = await Promise.allSettled([
        getPublicListings({ page: 1, pageSize: 1 }),
        ...listingCategoryOptions.map((category) =>
          getPublicListings({ category: category.value, page: 1, pageSize: 1 }),
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
    }

    void loadHomeListings();

    return () => {
      isActive = false;
    };
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const keyword = searchText.trim() || selectedKeyword.trim();
    const keywordCategory = getCategoryForSearchKeyword(keyword);
    const category = selectedCategory || keywordCategory;
    const city = selectedCity === "current-location" ? currentCity : selectedCity;

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
                Find your
                <span>
                  Local needs
                  <i></i>
                </span>
              </b>
              Restaurants, cafe&apos;s, and bars in {heroLocationText}
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
                  <select
                    id="city_check"
                    name="city_check"
                    className="chosen-select"
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                  >
                    <option value="current-location">{citySelectText}</option>
                    {cityOptions.map((city) => (
                      <option value={city} key={city}>{city}</option>
                    ))}
                  </select>
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

          <div className="ban-short-links ani">
            <ul>
              {quickLinks.map((item) => (
                <li key={item.title}>
                  <div>
                    <img src={item.image} alt={item.title} />
                    <h4>{item.title}</h4>
                    <a href={buildQuickLinkHref(item, currentCity)} className="fclick"></a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="h2-ban-ql">
            <ul>
              {topCounts.map((item) => (
                <li key={item.title}>
                  <div>
                    <img src={item.image} alt={item.title} />
                    <h5>
                      <span className="count1">{item.count}</span>
                      {item.title}
                    </h5>
                    <a href={item.href}></a>
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
