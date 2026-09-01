import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import {
  getListingCategoryTree,
  type ListingCategoryOption,
} from "../../dashboard/api/listingCategoriesApi";
import { fallbackListingCategoryTree } from "../../dashboard/config/listingCategoryTree";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";
import "../styles/homeFooter.css";

const classifiedCategoryNames = new Set([
  "Real Estate",
  "Restaurants & Food",
  "Vehicles",
  "Care Services",
  "Events & Tickets",
  "Roommates & Rentals",
  "Jobs",
  "Electronics & Appliances",
  "Pets & Animals",
]);

const fallbackFooterCategories = fallbackListingCategoryTree.filter((category) =>
  classifiedCategoryNames.has(category.name),
);

const yellowPageCategories = fallbackListingCategoryTree.map((category) => ({
  label: category.name,
  href: `/all-listing?category=${category.slug}`,
}));

let cachedLocalServiceCategories: AllServiceCategoryOption[] | null = null;
let cachedClassifiedCategories: ListingCategoryOption[] | null = null;
let localServiceCategoriesRequest: Promise<AllServiceCategoryOption[]> | null = null;
let classifiedCategoriesRequest: Promise<ListingCategoryOption[]> | null = null;
let localServiceCategoriesCachedAt = 0;
let classifiedCategoriesCachedAt = 0;
const FOOTER_CACHE_TTL_MS = 30 * 60 * 1000;

function loadFooterLocalServiceCategories() {
  if (cachedLocalServiceCategories && Date.now() - localServiceCategoriesCachedAt < FOOTER_CACHE_TTL_MS) {
    return Promise.resolve(cachedLocalServiceCategories);
  }
  localServiceCategoriesRequest ??= getAllServiceDirectoryTree()
    .then((items) => {
      cachedLocalServiceCategories = items || [];
      localServiceCategoriesCachedAt = Date.now();
      return cachedLocalServiceCategories;
    })
    .catch(() => cachedLocalServiceCategories || [])
    .finally(() => { localServiceCategoriesRequest = null; });
  return localServiceCategoriesRequest;
}

function loadFooterClassifiedCategories() {
  if (cachedClassifiedCategories && Date.now() - classifiedCategoriesCachedAt < FOOTER_CACHE_TTL_MS) {
    return Promise.resolve(cachedClassifiedCategories);
  }
  classifiedCategoriesRequest ??= getListingCategoryTree()
    .then((items) => {
      cachedClassifiedCategories = (items || []).filter((category) => classifiedCategoryNames.has(category.name));
      classifiedCategoriesCachedAt = Date.now();
      return cachedClassifiedCategories;
    })
    .catch(() => cachedClassifiedCategories || fallbackFooterCategories)
    .finally(() => { classifiedCategoriesRequest = null; });
  return classifiedCategoriesRequest;
}

