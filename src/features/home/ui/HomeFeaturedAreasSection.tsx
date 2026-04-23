export default function HomeFeaturedAreasSection() {
  return (
    <section className="chao-areas">
      <div className="container">
        <div className="text-center mb-4">
          <h2>Featured Areas</h2>
        </div>

        <div className="row">
          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/bay.jpg" alt="Bay Area" />
              <div className="overlay">Bay Area</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/chicago.jpg" alt="Chicago" />
              <div className="overlay">Chicago</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/dallas.jpg" alt="Dallas" />
              <div className="overlay">Dallas</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/la.jpg" alt="Los Angeles" />
              <div className="overlay">Los Angeles</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/nj.jpg" alt="New Jersey" />
              <div className="overlay">New Jersey</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/ny.jpg" alt="New York" />
              <div className="overlay">New York</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/miami.jpg" alt="Miami" />
              <div className="overlay">Miami</div>
            </div>
          </div>

          <div className="col-md-3 col-6 mb-3">
            <div className="area-card">
              <img src="/template-17/images/areas/toronto.jpg" alt="Toronto" />
              <div className="overlay">Toronto</div>
            </div>
          </div>
        </div>

        <div className="row mt-4 area-list">
          <div className="col-md-4">
            <ul>
              <li>Atlanta Metro Area</li>
              <li>Boston Metro Area</li>
            </ul>
          </div>

          <div className="col-md-4">
            <ul>
              <li>Austin Metro Area</li>
              <li>Calgary Metro Area</li>
            </ul>
          </div>

          <div className="col-md-4">
            <ul>
              <li>Baltimore Metro Area</li>
              <li>Cincinnati Metro Area</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="#" className="view-more-btn">View More →</a>
        </div>
      </div>
    </section>
  );
}