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

export default function AllServicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [serviceSections, setServiceSections] = useState<ServiceSection[]>(fallbackServiceSections);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");

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

  return (
    <>
      <CustomerHeader />
      <main className="all-services-page">
        <section className="all-services-hero">
          <div className="all-services-container">
            <nav className="all-services-crumb" aria-label="breadcrumb">
              <Link to="/home">Home</Link>
              <span>/</span>
              <Link to="/local-services">Local Services</Link>
              <span>/</span>
              <b>All Services</b>
            </nav>
            <h1>Local Services & Indian Businesses in the USA & Canada</h1>
            <div className="all-services-meta">
              <span><i className="material-icons">storefront</i> All Categories</span>
              <span><i className="material-icons">location_on</i> Ashburn, VA</span>
              <span><i className="material-icons">star</i> Trusted providers</span>
              <span><i className="material-icons">verified_user</i> Verified service listings</span>
            </div>
            <div className="all-services-actions">
              <a href="#all-services-directory">View all services</a>
              <Link to="/dashboard/services/new"><i className="material-icons">add_business</i> Add your service</Link>
            </div>
            <form className="all-services-search" onSubmit={submitSearch}>
              <i className="material-icons">search</i>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services like Realtor, Catering, Dance Classes, DJ, Tax Consultant"
              />
              <button type="submit">Search</button>
            </form>
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
