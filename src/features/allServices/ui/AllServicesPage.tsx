import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../api/allServiceDirectoryApi";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import "../styles/allServices.css";

type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  subCategoryName: string;
};

type ServiceGroup = {
  id: number;
  slug: string;
  title: string;
  items: ServiceItem[];
};

type ServiceSection = {
  id: string;
  code: string;
  name: string;
  categoryId: number;
  groups: ServiceGroup[];
};

export default function AllServicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCity, activeLocationLabel } = useHomeSelectedLocation();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [serviceSections, setServiceSections] = useState<ServiceSection[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");

  useEffect(() => {
    let isActive = true;
    setIsLoadingCategories(true);

    getAllServiceDirectoryTree()
      .then((categories) => {
        if (!isActive) return;
        const nextSections = categories.map(mapCategoryToSection).filter((section) => section.groups.length);
        setServiceSections(nextSections);
        setCategoryLoadError(nextSections.length ? "" : "No live service categories are configured yet.");
      })
      .catch(() => {
        if (!isActive) return;
        setServiceSections([]);
        setCategoryLoadError("Unable to load the live service directory.");
      })
      .finally(() => {
        if (isActive) setIsLoadingCategories(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = decodeURIComponent(location.hash.slice(1));
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.hash, serviceSections]);

  const filters = useMemo(
    () => [
      { label: "All", value: "all", icon: "apps" },
      ...serviceSections.slice(0, 9).map((section) => ({
        label: section.name,
        value: section.id,
        icon: getCategoryIcon(section.name, section.id),
      })),
    ],
    [serviceSections],
  );
  const spotlightSection = useMemo(() => findLegalSection(serviceSections), [serviceSections]);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return serviceSections.filter((section) => {
      const matchesFilter = activeFilter === "all" || section.id === activeFilter;
      const haystack = `${section.name} ${section.groups.flatMap((group) => [group.title, ...group.items.map((item) => item.name)]).join(" ")}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeFilter, query, serviceSections]);

  const totalSubCategories = useMemo(
    () => serviceSections.reduce((total, section) => total + section.groups.length, 0),
    [serviceSections],
  );

  const totalDetailedCategories = useMemo(
    () => serviceSections.reduce((total, section) => total + section.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0), 0),
    [serviceSections],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstService = visibleSections[0]?.groups[0]?.items[0];

    if (firstService && visibleSections[0]) {
      navigate(buildDetailedHref(firstService, visibleSections[0], activeCity));
      return;
    }

    document.getElementById("all-services-directory")?.scrollIntoView({ behavior: "smooth" });
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
                onClick={() => document.getElementById("all-services-directory")?.scrollIntoView({ behavior: "smooth" })}
              >
                <i className="material-icons" aria-hidden="true">place</i>
                <span>{activeLocationLabel || "Select location"}</span>
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
                  {serviceSections
                    .filter((section) => !spotlightSection || section.id !== spotlightSection.id)
                    .map((section) => (
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
              {serviceSections
                .filter((section) => !spotlightSection || section.id !== spotlightSection.id)
                .slice(0, 8)
                .map((section) => (
                  <button
                    type="button"
                    className={activeFilter === section.id ? "all-services-shortcut-featured" : ""}
                    onClick={() => setActiveFilter(section.id)}
                    key={section.id}
                  >
                    <i className="material-icons" aria-hidden="true">{getCategoryIcon(section.name, section.id)}</i>
                    <span>{section.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </section>

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

            <label className="all-services-directory-search">
              <i className="material-icons" aria-hidden="true">search</i>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search service, category, or keyword" />
            </label>

            <div className="all-services-layout">
              <aside className="all-services-side">
                <h3><span>Browse</span> Categories</h3>
                <nav>
                  {serviceSections.map((section, index) => (
                    <a className={getSideNavClassName(section, index, location.hash)} href={`#${section.id}`} key={section.id}>
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
                      <Link to={buildCategoryHref(section, activeCity)}>View more</Link>
                    </header>
                    <div className="all-services-group-grid">
                      {section.groups.map((group, groupIndex) => (
                        <div className="all-services-group" key={buildGroupKey(section, group, groupIndex)}>
                          <h4>{group.title}</h4>
                          <div className="all-services-link-list">
                            {group.items.map((item, itemIndex) => (
                              <Link to={buildDetailedHref(item, section, activeCity)} key={buildItemKey(section, group, item, itemIndex)}>
                                {item.name}
                              </Link>
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

function buildDetailedHref(service: ServiceItem, section: ServiceSection, city = "") {
  const params = new URLSearchParams({
    service: service.name,
    detail: service.slug,
    subCategory: service.subCategoryName,
    category: section.name,
  });

  if (section.categoryId > 0) {
    params.set("categoryId", String(section.categoryId));
  }
  if (city) {
    params.set("city", city);
  }

  return `/all-services-detailed?${params.toString()}`;
}

function buildCategoryHref(section: ServiceSection, city = "") {
  const params = new URLSearchParams({ category: section.name });
  if (section.categoryId > 0) {
    params.set("categoryId", String(section.categoryId));
  }
  if (city) {
    params.set("city", city);
  }
  return `/all-services-detailed?${params.toString()}`;
}

function buildGroupKey(section: ServiceSection, group: ServiceGroup, index: number) {
  return `${section.id}-${group.id}-${group.slug || buildSlug(group.title)}-${index}`;
}

function buildItemKey(section: ServiceSection, group: ServiceGroup, item: ServiceItem, index: number) {
  return `${section.id}-${group.id}-${item.id}-${item.slug || buildSlug(item.name)}-${index}`;
}

function getSideNavClassName(section: ServiceSection, index: number, hash: string) {
  if (!hash) {
    return index === 0 ? "active" : "";
  }

  return decodeURIComponent(hash.slice(1)) === section.id ? "active" : "";
}

function findLegalSection(sections: ServiceSection[]) {
  return (
    sections.find((section) => section.id === "lawyers-immigration-services") ||
    sections.find((section) => /lawyers.*immigration|law.*immigration/i.test(section.name)) ||
    sections.find((section) =>
      section.groups.some((group) => group.slug === "immigration-services" || /administrative law|immigration law/i.test(group.title)),
    )
  );
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

function getCategoryIcon(name: string, slug: string) {
  const text = `${name} ${slug}`.toLowerCase();
  if (text.includes("astro") || text.includes("horoscope") || text.includes("kundali")) return "auto_awesome";
  if (text.includes("law") || text.includes("immigration")) return "gavel";
  if (text.includes("education") || text.includes("school") || text.includes("college")) return "school";
  if (text.includes("estate")) return "home";
  if (text.includes("event")) return "event";
  if (text.includes("food") || text.includes("restaurant")) return "restaurant";
  if (text.includes("care") || text.includes("health")) return "favorite";
  if (text.includes("business")) return "account_balance";
  if (text.includes("job")) return "work";
  return "apps";
}
