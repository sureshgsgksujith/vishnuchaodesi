import { useState } from "react";
import { Link } from "react-router-dom";
import {
  dashboardAdminNotifications,
  dashboardFollowerImages,
} from "../config/dashboardData";

type ListingStatus = {
  id: number;
  name: string;
  isOpen: boolean;
};

const initialListingStatuses: ListingStatus[] = [
  { id: 511, name: "ij", isOpen: true },
  { id: 510, name: "listing name 2", isOpen: false },
  { id: 509, name: "AMD Stanford University", isOpen: false },
  { id: 506, name: "MSI Hospitals in Melborn", isOpen: false },
  { id: 394, name: "Apolla Hospitals in NeYork", isOpen: true },
];

export default function DashboardRightRail() {
  const [listingStatuses, setListingStatuses] =
    useState<ListingStatus[]>(initialListingStatuses);

  const handleToggleListing = (id: number) => {
    setListingStatuses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isOpen: !item.isOpen } : item
      )
    );
  };

  return (
    <div className="ud-rhs">
      <div className="ud-rhs-promo">
        <h3>Promote my business</h3>
        <p>Your listing show on the top of the respective category page</p>
        <Link to="/promote-business">Start now</Link>
      </div>

      <div className="ud-rhs-poin">
        <div className="ud-rhs-poin1">
          <h4>Your points</h4>
          <span className="count1">0</span>
        </div>
        <div className="ud-rhs-poin2">
          <h3>Earn more credit points</h3>
          <p>
            Use this poins to promote your listing.{" "}
            <Link to="/buy-points">Click here</Link> for demo
          </p>
          <Link to="/buy-points" className="cta">
            Buy Points
          </Link>
        </div>
      </div>

      <div className="ud-rhs-pay">
        <div className="ud-rhs-pay-inn">
          <h3>Payment Information</h3>
          <ul>
            <li>
              <b>Plan name :</b> Premium Plus
            </li>
            <li>
              <b>Start date :</b> 17, Aug 2022
            </li>
            <li>
              <b>Expiry date :</b> 17, Aug 2032
            </li>
            <li>
              <b>duration :</b> 10 year
            </li>
            <li>
              <b>Remaining Days:</b> 3532
            </li>
            <li>
              <span className="ud-stat-pay-btn">
                <b>Checkout cost :</b> $20
              </span>
            </li>
            <li>
              <span className="ud-stat-pay-btn">
                <b>Payment Status:</b> PENDING
              </span>
            </li>
          </ul>
          <Link to="/dashboard/payment" className="btn btn2">
            Pay Now
          </Link>
        </div>
      </div>

      <div className="ud-rhs-pay ud-rhs-status">
        <div className="ud-rhs-pay-inn">
          <h3>Listing open &amp; close status</h3>
          <ul>
            {listingStatuses.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="listing_open_close_switch custom-control-input"
                    id={`listing-${item.id}`}
                    checked={item.isOpen}
                    onChange={() => handleToggleListing(item.id)}
                  />
                  <label
                    className="custom-control-label"
                    htmlFor={`listing-${item.id}`}
                    title="Click here to update your listing status, Open or Closed."
                  >
                    &nbsp;
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ud-rhs-pay ud-rhs-repo">
        <div className="ud-rhs-pay-inn">
          <h3>Last week report</h3>
          <ul>
            <li>
              <span className="view">Enquiry</span>
              <span className="cout">00</span>
              <span className="name">Leads</span>
            </li>
            <li>
              <span className="view">Views</span>
              <span className="cout">00</span>
              <span className="name">Listing</span>
            </li>
            <li>
              <span className="view">Views</span>
              <span className="cout">00</span>
              <span className="name">Events</span>
            </li>
            <li>
              <span className="view">Views</span>
              <span className="cout">00</span>
              <span className="name">Blogs</span>
            </li>
            <li>
              <span className="view">Views</span>
              <span className="cout">00</span>
              <span className="name">Products</span>
            </li>
            <li>
              <span className="cout">00</span>
              <span className="name">Messages</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="ud-rhs-sec-1">
        <h4>Admin Notification</h4>
        <ul>
          {dashboardAdminNotifications.map((item) => (
            <li key={`${item.title}-${item.description}`}>
              <a target="_blank" href={item.href} rel="noreferrer">
                <h5>{item.title}</h5>
                <p>{item.description}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="ud-rhs-promo ud-rhs-promo-1">
        <h3>Community members</h3>
        <p>
          Follow your favorite business users and grow your online business now.
        </p>
        <Link to="/community">Community</Link>
      </div>

      <div className="ud-rhs-sec-3">
        <div className="list-mig-like">
          <div className="list-ri-peo-like">
            <h3>Who all are follow you</h3>
            <ul>
              {dashboardFollowerImages.map((image, index) => (
                <li key={`${image}-${index}`}>
                  <Link to="/profile" target="_blank">
                    <img src={image} alt="Follower" loading="lazy" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
