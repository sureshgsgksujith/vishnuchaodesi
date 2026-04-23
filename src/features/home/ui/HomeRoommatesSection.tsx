const roommateListings = [
  {
    image: "/template-17/images/chao-home-room-listings/1.png",
    title:
      "Midtown Manhattan Furnished Room, Utils Incl - No Lease - Male Only Midtown Manhattan Furnished Room, Utils Incl - No Lease - Male Only",
    location:
      "East 34th Street, New York, NY, USA, 10016 East 34th Street, New York, NY, USA, 10016",
    availableFrom: "01 Apr 2026",
    gender: "Male",
    roomType: "Single Room",
    adType: "Room Offered",
    extra: "American Academy of Dramatic Arts University: American Academy of Dramatic Arts",
    price: "$800",
  },
  {
    image: "/template-17/images/chao-home-room-listings/2.jpeg",
    title: "Spacious Master Bedroom Available For Rent",
    location: "320 Surrey Place, Macungie, PA, USA, 18062",
    availableFrom: "15 Apr 2026",
    gender: "Both",
    roomType: "Single Room",
    adType: "Room Offered",
    extra: "Neighborhood:Hamilton Park",
    price: "$1000",
  },
  {
    image: "/template-17/images/chao-home-room-listings/3.png",
    title: "Semi Furnished Private Room Available For Females Only",
    location: "Temple Avenue & Hackensack Avenue, Hackensack, NJ, USA",
    availableFrom: "15 Apr 2026",
    gender: "Female",
    roomType: "Single Room",
    adType: "Room Offered",
    extra: "Bergen County Technical Schools - Adult and",
    price: "$895",
  },
];

const whyItems = [
  {
    icon: "groups",
    title: "Active Users",
    description: "Join 200K+ users actively searching for rooms and roommates.",
  },
  {
    icon: "flash_on",
    title: "Quick Matches",
    description: "Find your match fast — most users connect within a week.",
  },
  {
    icon: "description",
    title: "Fresh Listings",
    description: "New rooms and rental listings added regularly.",
  },
  {
    icon: "apps",
    title: "Diverse Choices",
    description: "Choose from shared rooms, apartments, condos and houses.",
  },
  {
    icon: "trending_up",
    title: "High Response Rate",
    description: "Most listings receive responses within 24 hours.",
  },
  {
    icon: "sentiment_satisfied",
    title: "Satisfied Users",
    description: "Thousands of happy users found their perfect match.",
  },
];

export default function HomeRoommatesSection() {
  return (
    <section className="home-roommates">
      <div className="container">
        <div className="roommates-header text-center">
          <h2>Roommates & Rentals</h2>
          <p>
            Whether you're looking for a place to stay or offering a place, we've got you covered!
          </p>
        </div>

        <div className="row roommates-cards">
          <div className="col-md-6">
            <div className="room-card">
              <div className="room-card-header">
                <i className="material-icons">home</i>
                <div>
                  <h4>List my place</h4>
                  <span>(Offering a home)</span>
                </div>
              </div>

              <ul className="room-features">
                <li><i className="material-icons">check</i> List your room, apartment, condo or house</li>
                <li><i className="material-icons">check</i> Connect with potential tenants</li>
                <li><i className="material-icons">check</i> Get notified when users show interest</li>
                <li><i className="material-icons">check</i> Manage listings easily</li>
              </ul>

              <a href="#" className="room-btn">List my place</a>
            </div>
          </div>

          <div className="col-md-6">
            <div className="room-card">
              <div className="room-card-header">
                <i className="material-icons">search</i>
                <div>
                  <h4>Find a place</h4>
                  <span>(Looking for a home)</span>
                </div>
              </div>

              <ul className="room-features">
                <li><i className="material-icons">check</i> Browse available rooms & apartments</li>
                <li><i className="material-icons">check</i> Connect with owners & agents</li>
                <li><i className="material-icons">check</i> Get personalized matches</li>
                <li><i className="material-icons">check</i> Track responses in dashboard</li>
              </ul>

              <a href="#" className="room-btn">Find a place</a>
            </div>
          </div>
        </div>

        <div className="why-roommates">
          <div className="text-center why-title">
            <h3>Why Chao Desi Roommates & Rentals?</h3>
          </div>

          <div className="row why-grid">
            {whyItems.map((item) => (
              <div className="col-md-4" key={item.title}>
                <div className="why-card">
                  <i className="material-icons">{item.icon}</i>
                  <div>
                    <h5>{item.title}</h5>
                    <p>{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="home-room-listings">
          <div>
            <div className="listing-title text-center">
              <h3>Explore Rooms for Rent & Roommate Listings in and near New York, NY</h3>
            </div>

            <div className="row room-listing-row">
              {roommateListings.map((item) => (
                <div className="col-md-4" key={item.title}>
                  <div className="room-list-card">
                    <div className="room-img">
                      <img src={item.image} alt={item.title} />
                    </div>

                    <h4 className="room-title">{item.title}</h4>

                    <ul className="room-details">
                      <li><i className="material-icons">location_on</i> {item.location}</li>
                      <li><i className="material-icons">calendar_today</i> Available from: {item.availableFrom}</li>
                      <li><i className="material-icons">person</i> Gender: {item.gender}</li>
                      <li><i className="material-icons">meeting_room</i> Room Type: {item.roomType}</li>
                      <li><i className="material-icons">local_offer</i> Ad Type: {item.adType}</li>
                      <li><i className="material-icons">school</i> {item.extra}</li>
                    </ul>

                    <div className="room-bottom">
                      <span className="room-price">{item.price} <small>/Month</small></span>
                      <a href="#" className="room-link">View More</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="home-rental-cta">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <div className="rental-box left-box">
                  <p>Discover offered rental houses available for rent.</p>
                  <a href="#" className="cta-btn">Find rental houses</a>
                </div>
              </div>
              <div className="col-md-6">
                <div className="rental-box right-box">
                  <p>Search wanted listings for people looking for rental homes.</p>
                  <a href="#" className="cta-btn">Find renters</a>
                </div>
              </div>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </section>
  );
}