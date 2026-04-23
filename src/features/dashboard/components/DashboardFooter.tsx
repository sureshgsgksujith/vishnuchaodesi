import { Link } from "react-router-dom";
import {
  dashboardFooterCountries,
  dashboardHelpLinks,
  dashboardPopularTags,
  dashboardTopCategories,
  dashboardTrendingCategories,
} from "../config/dashboardData";

type DashboardFooterProps = {
  onOpenSupport: () => void;
  onOpenMobileMenu: () => void;
};

export default function DashboardFooter({
  onOpenSupport,
  onOpenMobileMenu,
}: DashboardFooterProps) {
  return (
    <>
      <section className="wed-hom-footer">
        <div className="container">
          <div className="row foot-supp">
            <h2>
              <span>Free support:</span> +01 5426 24400 &nbsp;&nbsp;|&nbsp;&nbsp;
              <span>Email:</span> info@chaodesi.com
            </h2>
          </div>

          <div className="row wed-foot-link">
            <div className="col-md-4 foot-tc-mar-t-o">
              <h4>Top Category</h4>
              <ul>
                {dashboardTopCategories.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-md-4">
              <h4>Trending Category</h4>
              <ul>
                {dashboardTrendingCategories.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-md-4">
              <h4>HELP &amp; SUPPORT</h4>
              <ul>
                {dashboardHelpLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="row wed-foot-link-pop">
            <div className="col-md-12">
              <h4>Popular Tags</h4>
              <ul>
                {dashboardPopularTags.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    <Link to={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="row wed-foot-link-1">
            <div className="col-md-4">
              <h4>Get In Touch</h4>
              <p>
                Address: 28800 Orchard Lake Road, Suite 180 Farmington Hills,
                U.S.A.
              </p>
              <p>
                Phone: <a href="tel:+01542624400">+01 5426 24400</a>
              </p>
              <p>
                Email: <a href="mailto:info@chaodesi.com">info@chaodesi.com</a>
              </p>
            </div>

            <div className="col-md-4 fot-app">
              <h4>DOWNLOAD OUR FREE MOBILE APPS</h4>
              <ul>
                <li>
                  <a href="#">
                    <img
                      src="/template-17/images/gstore.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
                <li>
                  <a href="#">
                    <img
                      src="/template-17/images/astore.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-md-4 fot-soc">
              <h4>SOCIAL MEDIA</h4>
              <ul>
                <li>
                  <a target="_blank" rel="noreferrer" href="#">
                    <img
                      src="/template-17/images/social/1.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
                <li>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://twitter.com/"
                  >
                    <img
                      src="/template-17/images/social/2.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
                <li>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.facebook.com/"
                  >
                    <img
                      src="/template-17/images/social/3.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="#">
                    <img
                      src="/template-17/images/social/4.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="#">
                    <img
                      src="/template-17/images/social/5.png"
                      alt=""
                      loading="lazy"
                    />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="row foot-count">
            <ul>
              {dashboardFooterCountries.map((item) => (
                <li key={item.label}>
                  <a target="_blank" rel="noreferrer" href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="cr">
          <div className="container">
            <div className="row">
              <p>
                Copyright © 2025{" "}
                <a
                  href="https://chaodesi.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ChaoDesi
                </a>
                . Proudly powered by{" "}
                <a
                  href="https://chaodesi.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Symplore
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fqui-menu">
        <ul>
          <li>
            <span
              className="mob-me-ic mob-me-fot"
              onClick={onOpenMobileMenu}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenMobileMenu();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i>&nbsp;</i>
              <i>&nbsp;</i>
              <i>&nbsp;</i>
              Menu
            </span>
          </li>
          <li>
            <Link to="/home">
              <img src="/template-17/images/icon/home.png" alt="Home" />
              Home
            </Link>
          </li>
          <li>
            <span className="mob-sear">
              <img src="/template-17/images/icon/search1.png" alt="Search" />
              Search
            </span>
          </li>
          <li>
            <Link to="/all-category" className="act">
              <img src="/template-17/images/icon/shop.png" alt="All Services" />
              All Services
            </Link>
          </li>
          <li>
            <a href="/template-17/classifieds/index.html">
              <img src="/template-17/images/icon/ads.png" alt="Classifieds" />
              Classifieds
            </a>
          </li>
          <li>
            <a href="/template-17/service-experts/index.html">
              <img
                src="/template-17/images/icon/expert.png"
                alt="Service Experts"
              />
              Service Experts
            </a>
          </li>
          <li>
            <a href="/template-17/jobs/index.html">
              <img
                src="/template-17/jobs/images/icon/employee.png"
                alt="Jobs"
              />
              Jobs
            </a>
          </li>
          <li>
            <Link to="/events">
              <img src="/template-17/images/icon/calendar.png" alt="Events" />
              Events
            </Link>
          </li>
          <li>
            <Link to="/products">
              <img src="/template-17/images/icon/cart.png" alt="Products" />
              Products
            </Link>
          </li>
          <li>
            <Link to="/coupons">
              <img src="/template-17/images/icon/coupons.png" alt="Coupons" />
              Coupons
            </Link>
          </li>
          <li>
            <Link to="/blog-posts">
              <img src="/template-17/images/icon/blog1.png" alt="Blogs" />
              Blogs
            </Link>
          </li>
          <li>
            <Link to="/community">
              <img src="/template-17/images/icon/11.png" alt="Community" />
              Community
            </Link>
          </li>
          <li>
            <span
              className="btn-ser-need-ani"
              onClick={onOpenSupport}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenSupport();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <img src="/template-17/images/icon/how1.png" alt="Support" />
              Support
            </span>
          </li>
        </ul>
      </div>
    </>
  );
}