export default function HomeFooterSection() {
  const { activeCity } = useHomeSelectedLocation();
  const [localServiceCategories, setLocalServiceCategories] = useState<AllServiceCategoryOption[]>(cachedLocalServiceCategories || []);
  const [classifiedCategories, setClassifiedCategories] = useState<ListingCategoryOption[]>(cachedClassifiedCategories || fallbackFooterCategories);

  useEffect(() => {
    let isActive = true;

    void loadFooterLocalServiceCategories().then((items) => {
      if (isActive && items.length) setLocalServiceCategories(items);
    });
    void loadFooterClassifiedCategories().then((items) => {
      if (isActive && items.length) setClassifiedCategories(items);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      <section className="wed-hom-footer">
        <div className="container">
          <div className="row foot-supp">
            <h2>
              <span>Free support:</span> +1 248 430 4014 &nbsp;&nbsp;|&nbsp;&nbsp;
              <span>Email:</span>
              info@chaodesi.com
            </h2>
          </div>

          <div className="row wed-foot-link">
            <div className="col-md-4 foot-tc-mar-t-o">
              <h4>Yellow Pages Categories</h4>
              <ul>
                {yellowPageCategories.map((category) => (
                  <li key={category.href}>
                    <Link to={category.href}>{category.label}</Link>
                  </li>
                ))}
                <li><Link className="footer-category-all-link" to="/all-listing">View all Yellow Pages</Link></li>
              </ul>
            </div>

            <div className="col-md-4">
              <h4>Local Services Categories</h4>
              <ul>
                {localServiceCategories.map((category) => (
                  <li key={category.id}>
                    <Link to={buildLocalServiceCategoryHref(category, activeCity)}>
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li><Link className="footer-category-all-link" to="/all-services">View all Local Services</Link></li>
              </ul>
            </div>

            <div className="col-md-4">
              <h4>Classified Categories</h4>
              <ul>
                {classifiedCategories.map((category) => (
                  <li key={category.id}>
                    <Link to={buildClassifiedCategoryHref(category, activeCity)}>
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li><Link className="footer-category-all-link" to="/classifieds/ads-all">View all Classifieds</Link></li>
              </ul>
            </div>
          </div>

          <div className="row wed-foot-link-1">
            <div className="col-md-4">
              <h4>Get In Touch</h4>
              <p>Address: 39555 Orchard Hill Place, Suite 203, Novi, MI 48375.</p>
              <p>
                Phone:
                <a href="tel:+12484304014">+1 248 430 4014</a>
              </p>
              <p>
                Email:
                <a href="mailto:info@chaodesi.com">info@chaodesi.com</a>
              </p>
            </div>

            <div className="col-md-4 fot-app">
              <h4>DOWNLOAD OUR FREE MOBILE APPS</h4>
              <ul>
                <li>
                  <a href="">
                    <img src="/template-17/images/gstore.png" alt="" loading="lazy" />
                  </a>
                </li>
                <li>
                  <a href="">
                    <img src="/template-17/images/astore.png" alt="" loading="lazy" />
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-md-4 fot-soc">
              <h4>SOCIAL MEDIA</h4>
              <ul>
                <li>
                  <a target="_blank" href="https://www.linkedin.com/company/chaodesi/" rel="noreferrer">
                    <img src="/template-17/images/social/1.png" alt="" loading="lazy" />
                  </a>
                </li>
                <li>
                  <a target="_blank" href="https://twitter.com/" rel="noreferrer">
                    <img src="/template-17/images/social/2.png" alt="" loading="lazy" />
                  </a>
                </li>
                <li>
                  <a target="_blank" href="https://www.facebook.com/" rel="noreferrer">
                    <img src="/template-17/images/social/3.png" alt="" loading="lazy" />
                  </a>
                </li>
                <li>
                  <a target="_blank" href="https://www.youtube.com/@chaodesi860" rel="noreferrer">
                    <img src="/template-17/images/social/5.png" alt="" loading="lazy" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <nav className="footer-policy-links" aria-label="Help, support, and policies">
            <Link to="/about">About us</Link>
            <Link to="/contact-us">Contact us</Link>
            <Link to="/terms-of-use">Terms &amp; Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/advertise-with-us">Advertise with us</Link>
            <Link to="/copyright-policy">Copyright Policy</Link>
          </nav>

          <div className="row foot-count">
            <ul>
              <li><a target="_blank" href="http://www.chaodesi.usa" rel="noreferrer">USA</a></li>
              <li><a target="_blank" href="http://www.chaodesi.in" rel="noreferrer">India</a></li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="cr">
          <div className="container">
            <div className="row">
              <p>
                Copyright © 2025
                <a href="https://dev.chaodesi.com/" target="_blank" rel="noreferrer">   ChaoDesi</a>.
                Product of   {"     "}
                     <a href="https://symploreus.com/" target="_blank" rel="noreferrer">   Symplore INC</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fqui-menu">
        <ul>
          <li>
            <span className="mob-me-ic mob-me-fot">
              <i>&nbsp;</i>
              <i>&nbsp;</i>
              <i>&nbsp;</i>Menu
            </span>
          </li>
          <li>
            <a href="/home">
              <img src="/template-17/images/icon/home.png" alt="Home" />
              Home
            </a>
          </li>
          <li>
            <span className="mob-sear">
              <img src="/template-17/images/icon/search1.png" alt="Search" />
              Search
            </span>
          </li>
          <li>
            <a href="/all-services" className="act">
              <img src="/template-17/images/icon/shop.png" alt="All Services" />
              All Services
            </a>
          </li>
          <li>
            <a href="/classifieds/index">
              <img src="/template-17/images/icon/ads.png" alt="Classifieds" />
              Classifieds
            </a>
          </li>
          <li>
            <a href="/service-experts/index.html">
              <img src="/template-17/images/icon/expert.png" alt="Service Experts" />
              Service Experts
            </a>
          </li>
          <li>
            <a href="/jobs/index.html">
              <img src="/template-17/jobs/images/icon/employee.png" alt="Jobs" />
              Jobs
            </a>
          </li>
          <li>
            <a href="/events">
              <img src="/template-17/images/icon/calendar.png" alt="Events" />
              Events
            </a>
          </li>
          <li>
            <a href="/products">
              <img src="/template-17/images/icon/cart.png" alt="Products" />
              Products
            </a>
          </li>
          <li>
            <a href="/coupons">
              <img src="/template-17/images/icon/coupons.png" alt="Coupons" />
              Coupons
            </a>
          </li>
          <li>
            <a href="/blog-posts">
              <img src="/template-17/images/icon/blog1.png" alt="Blogs" />
              Blogs
            </a>
          </li>
          <li>
            <a href="/community">
              <img src="/template-17/images/icon/11.png" alt="Community" />
              Community
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}

function buildLocalServiceCategoryHref(category: AllServiceCategoryOption, city: string) {
  const params = new URLSearchParams({
    category: category.name,
    categoryId: String(category.id),
  });

  if (city) params.set("city", city);
  return `/all-services-detailed?${params.toString()}`;
}

function buildClassifiedCategoryHref(category: ListingCategoryOption, city: string) {
  const params = new URLSearchParams({ category: category.name });
  if (city) params.set("city", city);
  return `/classifieds/ads-all?${params.toString()}`;
}
