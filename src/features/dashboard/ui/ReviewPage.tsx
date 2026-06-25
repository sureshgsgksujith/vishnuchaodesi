import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardTabs from "../components/DashboardTabs";
import type { DashboardTabItem } from "../components/DashboardTabs";
import { getMyListings, type ListingReview, type ListingSummary } from "../api/listingsApi";
import { sentReviews } from "../mock/dashboardMockData";

const reviewTabs: DashboardTabItem[] = [
  { id: "received", label: "All Received Reviews" },
  { id: "sent", label: "All Sent Reviews" },
];

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState("received");
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    getMyListings("", 1, 1000)
      .then((result) => {
        if (isActive) {
          setListings(result.items || []);
        }
      })
      .catch(() => {
        if (isActive) {
          setListings([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const receivedReviews = useMemo(
    () => listings.flatMap((listing) =>
      (listing.reviews || []).map((review) => ({
        listing,
        review,
      })),
    ),
    [listings],
  );

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
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9}>Loading reviews...</td>
                    </tr>
                  ) : receivedReviews.length ? (
                    receivedReviews.map(({ listing, review }, index) => (
                      <tr key={`${listing.id}-${review.id}`}>
                        <td>{index + 1}</td>
                        <td>{listing.title}</td>
                        <td>{review.reviewerName || "User"}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>{listing.city || "-"}</td>
                        <td>
                          <ReviewStars rating={review.rating} />
                        </td>
                        <td>{review.reviewMessage || "-"}</td>
                        <td>
                          <a
                            href="#!"
                            onClick={(event) => event.preventDefault()}
                          >
                            <span className="db-list-edit">Delete</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No received reviews found.</td>
                    </tr>
                  )}
                </tbody>
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
                        <ReviewStars rating={review.rating} />
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

function ReviewStars({ rating }: { rating: ListingReview["rating"] }) {
  return (
    <label className="rat">
      {Array.from({ length: rating }).map((_, index) => (
        <i key={index} className="material-icons">
          star
        </i>
      ))}
    </label>
  );
}
