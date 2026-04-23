export default function HomeTravelCarsSection() {
  return (
    <section className="chao-travel-car">
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <div className="travel-card">
              <h3>Travel Quotes</h3>
              <p>Get the best flight deals &amp; travel agents in US/Canada</p>

              <div className="travel-block">
                <h5>Make your choice now!</h5>
                <ul>
                  <li>Pick your airlines to India</li>
                  <li>Find the Best Airfare Deal</li>
                </ul>
              </div>

              <div className="travel-block">
                <h5>Your travel made simple!</h5>
                <ul>
                  <li>Find the best travel agent in your city</li>
                  <li>Find your travel companion</li>
                </ul>
              </div>

              <a href="#" className="btn-red">Get Quote</a>
            </div>
          </div>

          <div className="col-md-6">
            <div className="travelcar-card">
              <h3>Cars</h3>
              <p>The Best Place to Find Used Cars!</p>

              <div className="car-tags">
                <span>Search Used Cars</span>
                <span>Sell your car</span>
                <span>Toyota</span>
                <span>Honda</span>
              </div>

              <div id="carCarousel" className="carousel slide" data-bs-ride="carousel">
                <div className="carousel-inner">
                  <div className="carousel-item active">
                    <div className="car-item">
                      <h5>Used Toyota Camry</h5>
                      <p>New York, NY</p>
                      <span>$1200</span>
                      <a href="#">Contact</a>
                    </div>
                  </div>

                  <div className="carousel-item">
                    <div className="car-item">
                      <h5>Honda Civic 2018</h5>
                      <p>New Jersey</p>
                      <span>$9000</span>
                      <a href="#">Contact</a>
                    </div>
                  </div>
                </div>

                <button
                  className="carousel-control-prev"
                  type="button"
                  data-bs-target="#carCarousel"
                  data-bs-slide="prev"
                >
                  <span className="carousel-control-prev-icon"></span>
                </button>

                <button
                  className="carousel-control-next"
                  type="button"
                  data-bs-target="#carCarousel"
                  data-bs-slide="next"
                >
                  <span className="carousel-control-next-icon"></span>
                </button>
              </div>

              <p className="sell-text">
                Want to sell your car? <a href="#">Post an ad</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}