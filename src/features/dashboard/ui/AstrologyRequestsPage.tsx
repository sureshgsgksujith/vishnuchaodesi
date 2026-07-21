import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardSearchField from "../components/DashboardSearchField";
import { getMyAstrologyRequests, type AstrologyRequest } from "../../astrology/api/astrologyApi";
import "../styles/eventBookings.css";

const pageSize = 6;

export default function AstrologyRequestsPage() {
  const [items, setItems] = useState<AstrologyRequest[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    getMyAstrologyRequests()
      .then((requests) => {
        if (isActive) setItems(requests || []);
      })
      .catch(() => {
        if (isActive) setErrorMessage("Unable to load your astrology requests.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => { isActive = false; };
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [
      item.referenceNumber,
      item.requestType,
      item.reportTitle,
      item.providerName,
      item.requestedService,
      item.status,
    ].join(" ").toLowerCase().includes(query));
  }, [items, search]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-bookings-main">
      <div className="ud-cen dashboard-bookings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">My Astrology Requests</span>
        <div className="ud-cen-s2 dashboard-bookings-panel">
          <div className="dashboard-bookings-header">
            <div><h2>Astrology requests</h2><p>{filteredItems.length} requests found</p></div>
            <div className="dashboard-bookings-toolbar">
              <div className="dashboard-bookings-search">
                <span className="material-icons" aria-hidden="true">search</span>
                <DashboardSearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search requests" />
              </div>
              <Link to="/astrology" className="dashboard-book-event-btn">New Request</Link>
            </div>
          </div>
          {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
          <div className="dashboard-bookings-grid">
            {isLoading ? <div className="dashboard-bookings-empty">Loading astrology requests...</div> : null}
            {!isLoading && !pageItems.length ? <div className="dashboard-bookings-empty">No astrology requests found.</div> : null}
            {pageItems.map((item) => (
              <article className="dashboard-booking-card" key={item.id}>
                <div className="dashboard-booking-card-head"><span className="dashboard-booking-status">{item.status}</span><strong>{item.requestType}</strong></div>
                <h3>{item.reportTitle || item.providerName || item.requestedService || "Astrology request"}</h3>
                <p>{item.providerName || "Chao Desi astrology team"}</p>
                <div className="dashboard-booking-ref">{item.referenceNumber}</div>
                <dl className="dashboard-booking-meta">
                  <div><dt>Submitted</dt><dd>{formatDate(item.createdAt)}</dd></div>
                  <div><dt>Notification</dt><dd>{item.notificationStatus}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="dashboard-bookings-pagination">
            <span>{filteredItems.length} total requests</span>
            <div>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
              <strong>{currentPage} / {totalPages}</strong>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
