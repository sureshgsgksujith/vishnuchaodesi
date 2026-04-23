const events = [
  {
    image: "/template-17/images/events/1.jpg",
    title: "Bollywood Nights Nyc - Saturday Night Cruise Party",
    meta1: "Bollywood, Night Party",
    venue: "Sky Port Marina",
    location: "New York, NY 10010",
    schedule: "Sat, May 23 at 11:00 PM(EDT)",
    price: "$25 - $50",
    promoted: true,
  },
  {
    image: "/template-17/images/events/2.jpg",
    title: "Manhattan's Hottest Bollywood Bhangra Party At Hk Hall",
    meta1: "Lineup: DJ Browny",
    venue: "Hk Hall",
    location: "New York, NY 10036",
    schedule: "Sun, May 24 at 10:00 PM(EST)",
    price: "$25 - $220",
    promoted: true,
  },
  {
    image: "/template-17/images/events/3.jpg",
    title: "Arjun Rampal Spinning Live In New York At Hk Hall",
    meta1: "Lineup: DJ Browny",
    venue: "Hk Hall",
    location: "New York, NY 10036",
    schedule: "Sat, Jun 06 at 10:00 PM(EST)",
    price: "$45 - $3,000",
    promoted: true,
  },
  {
    image: "/template-17/images/events/4.jpg",
    title: "Haricharan Live Concert 2026 In New York",
    meta1: "Lineup: Haricharan",
    venue: "Dramma Times Square",
    location: "New York, NY 10019",
    schedule: "Fri, Apr 17 at 9:00 PM(EST)",
    price: "$30 - $1,000",
    promoted: false,
  },
  {
    image: "/template-17/images/events/5.jpg",
    title: "Laughing Lassi – The #1 South Asian Stand-up Comedy Show In New York City!",
    meta1: "Comedy",
    venue: "Broadway Comedy Club",
    location: "New York, NY 10019",
    schedule: "Fri, Apr 24 at 7:00 PM(EST)",
    price: "$25",
    promoted: false,
  },
  {
    image: "/template-17/images/events/6.jpg",
    title: "Kolors & Kabaddi In New York",
    meta1: "Fusion, Holi",
    venue: "Upper West Manhattan Church Of Christ",
    location: "New York, NY 10025",
    schedule: "Sat, Apr 25 at 1:00 PM(EDT)",
    price: "$30 - $35",
    promoted: false,
  },
];

export default function HomeEventsSection() {
  return (
    <section className="home-events">
      <div className="container">
        <div className="events-header text-center mb-20">
          <h2>Events & Tickets</h2>
          <p className="subtitle">Explore the hottest gigs, shows & more</p>

          <div className="browse-title">
            Browsing events in & near
            <div className="location-dropdown">
              <button className="location-pill" id="locationBtn">
                New York, NY <i className="material-icons">expand_more</i>
              </button>
              <div className="dropdown-content" id="locationMenu">
                <a href="#">Aurora, CO</a>
                <a href="#">Austin, TX</a>
                <a href="#">Bellevue, WA</a>
                <a href="#">Boston, MA</a>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {events.map((event) => (
            <div className="col-lg-4 col-md-6 mb-4" key={event.title}>
              <div className="event-card">
                {event.promoted && <span className="promoted">Promoted</span>}

                <div className="card-main-content">
                  <div className="event-left">
                    <img src={event.image} alt={event.title} />
                  </div>

                  <div className="event-right">
                    <h4>{event.title}</h4>
                    <div className="meta">
                      <span>
                        <i className="material-icons">
                          {event.meta1.includes("Lineup") ? "mic" : "local_offer"}
                        </i>
                        {event.meta1}
                      </span>
                      <span>
                        <i className="material-icons">meeting_room</i>
                        {event.venue}
                      </span>
                      <span>
                        <i className="material-icons">location_on</i>
                        {event.location}
                      </span>
                      <span>
                        <i className="material-icons">schedule</i>
                        {event.schedule}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bottom">
                  <span className="available">
                    <i className="material-icons">check_circle</i>
                    Available
                  </span>
                  <span className="price">{event.price}</span>
                  <a href="#" className="btn-ticket">
                    Buy Tickets
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="col-12 text-center mt-4">
            <a href="#" className="btn-view-more">
              View more events <i className="material-icons">arrow_forward</i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}