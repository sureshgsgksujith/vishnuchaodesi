import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  deleteListing,
  getListingApiErrorMessage,
  getMyListings,
  type ListingSummary,
} from "../api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

const PAGE_SIZE = 10;

export default function AllListingsPage() {
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  useEffect(() => {
    loadListings();
  }, [search, page]);

  async function loadListings() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyListings(search, page, PAGE_SIZE);
      setItems(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleDelete(listingId: number) {
    const confirmed = window.confirm("Are you sure you want to delete this listing?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(listingId);
      setErrorMessage("");

      await deleteListing(listingId);

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== listingId)
      );
      setTotalCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs">
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>

        <span className="udb-inst">All Listings</span>

        {errorMessage ? (
          <div className="alert alert-danger">
            {errorMessage}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={loadListings}
              style={{ marginLeft: 12 }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="ud-cen-s2 dashboard-listings-panel">
          <div className="dashboard-listings-toolbar">
            <h2>Listing Details</h2>

            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
            />

            <Link to="/dashboard/listings/start" className="db-tit-btn">
              Add New Listing
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table bordered dashboard-listings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Listing Name</th>
                  <th>Rating</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Preview</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8}>Loading listings...</td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(page - 1) * PAGE_SIZE + index + 1}</td>

                      <td>
                        <div className="dashboard-listing-title-cell">
                          <img
                            src={resolveListingImageUrl(item.primaryImageUrl)}
                            alt={item.title}
                            onError={setFallbackListingImage}
                          />

                          <div>
                            <strong>{item.title}</strong>
                            <span>{formatDate(item.createdAt)}</span>
                            {item.rejectionReason ? (
                              <small>{item.rejectionReason}</small>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="db-list-rat">
                          {item.rating ?? 0}
                        </span>
                      </td>

                      <td>
                        <span className="db-list-rat">
                          {item.views ?? 0}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(item.status)}>
                          {item.status || "Pending"}
                        </span>
                        {item.rejectionCount ? (
                          <em className="dashboard-listing-reject-count">
                            {item.rejectionCount}/3
                          </em>
                        ) : null}
                      </td>

                      <td>
                        {item.canEdit === false ? (
                          <span className="db-list-edit dashboard-listing-disabled">
                            Locked
                          </span>
                        ) : (
                          <Link
                            to={`/dashboard/listings/${item.id}/edit`}
                            className="db-list-edit"
                          >
                            Edit
                          </Link>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="db-list-edit db-list-edit-button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>

                      <td>
                        <Link
                          to={`/dashboard/listings/${item.id}/preview`}
                          className="db-list-edit"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No listings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dashboard-listings-pagination">
            <span>{totalCount} listings</span>
            <div>
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                Previous
              </button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") {
    return "db-list-ststus dashboard-listing-approved";
  }

  if (normalized === "rejected") {
    return "db-list-ststus dashboard-listing-rejected";
  }

  return "db-list-ststus dashboard-listing-waiting";
}
