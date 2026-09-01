import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  deleteListing,
  getListingApiErrorMessage,
  getMyListings,
  type ListingSummary,
} from "../api/listingsApi";
import {
  getEventDateLabel,
  getEventStartDate,
} from "../../listing/utils/eventListings";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

const PAGE_SIZE = 10;
export default function EventsPage() {
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const loadRequestId = useRef(0);

  const subCategoryOptions = useMemo(
    () => getUniqueOptions([...items.map((item) => item.subCategory), selectedSubCategory]),
    [items, selectedSubCategory],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSubCategory, selectedStatus]);

  useEffect(() => {
    loadEvents();
  }, [page, debouncedSearch, selectedSubCategory, selectedStatus]);

  async function loadEvents() {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyListings({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
        subCategory: selectedSubCategory,
        listingModule: "Events",
        status: selectedStatus,
        excludeCategoryName: "",
      });

      if (requestId !== loadRequestId.current) {
        return;
      }

      setItems(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (error) {
      if (requestId !== loadRequestId.current) {
        return;
      }

      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  function clearFilters() {
    setSearch("");
    setSelectedSubCategory("");
    setSelectedStatus("");
  }

  async function handleDelete(listingId: number) {
    const confirmed = window.confirm("Are you sure you want to delete this event?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(listingId);
      setErrorMessage("");

      await deleteListing(listingId);

      setItems((currentItems) => currentItems.filter((item) => item.id !== listingId));
      setTotalCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-listings-main">
      <div className="ud-cen dashboard-listings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">All Events</span>

        {isLoading ? <EventsLoadingOverlay /> : null}

        {errorMessage ? (
          <div className="alert alert-danger">
            {errorMessage}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={loadEvents}
              style={{ marginLeft: 12 }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="ud-cen-s2 dashboard-listings-panel">
          <div className="dashboard-listings-toolbar">
            <div className="dashboard-events-header-row">
              <div className="dashboard-listings-title-block">
                <h2>Event Details</h2>
                <span>{totalCount} matching events</span>
              </div>

              <Link to="/dashboard/listings/start" className="db-tit-btn">
                Add new Event
              </Link>
            </div>

            <div className="dashboard-listings-filters dashboard-events-filters">
              <label>
                <span>Event Type</span>
                <select
                  value={selectedSubCategory}
                  onChange={(event) => setSelectedSubCategory(event.target.value)}
                >
                  <option value="">All Event Types</option>
                  {subCategoryOptions.map((subCategory) => (
                    <option key={subCategory} value={subCategory}>
                      {subCategory}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Waiting for approval">Waiting for approval</option>
                  <option value="Active">Active</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>

              <label className="dashboard-listings-search-field">
                <span>Search</span>
                <input
                  type="search"
                  placeholder="Search events..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <button type="button" className="dashboard-listings-clear" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table bordered dashboard-listings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Event Name</th>
                  <th>Module</th>
                  <th>Event Date</th>
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
                    <td colSpan={10}>Loading events...</td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((eventItem, index) => (
                    <tr key={eventItem.id}>
                      <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td>
                        <div className="dashboard-listing-title-cell">
                          <img
                            src={resolveListingImageUrl(
                              eventItem.logoUrl || eventItem.primaryImageUrl || eventItem.imageUrls?.[0],
                            )}
                            alt={eventItem.title}
                            onError={setFallbackListingImage}
                          />
                          <div>
                            <strong>{eventItem.title}</strong>
                            <span className="dashboard-listing-module-badge is-events">Events</span>
                            <span>{formatDate(eventItem.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-listing-module-pill is-events">Events</span>
                        <em className="dashboard-listing-category-path">
                          {[eventItem.categoryName, eventItem.subCategory, eventItem.detailCategory]
                            .filter(Boolean)
                            .join(" / ") || "Events"}
                        </em>
                      </td>
                      <td>{getEventDateLabel(eventItem) || formatDate(getEventStartDate(eventItem)?.toISOString())}</td>
                      <td>
                        <span className="db-list-rat">{eventItem.rating ?? 0}</span>
                      </td>
                      <td>
                        <span className="db-list-rat">{eventItem.views ?? 0}</span>
                      </td>
                      <td>
                        <span className={getStatusClass(eventItem.status)}>
                          {eventItem.status || "Pending"}
                        </span>
                      </td>
                      <td>
                        {eventItem.canEdit === false ? (
                          <span className="db-list-edit dashboard-listing-disabled">Locked</span>
                        ) : (
                          <Link to={`/dashboard/listings/${eventItem.id}/edit`} className="db-list-edit">
                            Edit
                          </Link>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="db-list-edit db-list-edit-button"
                          onClick={() => handleDelete(eventItem.id)}
                          disabled={deletingId === eventItem.id}
                        >
                          {deletingId === eventItem.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                      <td>
                        <Link
                          to={`/dashboard/listings/${eventItem.id}/preview`}
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
                    <td colSpan={10}>No events found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dashboard-listings-pagination">
            <span>{totalCount} events</span>
            <div>
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1 || isLoading}>
                Previous
              </button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages || isLoading}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function EventsLoadingOverlay() {
  return (
    <div className="dashboard-listings-loader" role="status" aria-live="polite">
      <div className="dashboard-listings-loader-card">
        <span className="dashboard-listings-loader-spinner" aria-hidden="true"></span>
        <strong>Loading events</strong>
        <p>Getting your latest event and ticket listings.</p>
      </div>
    </div>
  );
}

function getUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((first, second) => first.localeCompare(second));
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
