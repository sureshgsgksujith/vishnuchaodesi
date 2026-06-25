import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import "../styles/allServices.css";

type ServiceGroup = {
  title: string;
  items: string[];
};

type ServiceSection = {
  id: string;
  code: string;
  title: string;
  highlight: string;
  filter: string;
  groups: ServiceGroup[];
};

const serviceSections: ServiceSection[] = [
  {
    id: "educational-institutes",
    code: "ED",
    title: "Institutes",
    highlight: "Educational",
    filter: "Education",
    groups: [
      { title: "Schools", items: ["Public Schools", "Private High Schools", "Private Secondary Schools", "Grade School", "Preschools", "Kindergarten"] },
      { title: "College & Universities", items: ["Medical College", "Private Colleges", "College Counseling Services", "Indian Universities", "American Universities"] },
    ],
  },
  {
    id: "religious-community",
    code: "RC",
    title: "& Community Services",
    highlight: "Religious",
    filter: "Community",
    groups: [
      { title: "Religious Services", items: ["Palm Reading", "Tarot Card Reading", "Hindu Wedding Officiant", "Hindu Priest", "Bhajan Singers", "Hindu Temples"] },
      { title: "Community & Charity", items: ["Charity Organization Services", "Community Organization Services", "Cultural Organization", "Professional Associations", "Adoption Agencies", "Social Service Organizations"] },
    ],
  },
  {
    id: "real-estate",
    code: "RE",
    title: "Services",
    highlight: "Real Estate",
    filter: "Real Estate",
    groups: [
      { title: "Real Estate Agents", items: ["Buying/Selling Agents", "Commercial Agents", "Rental Agents", "Residential Agents", "Buyers Agents", "Sellers Agents", "Condos Realtor", "Apartments Realtor"] },
      { title: "Management & Inspection", items: ["Property Management Agency", "Tenant Screening", "Property Inspections", "Pest Inspection", "Mold Inspection", "New Home Construction Sales"] },
    ],
  },
  {
    id: "health-wellness",
    code: "HW",
    title: "& Wellness",
    highlight: "Health",
    filter: "Health",
    groups: [
      { title: "Doctors & Care", items: ["Dentist", "Dermatologists", "Pediatricians", "Physicians & Surgeons", "Home Health Care Services", "Telemedicine"] },
      { title: "Wellness & Counselling", items: ["Yoga Classes", "Massage Centers", "Ayurvedic Spas", "Marriage Counselling", "Career Counselling", "Reiki Healing"] },
    ],
  },
  {
    id: "food-catering",
    code: "FC",
    title: "& Catering",
    highlight: "Food",
    filter: "Food",
    groups: [
      { title: "Food Services", items: ["Homemade Indian Food", "Indian Tiffin Service", "Lunch Services", "Dinner Delivery", "Snacks Services", "Idli / Dosa Batter"] },
      { title: "Catering & Bakeries", items: ["Event & Party Catering", "Wedding Catering Services", "Vegetarian Catering", "Bakeries", "Sweet Shops", "Restaurants"] },
    ],
  },
  {
    id: "wedding-events",
    code: "WE",
    title: "& Events",
    highlight: "Wedding",
    filter: "Wedding",
    groups: [
      { title: "Event Professionals", items: ["DJ Services", "Punjabi DJs", "Wedding Photographers", "Videographers", "Event Planners", "Wedding Decorators"] },
      { title: "Wedding Needs", items: ["Wedding Halls", "Bridal Makeup Artists", "Mehndi Services", "Wedding Catering", "Flower Decorators", "Priest Services"] },
    ],
  },
  {
    id: "lessons-tuitions",
    code: "LT",
    title: "/ Tuitions",
    highlight: "Lessons",
    filter: "Lessons",
    groups: [
      { title: "Academic Lessons", items: ["Algebra Tutor", "Calculus Tutor", "Biology Tutor", "Chemistry Tutor", "ACT Tutor", "Basic Computer Classes"] },
      { title: "Arts & Culture", items: ["Bharatanatyam Dance Classes", "Kathak Dance Classes", "Hip Hop Dance Classes", "Salsa Dance Classes", "Vocal Music Classes", "Instrument Classes"] },
    ],
  },
  {
    id: "home-business",
    code: "HB",
    title: "& Business Needs",
    highlight: "Home",
    filter: "Home",
    groups: [
      { title: "Home Services", items: ["Home Cleaning Services", "Pest Control", "Movers & Packers", "Appliance Repair", "Cooking Services", "Housekeeping"] },
      { title: "Business & Technical", items: ["Data Recovery Services", "Laptop Repair Services", "Software Installation", "Office Network Services", "Grocery Stores", "Clothing Stores"] },
    ],
  },
  {
    id: "financial-legal",
    code: "FL",
    title: "& Legal Services",
    highlight: "Financial",
    filter: "Financial",
    groups: [
      { title: "Finance & Tax", items: ["Accountant Services", "Tax Consultants", "Tax Preparation Services", "Bookkeeping", "Payroll Processing", "Investment Management"] },
      { title: "Legal & Immigration", items: ["Immigration Services", "Visa Service", "Legal Attorney Services", "Indian Lawyers", "Tax Lawyer", "Real Estate Lawyer"] },
    ],
  },
  {
    id: "travel-accommodation",
    code: "TA",
    title: "& Accommodation",
    highlight: "Travel",
    filter: "Travel",
    groups: [
      { title: "Travel Services", items: ["Flight Tickets", "Travel Agents", "Tour Packages", "Honeymoon Trips", "Corporate Travel", "Visa Travel Help"] },
      { title: "Accommodation & Transport", items: ["Hotel Booking", "Vacation Rentals", "Car Rentals", "Airport Pickup", "Cab Services", "Travel Planning"] },
    ],
  },
];

