import { Link } from "react-router-dom";

export default function HomeHeader() {
  return (
    <div className="hom-top">
      <div className="container">
        <div className="row">
          <div className="hom-nav">
            <a href="/home" className="top-log">
              <img
                src="/template-17/images/home/logo-white.png"
                alt=""
                loading="eager"
                className="ic-logo"
              />
            </a>

            <div className="menu">
              <h4>Explore</h4>
            </div>

            <div className="pop-menu"></div>

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

            <ul className="bl">
              <li>
                <a href="/pricing-details">Add business</a>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
              <li>
                <Link to="/login?login=register">Create an account</Link>
              </li>
            </ul>

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
                    <li><a href="/pricing-details">Add business</a></li>
                    <li><Link to="/login">Sign in</Link></li>
                    <li><Link to="/login?login=register">Create an account</Link></li>
                  </ul>
                </div>

                <div className="mv-cate">
                  <h4>All Categories</h4>
                  <ul>
                    <li><a href="/all-listing">Spa and Facial</a></li>
                    <li><a href="/all-listing">Wedding halls</a></li>
                    <li><a href="/all-listing">Automobiles</a></li>
                    <li><a href="/all-listing">Restaurants</a></li>
                    <li><a href="/all-listing">Technology</a></li>
                    <li><a href="/all-listing">Pet shop</a></li>
                    <li><a href="/all-listing">Real Estate</a></li>
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