type CareCard = {
  name: string;
  role: string;
  experience: string;
  gender: string;
  schedule: string;
  language: string;
  location: string;
  price: string;
};

const careCards: CareCard[] = [
  {
    name: "Mia Johnson",
    role: "Nanny - Live-in",
    experience: "2 Years Experience",
    gender: "Female",
    schedule: "Full-Time",
    language: "English, Telugu",
    location: "New York, NY",
    price: "$15 - $20 / Hr",
  },
  {
    name: "Jaya Patel",
    role: "Babysitter",
    experience: "7 Years Experience",
    gender: "Female",
    schedule: "Part-Time",
    language: "Hindi, Gujarati",
    location: "Jersey City, NJ",
    price: "$20 - $25 / Hr",
  },
  {
    name: "Priya Sharma",
    role: "Cook",
    experience: "5 Years Experience",
    gender: "Female",
    schedule: "Full-Time",
    language: "Hindi",
    location: "Brooklyn, NY",
    price: "$18 / Hr",
  },
  {
    name: "Anjali Verma",
    role: "Elder Care",
    experience: "6 Years Experience",
    gender: "Female",
    schedule: "Live-in",
    language: "Hindi, English",
    location: "New Jersey",
    price: "$22 / Hr",
  },
  {
    name: "Ravi Kumar",
    role: "Driver",
    experience: "10 Years Experience",
    gender: "Male",
    schedule: "Full-Time",
    language: "Hindi, English",
    location: "Queens, NY",
    price: "$25 / Hr",
  },
];

const groupedCards: CareCard[][] = [];

for (let i = 0; i < careCards.length; i += 3) {
  groupedCards.push(careCards.slice(i, i + 3));
}

export default function HomeCareServicesSection() {
  return (
    <section className="home-care-section">
      <div className="container">
        <div className="care-header text-center">
          <h2>Care Services</h2>
          <p className="subtitle">Your Trusted Partner in Quality Care!</p>

          <p className="desc">
            Connecting caregivers with families in need of compassionate, reliable care.
            Services include nannies, babysitters, cooks, housekeepers, daycare centers, and elder care.
          </p>
        </div>

        <div className="row care-stats">
          <div className="col-md-3">
            <div className="stat-box">
              <h3>25M</h3>
              <p>Care Requests Fulfilled</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>1.5K+</h3>
              <p>New Caregivers Monthly</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>97%</h3>
              <p>User Satisfaction</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>150K+</h3>
              <p>Successful Matches</p>
            </div>
          </div>
        </div>

        <div className="care-steps text-center">
          <h3>Find Care in 3 Easy Steps</h3>

          <div className="row">
            <div className="col-md-4">
              <div className="step-box">
                <img src="/template-17/images/chao-steps/1.png" alt="Register" />
                <h5>Register</h5>
                <p>Create your profile easily</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-box">
                <img src="/template-17/images/chao-steps/2.png" alt="Find and Connect" />
                <h5>Find &amp; Connect</h5>
                <p>Search and connect instantly</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-box">
                <img src="/template-17/images/chao-steps/3.png" alt="Hire" />
                <h5>Hire</h5>
                <p>Review and finalize quickly</p>
              </div>
            </div>
          </div>

          <a href="#" className="btn-primary">Post your need</a>
        </div>

        <div className="care-services-section">
          <div className="row care-services">
            <div className="col-md-3">
              <div className="service-card">
                <div className="service-left">
                  <h5>Find<br />Job</h5>
                </div>

                <div className="service-content">
                  <p>Explore nanny, babysitter, cook, and elder care jobs.</p>
                </div>

                <div className="service-action">
                  <a href="#">Explore</a>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="service-card">
                <div className="service-left">
                  <h5>Find a<br />Caregiver</h5>
                </div>

                <div className="service-content">
                  <p>Hire trusted caregivers for your family.</p>
                </div>

                <div className="service-action">
                  <a href="#">Explore</a>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="service-card">
                <div className="service-left">
                  <h5>Own a<br />Center</h5>
                </div>

                <div className="service-content">
                  <p>Grow your daycare or care center business.</p>
                </div>

                <div className="service-action">
                  <a href="#">Explore</a>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="service-card">
                <div className="service-left">
                  <h5>Need a<br />Center</h5>
                </div>

                <div className="service-content">
                  <p>Find the best daycare or elder care centers.</p>
                </div>

                <div className="service-action">
                  <a href="#">Explore</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="caregiver-section">
          <div id="careCarousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval="2500">
            <div className="carousel-inner">
              {groupedCards.map((group, index) => (
                <div className={`carousel-item ${index === 0 ? "active" : ""}`} key={index}>
                  <div className="row">
                    {group.map((card: CareCard) => (
                      <div className="col-md-4" key={card.name}>
                        <div className="care-card">
                          <h4>{card.name}</h4>
                          <p className="role">{card.role}</p>

                          <ul>
                            <li><i className="material-icons">work</i> {card.experience}</li>
                            <li><i className="material-icons">person</i> {card.gender}</li>
                            <li><i className="material-icons">schedule</i> {card.schedule}</li>
                            <li><i className="material-icons">language</i> {card.language}</li>
                            <li><i className="material-icons">location_on</i> {card.location}</li>
                          </ul>

                          <div className="bottom">
                            <span>{card.price}</span>
                            <a href="#">View Profile</a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="carousel-control-prev" type="button" data-bs-target="#careCarousel" data-bs-slide="prev">
              <span className="carousel-control-prev-icon"></span>
            </button>

            <button className="carousel-control-next" type="button" data-bs-target="#careCarousel" data-bs-slide="next">
              <span className="carousel-control-next-icon"></span>
            </button>

            <div className="col-12 text-center mt-4">
              <a href="#" className="btn-view-more">
                View more <i className="material-icons">arrow_forward</i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}