import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import "../styles/localServices.css";

type ServiceCategory = {
  title: string;
  icon: string;
  image: string;
  count: number;
  category?: string;
  categoryName?: string;
  services: string[];
};

const cityOptions = [
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

const serviceCategories: ServiceCategory[] = [
  {
    title: "Financial & Taxation Services",
    icon: "/template-17/images/icon/general.png",
    image: "/template-17/classifieds/images/1.jpg",
    count: 18,
    categoryName: "Financial & Taxation Services",
    services: ["Tax Filing", "Accounting Services", "Bookkeeping", "Insurance Services", "Loan Services", "Financial Planning"],
  },
  {
    title: "Real Estate Services",
    icon: "/template-17/images/icon/real-estate.png",
    image: "/template-17/classifieds/images/2.jpg",
    count: 24,
    category: "real-estate",
    services: ["Buy Property", "Sell Property", "Rental Homes", "Commercial Space", "Property Management", "Mortgage Services"],
  },
  {
    title: "Wedding & Events",
    icon: "/template-17/images/icon/event.png",
    image: "/template-17/classifieds/images/3.jpeg",
    count: 16,
    category: "events-tickets",
    services: ["Wedding Planning", "Photography", "Videography", "Decoration", "DJ Services", "Event Venues"],
  },
  {
    title: "Lessons/Tuitions",
    icon: "/template-17/images/icon/expert-book.png",
    image: "/template-17/classifieds/images/4.jpeg",
    count: 20,
    categoryName: "Lessons/Tuitions",
    services: ["Math Tutors", "Science Tutors", "Music Classes", "Dance Classes", "Language Training", "Online Tutoring"],
  },
  {
    title: "Food & Catering",
    icon: "/template-17/images/icon/restaurant.png",
    image: "/template-17/classifieds/images/5.jpg",
    count: 22,
    category: "restaurants-food",
    services: ["Indian Catering", "Party Catering", "Wedding Catering", "Private Chef", "Tiffin Services", "Bakery Services"],
  },
  {
    title: "Home & Business Needs",
    icon: "/template-17/images/icon/public-service.png",
    image: "/template-17/classifieds/images/pets-1.jpg",
    count: 28,
    categoryName: "Home & Business Needs",
    services: ["Cleaning Services", "Electricians", "Plumbing", "Handyman", "Office Setup", "Pest Control"],
  },
  {
    title: "Travel & Accommodation",
    icon: "/template-17/images/icon/vehicles.png",
    image: "/template-17/classifieds/images/7.jpeg",
    count: 14,
    categoryName: "Travel & Accommodation",
    services: ["Travel Agents", "Vacation Packages", "Hotels", "Air Tickets", "Car Rentals", "Tour Guides"],
  },
  {
    title: "Health & Wellness",
    icon: "/template-17/images/icon/shield.png",
    image: "/template-17/classifieds/images/8.jpg",
    count: 26,
    categoryName: "Health & Wellness",
    services: ["Doctors", "Dental Care", "Yoga Classes", "Fitness Trainers", "Massage Therapy", "Mental Wellness"],
  },
];

const summaryCards = [
  { title: "All Services", value: "120+", icon: "/template-17/images/icon/listing.png", href: "/all-listing" },
  { title: "Service Experts", value: "85+", icon: "/template-17/images/icon/expert.png", href: "/service-experts/all-experts" },
  { title: "Jobs", value: "60+", icon: "/template-17/images/icon/employee.png", href: "/all-listing?category=jobs" },
  { title: "Products", value: "45+", icon: "/template-17/images/icon/shop.png", href: "/dashboard/products" },
  { title: "Events", value: "25+", icon: "/template-17/images/icon/event.png", href: "/all-listing?category=events-tickets" },
  { title: "Coupons", value: "30+", icon: "/template-17/images/icon/coupons.png", href: "/coupons" },
  { title: "Blogs", value: "75+", icon: "/template-17/images/icon/blog.png", href: "/blog-posts" },
  { title: "Community", value: "15+", icon: "/template-17/images/icon/general.png", href: "/community" },
];

export default function LocalServicesPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState("Novi");
  const [service, setService] = useState("");
  const [keyword, setKeyword] = useState("");

  const featuredServices = useMemo(
    () => serviceCategories.flatMap((category) => category.services.slice(0, 2).map((name) => ({ name, category }))).slice(0, 10),
    []
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCategory = serviceCategories.find((item) => item.title === service);
    navigate(buildListingHref(selectedCategory, city, keyword || service));
  }

  function openCategory(category: ServiceCategory, serviceName?: string) {
    navigate(buildListingHref(category, city, serviceName || category.title));
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
              <label>
                <span className="material-icons">place</span>
                <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Select city">
                  {cityOptions.map((item) => (
                    <option value={item} key={item}>{item}</option>
                  ))}
                </select>
              </label>
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
              {serviceCategories.map((category) => (
                <button type="button" onClick={() => openCategory(category)} key={category.title}>
                  <img src={category.icon} alt="" />
                  <span>{category.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="local-services-summary" aria-label="Service summary">
          <div className="local-services-container local-services-summary-grid">
            {summaryCards.map((card) => (
              <Link to={card.href} className="local-services-summary-card" key={card.title}>
                <img src={card.icon} alt="" />
                <strong>{card.value}</strong>
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
                        <li key={item}>
                          <button type="button" onClick={() => openCategory(category, item)}>{item}</button>
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
                <button type="button" key={`${item.category.title}-${item.name}`} onClick={() => openCategory(item.category, item.name)}>
                  <span>{item.name}</span>
                  <small>{item.category.title}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="local-services-cta">
          <div className="local-services-container">
            <div>
              <p>List your service for free</p>
              <h2>Start receiving enquiries from customers near you.</h2>
            </div>
            <Link to="/pricing-details">Add my service <span className="material-icons">arrow_forward</span></Link>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function buildListingHref(category: ServiceCategory | undefined, city: string, search: string) {
  const params = new URLSearchParams();

  if (category?.category) {
    params.set("category", category.category);
  } else if (category?.categoryName) {
    params.set("categoryName", category.categoryName);
  }

  if (city) {
    params.set("city", city);
  }

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const query = params.toString();
  return query ? `/all-listing?${query}` : "/all-listing";
}
