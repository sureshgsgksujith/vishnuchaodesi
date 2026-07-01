import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLogoNavigationTarget } from "../../../shared/navigation/logoTarget";
import { categoryLinks, useExploreCategories } from "./exploreMenuData";
import "../styles/customerHeader.css";

export default function HomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoTarget = useLogoNavigationTarget();
  const [showExplore, setShowExplore] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchText, setSearchText] = useState("");
  const exploreCategories = useExploreCategories();

  const closeExplore = () => setShowExplore(false);
  const closeMobileMenu = () => setShowMobileMenu(false);
  const closeAllPopups = () => {
    closeExplore();
    closeMobileMenu();
  };
  const isServicePage = [
    "/local-services",
    "/local-services.html",
    "/all-services",
    "/all-services.html",
    "/all-services-detailed",
    "/all-services-detailed.html",
  ].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const addActionLabel = isServicePage ? "Add Service" : "Add business";

  function submitHeaderSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = searchText.trim();
    const params = new URLSearchParams();

    if (keyword) {
      params.set("search", keyword);
    }

    closeAllPopups();
    navigate(`/all-listing${params.toString() ? `?${params.toString()}` : ""}`);
  }

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
              <form name="filter_form" id="filter_form_top" className="filter_form" onSubmit={submitHeaderSearch}>
                <ul>
                  <li className="sr-sea">
                    <input
                      type="text"
                      autoComplete="off"
                      id="top-select-search"
                      placeholder="What are you looking for?"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                    />
                    <ul id="tser-res1" className="tser-res tser-res2"></ul>
                  </li>
                  <li className="sbtn">
                    <button type="submit" className="btn btn-success" id="top_filter_submit">
                      <i className="material-icons">&nbsp;</i>
                    </button>
                  </li>
                </ul>
              </form>
            </div>

            <div className="chaodesi-header-actions">
              <ul className="bl">
                <li>
                  <Link to="/login">{addActionLabel}</Link>
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
              <div className="mob-me-ic" onClick={() => setShowMobileMenu(true)} role="button" aria-label="Open menu" tabIndex={0}>
                <i className="material-icons">menu</i>
              </div>

              <div className={showMobileMenu ? "mob-me-all mobmenu-show" : "mob-me-all"}>
                <div className="mob-me-clo" onClick={closeMobileMenu} role="button" aria-label="Close menu" tabIndex={0}>
                  <i className="material-icons">close</i>
                </div>

                <form className="chaodesi-mobile-search" onSubmit={submitHeaderSearch}>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="What are you looking for?"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                  <button type="submit" aria-label="Search">
                    <i className="material-icons">search</i>
                  </button>
                </form>

                <div className="mv-bus">
                  <h4></h4>
                  <ul>
                    <li><Link to="/login" onClick={closeAllPopups}>{addActionLabel}</Link></li>
                    <li><Link to="/login" onClick={closeAllPopups}>Sign in</Link></li>
                    <li><Link to="/register" onClick={closeAllPopups}>Create an account</Link></li>
                  </ul>
                </div>

                <div className="mv-cate">
                  <h4>All Categories</h4>
                  <ul>
                    {exploreCategories.map((item) => (
                      <li key={item.label}><Link to={item.href} onClick={closeAllPopups}>{item.label}</Link></li>
                    ))}
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
