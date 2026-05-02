import { useEffect, useState } from "react";
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

export default function AllListingsPage() {
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyListings();
      setItems(result.items || []);
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
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
          <div className="alert alert-danger">{errorMessage}</div>
        ) : null}

        <div className="ud-cen-s2">
          <h2>Listing Details</h2>

          <Link to="/dashboard/listings/start" className="db-tit-btn">
            Add New Listing
          </Link>

          <div className="table-responsive">
            <table className="table bordered">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Listing Name</th>
                  <th>City</th>
                  <th>Address</th>
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
                    <td colSpan={10}>Loading listings...</td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>

                      <td>
                        <img
                          src={resolveListingImageUrl(item.primaryImageUrl)}
                          alt={item.title}
                          onError={setFallbackListingImage}
                        />

                        {item.title}

                        <span>{formatDate(item.createdAt)}</span>
                      </td>

                      <td>{item.city || "-"}</td>

                      <td>{item.locality || "-"}</td>

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
                        <span className="db-list-ststus">
                          {item.status || "Pending"}
                        </span>
                      </td>

                      <td>
                        <Link
                          to={`/dashboard/listings/${item.id}/edit`}
                          className="db-list-edit"
                        >
                          Edit
                        </Link>
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
                    <td colSpan={10}>No listings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
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