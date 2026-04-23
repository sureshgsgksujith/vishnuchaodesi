import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardTabs from "../components/DashboardTabs";
import type { DashboardTabItem } from "../components/DashboardTabs";
import { sentReviews } from "../mock/dashboardMockData";

const reviewTabs: DashboardTabItem[] = [
  { id: "received", label: "All Received Reviews" },
  { id: "sent", label: "All Sent Reviews" },
];

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState("received");

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Reviews</span>

        <div className="ud-cen-s2">
          <h2>All Listings - Received review details</h2>
          <DashboardTabs tabs={reviewTabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="tab-content">
            <div
              id="received"
              className={`container tab-pane ${activeTab === "received" ? "active" : "fade"}`.trim()}
            >
              <br />
              <table className="responsive-table bordered">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Listing Name</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Ratings</th>
                    <th>Message</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>

            <div
              id="sent"
              className={`container tab-pane ${activeTab === "sent" ? "active" : "fade"}`.trim()}
            >
              <br />
              <table className="responsive-table bordered">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Listing Name</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Ratings</th>
                    <th>Message</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {sentReviews.map((review) => (
                    <tr key={review.id}>
                      <td>{review.id}</td>
                      <td>{review.listingName}</td>
                      <td>{review.user}</td>
                      <td>{review.email}</td>
                      <td>{review.phone}</td>
                      <td>{review.city}</td>
                      <td>
                        <label className="rat">
                          {Array.from({ length: review.rating }).map((_, index) => (
                            <i key={index} className="material-icons">
                              star
                            </i>
                          ))}
                        </label>
                      </td>
                      <td>{review.message}</td>
                      <td>
                        <a
                          href="#!"
                          onClick={(event) => event.preventDefault()}
                        >
                          <span className="db-list-edit">Delete</span>
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
