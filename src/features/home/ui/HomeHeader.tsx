import { useState } from "react";
import { Link } from "react-router-dom";
import { useLogoNavigationTarget } from "../../../shared/navigation/logoTarget";
import "../styles/customerHeader.css";

const categoryLinks = [
  { label: "All Services", href: "/all-category", icon: "/template-17/images/icon/shop.png" },
  { label: "Classified Ads", href: "/classifieds/index", icon: "/template-17/images/icon/ads.png" },
  { label: "Service Experts", href: "/service-experts/index", icon: "/template-17/images/icon/expert.png" },
  { label: "Jobs", href: "/jobs/index", icon: "/template-17/images/icon/employee.png" },
  { label: "Explore Travel", href: "/places/index", icon: "/template-17/images/places/icons/hot-air-balloon.png" },
  { label: "News & Magazines", href: "/news/index", icon: "/template-17/images/icon/news.png" },
  { label: "Events", href: "/events", icon: "/template-17/images/icon/calendar.png" },
  { label: "Products", href: "/products", icon: "/template-17/images/icon/cart.png" },
  { label: "Coupon & Deals", href: "/coupons", icon: "/template-17/images/icon/coupons.png" },
  { label: "Blogs", href: "/blog-posts", icon: "/template-17/images/icon/blog1.png" },
  { label: "Community", href: "/community", icon: "/template-17/images/icon/11.png" },
];

const exploreCategories = [
  { label: "Spa and Facial", href: "/all-listing", count: "05" },
  { label: "Wedding halls", href: "/all-listing", count: "00" },
  { label: "Automobiles", href: "/all-listing?category=vehicles", count: "03" },
  { label: "Restaurants", href: "/all-listing?category=restaurants-food", count: "03" },
  { label: "Technology", href: "/all-listing", count: "04" },
  { label: "Pet shop", href: "/all-listing", count: "00" },
  { label: "Real Estate", href: "/all-listing?category=real-estate", count: "03" },
  { label: "Sports", href: "/all-listing", count: "00" },
  { label: "Hospitals", href: "/all-listing", count: "06" },
  { label: "Education", href: "/all-listing", count: "06" },
  { label: "Transportation", href: "/all-listing", count: "05" },
  { label: "Electricals", href: "/all-listing", count: "04" },
];

export default function HomeHeader() {
  const logoTarget = useLogoNavigationTarget();
  const [showExplore, setShowExplore] = useState(false);

  const closeExplore = () => setShowExplore(false);

  return (
    <div className="hom-top chaodesi-customer-header">
      <div className="container">
        <div className="row">
          <div className="hom-nav db-open">
            <Link to={logoTarget} className="top-log">
              <img
                src="/template-17/images/home/logo-white.png"
                alt=""
                loading="eager"
                className="ic-logo"
              />
            </Link>

            <div
              className={showExplore ? "menu ani" : "menu"}
              onClick={() => setShowExplore((current) => !current)}
              style={{ cursor: "pointer" }}
            >
              <h4>Explore</h4>
            </div>

            <div
              className={showExplore ? "chaodesi-pop-menu ani" : "chaodesi-pop-menu"}
              aria-hidden={!showExplore}
            >
              <div className="chaodesi-pop-inner">
                <div className="chaodesi-pop-grid">
                  <div className="chaodesi-explore-modules">
                    <ul>
                      {categoryLinks.map((item) => (
                        <li key={item.label}>
                          <Link to={item.href} onClick={closeExplore}>
                            <img src={item.icon} alt={item.label} loading="lazy" />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="chaodesi-explore-categories">
                    <i className="material-icons chaodesi-explore-close" onClick={closeExplore}>close</i>
                    <h4>All Categories</h4>
                    <ul>
                      {exploreCategories.map((item) => (
                        <li key={item.label}>
                          <Link to={item.href} onClick={closeExplore}>
                            <span aria-hidden="true">&gt;</span>
                            <strong>{item.label}</strong>
                            <small>- {item.count}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="chaodesi-explore-cta">
                    <ul>
                      <li>
                        A few reasons you'll love Online Business Directory
                        <span>Call us on: +01 6214 6548</span>
                      </li>
                      <li>
                        <Link to="/post-your-ads" onClick={closeExplore}>
                          <i className="material-icons">font_download</i>
                          {" "}Advertise with us
                        </Link>
                      </li>
                      <li>
                        <Link to="/login" onClick={closeExplore}>
                          <i className="material-icons">store</i>
                          {" "}Add your business
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="top-ser">
              <form name="filter_form" id="filter_form_top" className="filter_form">
                <ul>
                  <li className="sr-sea">
                    <input
                      type="text"
                      autoComplete="off"
                      id="top-select-search"
                      placeholder="What are you looking for?"
                    />
                    <ul id="tser-res1" className="tser-res tser-res2"></ul>
                  </li>
                  <li className="sbtn">
                    <button type="button" className="btn btn-success" id="top_filter_submit">
                      <i className="material-icons">&nbsp;</i>
                    </button>
                  </li>
                </ul>
              </form>
            </div>

            <div className="chaodesi-header-actions">
              <ul className="bl">
                <li>
                  <Link to="/login">Add business</Link>
                </li>
                <li>
                  <Link to="/login">Sign in</Link>
                </li>
                <li>
                  <Link to="/register">Create an account</Link>
                </li>
              </ul>
            </div>

            <div className="mob-menu">
              <div className="mob-me-ic">
                <i className="material-icons">menu</i>
              </div>

              <div className="mob-me-all">
                <div className="mob-me-clo">
                  <i className="material-icons">close</i>
                </div>

                <div className="mv-bus">
                  <h4></h4>
                  <ul>
                    <li><Link to="/login">Add business</Link></li>
                    <li><Link to="/login">Sign in</Link></li>
                    <li><Link to="/register">Create an account</Link></li>
                  </ul>
                </div>

                <div className="mv-cate">
                  <h4>All Categories</h4>
                  <ul>
                    <li><a href="/all-listing">Spa and Facial</a></li>
                    <li><a href="/all-listing">Wedding halls</a></li>
                    <li><a href="/all-listing?category=vehicles">Automobiles</a></li>
                    <li><a href="/all-listing?category=restaurants-food">Restaurants</a></li>
                    <li><a href="/all-listing">Technology</a></li>
                    <li><a href="/all-listing">Pet shop</a></li>
                    <li><a href="/all-listing?category=real-estate">Real Estate</a></li>
                    <li><a href="/all-listing">Sports</a></li>
                    <li><a href="/all-listing">Hospitals</a></li>
                    <li><a href="/all-listing">Education</a></li>
                    <li><a href="/all-listing">Transportation</a></li>
                    <li><a href="/all-listing">Electricals</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>        
    </div>
  );
}