const filters = [
  { label: "All", value: "All", icon: "apps" },
  { label: "Real Estate", value: "Real Estate", icon: "home" },
  { label: "Wedding & Events", value: "Wedding", icon: "event" },
  { label: "Food & Catering", value: "Food", icon: "restaurant" },
  { label: "Health", value: "Health", icon: "favorite" },
  { label: "Finance", value: "Financial", icon: "account_balance" },
  { label: "Travel", value: "Travel", icon: "flight_takeoff" },
];

export default function AllServicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return serviceSections.filter((section) => {
      const matchesFilter = activeFilter === "All" || section.filter === activeFilter;
      const haystack = `${section.highlight} ${section.title} ${section.groups.flatMap((group) => [group.title, ...group.items]).join(" ")}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeFilter, query]);

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
              <Link to="/dashboard/listings/new"><i className="material-icons">add_business</i> Post your business</Link>
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
              <Stat icon="apps" value="16+" label="service categories" />
              <Stat icon="business" value="120+" label="local services" />
              <Stat icon="public" value="USA & Canada" label="community directory" />
              <Stat icon="flash_on" value="Fast Match" label="find and enquire quickly" />
            </div>

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
                      <span>{section.highlight} {section.title}</span>
                    </a>
                  ))}
                </nav>
                <div className="all-services-provider-cta">
                  <h3>Are you a business owner?</h3>
                  <p>List your business and get discovered by local customers looking for trusted help.</p>
                  <Link to="/dashboard/listings/new">Post Your Business</Link>
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
                      <h3><span>{section.highlight}</span> {section.title}</h3>
                      <Link to="/local-services">View providers</Link>
                    </header>
                    <div className="all-services-group-grid">
                      {section.groups.map((group) => (
                        <div className="all-services-group" key={group.title}>
                          <h4>{group.title}</h4>
                          <div className="all-services-link-list">
                            {group.items.map((item) => (
                              <Link to={buildDetailedHref(item)} key={item}>{item}</Link>
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

function buildDetailedHref(service: string) {
  return `/all-services-detailed?service=${encodeURIComponent(service)}`;
}
