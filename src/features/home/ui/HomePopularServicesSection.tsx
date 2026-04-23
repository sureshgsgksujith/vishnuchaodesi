const categoryCards = [
  { title: "Real Estate", image: "/template-17/images/services/8.jpg" },
  { title: "Financial", image: "/template-17/images/services/7.jpg" },
  { title: "Legal", image: "/template-17/images/services/1.jpg" },
  { title: "Education", image: "/template-17/images/services/4.jpg" },
  { title: "Beautician", image: "/template-17/images/services/6.jpeg" },
  { title: "DJ Services", image: "/template-17/images/services/2.jpeg" },
];

const lessonServices = [
  {
    title: "A1 Passport & Visa Services",
    location: "362 Fifth Avenue, New York, NY",
    category: "Visa Services, Immigration +2 More",
  },
  {
    title: "Sathish Notary Passport OCI Services LLC",
    location: "Irving, TX, USA",
    category: "Notary, Passport, OCI +1 More",
  },
  {
    title: "Travelopod",
    location: "Dover, DE, USA",
    category: "Flight Tickets, Travel Agents +2 More",
  },
  {
    title: "CWT US LLC Travel",
    location: "Minnetonka, MN",
    category: "Travel Planning, Corporate Travel",
  },
  {
    title: "Universal Relocations",
    location: "Parsippany, NJ",
    category: "Storage, Packing, Moving +5 More",
  },
];

const weddingServices = [
  {
    title: "Royal Wedding Planners",
    location: "Edison, NJ",
    category: "Wedding Planning, Decor, Catering +3 More",
  },
  {
    title: "Dream Moments Photography",
    location: "New York, NY",
    category: "Wedding Photography, Videography",
  },
  {
    title: "Elegant Bridal Makeup Studio",
    location: "Jersey City, NJ",
    category: "Bridal Makeup, Hair Styling +2 More",
  },
  {
    title: "Grand Palace Banquets",
    location: "Long Island, NY",
    category: "Wedding Halls, Catering Services",
  },
  {
    title: "DJ Beats Entertainment",
    location: "Brooklyn, NY",
    category: "DJ Services, Live Music +1 More",
  },
];

const travelServices = [
  {
    title: "Travelopod",
    location: "Dover, DE",
    category: "Flight Tickets, Travel Agents +2 More",
  },
  {
    title: "Skyline Travel Agency",
    location: "New York, NY",
    category: "Flight Booking, Holiday Packages",
  },
  {
    title: "Global Visa Experts",
    location: "Chicago, IL",
    category: "Visa Services, Immigration +3 More",
  },
  {
    title: "Luxury Holidays USA",
    location: "Los Angeles, CA",
    category: "Tour Packages, Honeymoon Trips",
  },
  {
    title: "Quick Cab & Rentals",
    location: "Dallas, TX",
    category: "Car Rentals, Airport Pickup",
  },
];

function ServiceList({ items }: { items: { title: string; location: string; category: string }[] }) {
  return (
    <>
      {items.map((service) => (
        <div className="service-card" key={service.title}>
          <div className="service-info">
            <h6>{service.title}</h6>
            <p>
              <i className="material-icons">location_on</i>
              {service.location}
            </p>
            <p>
              <i className="material-icons">business</i>
              {service.category}
            </p>
          </div>
          <div className="service-actions">
            <a href="#" className="call-btn">
              <i className="material-icons">call</i>
            </a>
            <a href="#" className="view-btn">
              View More
            </a>
          </div>
        </div>
      ))}
    </>
  );
}

export default function HomePopularServicesSection() {
  return (
    <section className="home-services-combined py-5">
      <div className="container">
        <div className="text-center mb-4">
          <h2>
            <span>Popular Services</span> near you
          </h2>
          <p>Fulfill your local service needs with trusted providers</p>
        </div>

        <div className="row">
          <div className="col-lg-4">
            <div className="category-grid">
              {categoryCards.map((card) => (
                <div className="cat-card" key={card.title}>
                  <img src={card.image} alt={card.title} />
                  <h6>{card.title}</h6>
                </div>
              ))}
            </div>

            <a href="/all-category" className="view-all">
              View all services
            </a>
          </div>

          <div className="col-lg-8">
            <div className="services-wrapper">
              <ul className="nav service-tabs mb-3">
                <li>
                  <button className="active" type="button">
                    Lessons
                  </button>
                </li>
                <li>
                  <button type="button">Wedding</button>
                </li>
                <li>
                  <button type="button">Travel</button>
                </li>
              </ul>

              <div className="tab-content">
                <div className="tab-pane fade show active">
                  <ServiceList items={lessonServices} />
                </div>

                <div className="tab-pane fade" style={{ display: "none" }}>
                  <ServiceList items={weddingServices} />
                </div>

                <div className="tab-pane fade" style={{ display: "none" }}>
                  <ServiceList items={travelServices} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="home-section-wrapper">
          <div className="home-cta-section">
            <div className="container">
              <div className="row">
                <div className="col-lg-6">
                  <div className="cta-box">
                    <div className="cta-header-block">
                      <div className="cta-header">
                        <i className="material-icons">trending_up</i>
                        <h4>Start Getting New Customers.</h4>
                      </div>

                      <p className="cta-sub">
                        Get listed, reach over 100K+ users, provide solutions, and grow your business.
                      </p>
                    </div>

                    <ul className="cta-list">
                      <li><span>1</span> Expand your business by connecting with customers actively searching.</li>
                      <li><span>2</span> Receive service requests via WhatsApp and email.</li>
                      <li><span>3</span> Ensure visibility in the right categories.</li>
                      <li><span>4</span> Showcase ratings and reviews to build trust.</li>
                      <li><span>5</span> Easily manage leads, quotes, and bookings.</li>
                    </ul>

                    <a href="#" className="cta-btn">Create Your Business Profile</a>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="cta-box">
                    <div className="cta-header-block">
                      <div className="cta-header">
                        <i className="material-icons">groups</i>
                        <h4>Connect With Perfect Local Service Business.</h4>
                      </div>

                      <p className="cta-sub">
                        Find a service or nearby business, request a quote, and get it done.
                      </p>
                    </div>

                    <ul className="cta-list">
                      <li><span>1</span> Access verified professionals and stores.</li>
                      <li><span>2</span> Discover services based on location and budget.</li>
                      <li><span>3</span> Compare offers from different providers.</li>
                      <li><span>4</span> Connect via WhatsApp or email instantly.</li>
                      <li><span>5</span> Find services tailored to your needs.</li>
                    </ul>

                    <a href="#" className="cta-btn">Find a Professional</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </section>
  );
}