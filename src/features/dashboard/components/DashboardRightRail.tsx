import { Link } from "react-router-dom";
import { dashboardFollowerImages } from "../config/dashboardData";

export default function DashboardRightRail() {
  return (
    <div className="ud-rhs">
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
