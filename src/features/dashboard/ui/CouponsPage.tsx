import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import DashboardTabs from "../components/DashboardTabs";
import type { DashboardTabItem } from "../components/DashboardTabs";
import { couponAccessMembers, dashboardCoupons } from "../mock/dashboardMockData";

const couponTabs: DashboardTabItem[] = [
  { id: "coupon", label: "All Coupon Details" },
  { id: "couponacc", label: "Coupon used members" },
];

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState("coupon");

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Coupons</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Coupons"
            actionLabel="Add new Coupon"
            actionTo="/add-coupons"
          />

          <DashboardTabs tabs={couponTabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="tab-content">
            <div
              id="coupon"
              className={`container tab-pane ${activeTab === "coupon" ? "active" : "fade"}`.trim()}
            >
              <div className="db-coupons">
                <ul className="row">
                  {dashboardCoupons.map((coupon) => (
                    <li key={coupon.id}>
                      <div className="db-coup-lhs">
                        <div className="coup-box">
                          <div className="coup-box-1 row">
                            <div className="s1 row">
                              <div className="lhs">
                                <img src={coupon.image} alt={coupon.title} loading="lazy" />
                              </div>
                              <div className="rhs">
                                <h4>{coupon.title}</h4>
                              </div>
                            </div>
                            <div className="s2 row">
                              <div className="lhs">
                                <span>Expires</span>
                                <h6>{coupon.expiresAt}</h6>
                                <Link to="/coupons">Terms &amp; Conditions Apply</Link>
                              </div>
                              <div className="rhs">
                                <Link to="/coupons">
                                  <span className="get-coup-btn get-coup-act">Get coupon</span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="db-coup-rhs">
                        <h5>
                          <b>{coupon.accessCount}</b>
                          <span>Members access this coupon</span>
                        </h5>
                        <ol>
                          <li>
                            <b>Start date:</b> {coupon.startDate}
                          </li>
                          <li>
                            <b>Expiry date:</b> {coupon.expiryDate}
                          </li>
                          <li>
                            <b>Coupon code:</b> {coupon.couponCode}
                          </li>
                          <li>
                            <Link to={coupon.editPath}>Edit</Link>
                            <a
                              href="#!"
                              onClick={(event) => event.preventDefault()}
                            >
                              Delete
                            </a>
                          </li>
                        </ol>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              id="couponacc"
              className={`container tab-pane ${activeTab === "couponacc" ? "active" : "fade"}`.trim()}
            >
              <table className="responsive-table bordered">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Coupon name</th>
                    <th>Profile</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {couponAccessMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.id}</td>
                      <td>
                        <span>{member.dateLabel}</span>
                      </td>
                      <td>{member.email}</td>
                      <td>{member.phone}</td>
                      <td>{member.couponName}</td>
                      <td>
                        <Link to={member.profilePath} target="_blank" className="db-list-edit">
                          View
                        </Link>
                      </td>
                      <td>
                        <a
                          href="#!"
                          className="db-list-edit"
                          onClick={(event) => event.preventDefault()}
                        >
                          Delete
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
