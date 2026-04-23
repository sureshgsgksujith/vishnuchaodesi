const quickLinks = [
  { title: "All Services", image: "/template-17/images/icon/shop.png" },
  { title: "Classified Listings", image: "/template-17/images/icon/ads.png" },
  { title: "Service Experts", image: "/template-17/images/icon/expert.png" },
  { title: "Jobs & Careers", image: "/template-17/images/icon/employee.png" },
  { title: "Travel & Tourism", image: "/template-17/images/places/icons/hot-air-balloon.png" },
  { title: "Latest News", image: "/template-17/images/icon/news.png" },
  { title: "Events & Activities", image: "/template-17/images/icon/calendar.png" },
  { title: "Products & Deals", image: "/template-17/images/icon/cart.png" },
  { title: "Offers & Coupons", image: "/template-17/images/icon/coupons.png" },
  { title: "Blogs & Insights", image: "/template-17/images/icon/blog1.png" },
];

const topCounts = [
  { title: "All Services", count: "120+", image: "/template-17/images/icon/listing.png" },
  { title: "Service Experts", count: "85+", image: "/template-17/images/icon/expert.png" },
  { title: "Jobs", count: "60+", image: "/template-17/images/icon/employee.png" },
  { title: "Products", count: "45+", image: "/template-17/images/icon/shop.png" },
  { title: "Events", count: "25+", image: "/template-17/images/icon/event.png" },
  { title: "Coupons", count: "30+", image: "/template-17/images/icon/coupons.png" },
  { title: "Blogs", count: "75+", image: "/template-17/images/icon/blog.png" },
  { title: "Community", count: "15+", image: "/template-17/images/icon/general.png" },
];

export default function HomeHeroSection() {
  return (
    <div
      className="hom-head"
      style={{ backgroundImage: "url(/template-17/images/chao-bg/bg-1.jpg)" }}
    >
      <div className="container">
        <div className="row">
          <div className="ban-tit">
            <h1>
              <b>
                Find your
                <span>
                  Local needs
                  <i></i>
                </span>
              </b>
              Restaurants, cafe&apos;s, and bars in New york
            </h1>
          </div>

          <div className="ban-search ban-sear-all">
            <form name="filter_form" id="filter_form" className="filter_form">
              <ul>
                <li className="sr-cate">
                  <select name="explor_select" id="explor_select" className="chosen-select">
                    <option value="1">All Services</option>
                    <option value="2">Service Experts</option>
                    <option value="3">Jobs</option>
                    <option value="4">Explore Travel</option>
                    <option value="5">News & Magazines</option>
                    <option value="6">Events</option>
                    <option value="7">Products</option>
                    <option value="8">Coupon & deals</option>
                    <option value="9">Blogs</option>
                  </select>
                </li>

                <li className="sr-cit">
                  <select id="city_check" name="city_check" className="chosen-select">
                    <option value="48025">Los Angeles</option>
                    <option value="48026">Chicago</option>
                    <option value="48027">Houston</option>
                    <option value="48028">Phoenix</option>
                    <option value="48024">New York City</option>
                    <option value="48029">Philadelphia</option>
                    <option value="48030">San Antonio</option>
                    <option value="48031">San Diego</option>
                    <option value="48032">Dallas</option>
                    <option value="48035">Illunois city</option>
                  </select>
                </li>

                <li className="sr-nor">
                  <select id="expert-select-search" name="expert-select-search" className="chosen-select">
                    <option value="">What are you looking for?</option>
                    <option value="Spa and Facial">Spa and Facial</option>
                    <option value="Wedding halls">Wedding halls</option>
                    <option value="Automobiles">Automobiles</option>
                    <option value="Restaurants">Restaurants</option>
                    <option value="Technology">Technology</option>
                    <option value="Pet shop">Pet shop</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Sports">Sports</option>
                    <option value="Hospitals">Hospitals</option>
                    <option value="Education">Education</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Electricals">Electricals</option>
                  </select>
                </li>

                <li className="sr-sea">
                  <input
                    type="text"
                    autoComplete="off"
                    id="select-search"
                    placeholder="What are you looking for?"
                    className="search-field"
                  />
                  <ul id="tser-res" className="tser-res tser-res1"></ul>
                </li>

                <li className="sr-btn">
                  <input
                    type="submit"
                    id="filter_submit"
                    name="filter_submit"
                    value="Search"
                    className="filter_submit"
                  />
                </li>
              </ul>
            </form>
          </div>

          <div className="ban-short-links">
            <ul>
              {quickLinks.map((item) => (
                <li key={item.title}>
                  <div>
                    <img src={item.image} alt={item.title} />
                    <h4>{item.title}</h4>
                    <a href="#" className="fclick"></a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="h2-ban-ql">
            <ul>
              {topCounts.map((item) => (
                <li key={item.title}>
                  <div>
                    <img src={item.image} alt={item.title} />
                    <h5>
                      <span className="count1">{item.count}</span>
                      {item.title}
                    </h5>
                    <a href="#"></a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}