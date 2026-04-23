export default function HomeBuySellSection() {
  return (
    <section className="chao-buysell">
      <div className="container">
        <div className="text-center mb-4">
          <h2>Buy/Sell</h2>
          <p className="sub-title">
            Experience a revolutionary journey in the realm of purchasing and vending!
          </p>
        </div>

        <div className="row align-items-center">
          <div className="col-md-6">
            <h4>Have anything to sell?</h4>

            <a href="#" className="btn btn-danger mb-3">Post your ad</a>

            <h6>Popular Searches</h6>
            <div className="tags">
              <span>Furniture</span>
              <span>House Clearance</span>
              <span>Baby &amp; Kids</span>
              <span>Computers</span>
              <span>Mobiles</span>
            </div>

            <h6 className="mt-4">Latest Ads</h6>

            <div className="ad-item">
              <img src="/template-17/images/chao-buysell/sample1.jpg" alt="York HVAC Services" />
              <div>
                <h6>York HVAC Services</h6>
                <small>📍 New York • 2 days ago</small>
                <p>Home Appliances</p>
              </div>
            </div>

            <div className="ad-item">
              <img src="/template-17/images/chao-buysell/sample2.jpg" alt="United Cool Air HVAC" />
              <div>
                <h6>United Cool Air HVAC</h6>
                <small>📍 Brooklyn • 3 weeks ago</small>
                <p>Home Appliances</p>
              </div>
            </div>

            <a href="#" className="view-more">View More →</a>
          </div>

          <div className="col-md-6 text-center">
            <img
              src="/template-17/images/home/buysell.png.jpg"
              className="img-fluid buysell-img"
              alt="Buy Sell"
            />
          </div>
        </div>
      </div>
    </section>
  );
}