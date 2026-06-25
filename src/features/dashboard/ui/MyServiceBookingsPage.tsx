import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardSearchField from "../components/DashboardSearchField";
import {
  getEventTicketApiErrorMessage,
  getMyEventTicketBookings,
  type EventTicketBooking,
} from "../api/eventTicketsApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/eventBookings.css";

const EVENT_BOOKINGS_PAGE_SIZE = 6;

export default function MyServiceBookingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [isLoadingEventBookings, setIsLoadingEventBookings] = useState(true);
  const [eventBookingError, setEventBookingError] = useState("");
  const [eventPage, setEventPage] = useState(1);

  const filteredEventBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return eventBookings;
    }

    return eventBookings.filter((booking) =>
      [
        booking.bookingReference,
        booking.eventTitle,
        booking.venue,
        booking.city,
        booking.buyerName,
        booking.buyerEmail,
        booking.buyerPhone,
        booking.paymentStatus,
        booking.bookingStatus,
        booking.items.map((item) => item.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [eventBookings, searchTerm]);

  const eventPageCount = Math.max(
    1,
    Math.ceil(filteredEventBookings.length / EVENT_BOOKINGS_PAGE_SIZE)
  );
  const currentEventPage = Math.min(eventPage, eventPageCount);
  const pagedEventBookings = filteredEventBookings.slice(
    (currentEventPage - 1) * EVENT_BOOKINGS_PAGE_SIZE,
    currentEventPage * EVENT_BOOKINGS_PAGE_SIZE
  );
  const bookingStats = useMemo(() => {
    const paidBookings = eventBookings.filter((booking) => isPaidBooking(booking.paymentStatus));
    const ticketCount = eventBookings.reduce(
      (sum, booking) => sum + booking.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const paidAmount = paidBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    return [
      { label: "Total Bookings", value: eventBookings.length.toString().padStart(2, "0"), tone: "blue" },
      { label: "Paid Bookings", value: paidBookings.length.toString().padStart(2, "0"), tone: "green" },
      { label: "Tickets Sold", value: ticketCount.toString().padStart(2, "0"), tone: "violet" },
      { label: "Paid Amount", value: formatCurrencyAmount(paidAmount), tone: "orange" },
    ];
  }, [eventBookings]);

  useEffect(() => {
    let isMounted = true;

    async function loadEventBookings() {
      try {
        setIsLoadingEventBookings(true);
        setEventBookingError("");
        const bookings = await getMyEventTicketBookings();

        if (isMounted) {
          setEventBookings(bookings || []);
        }
      } catch (error) {
        if (isMounted) {
          setEventBookingError(getEventTicketApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingEventBookings(false);
        }
      }
    }

    loadEventBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setEventPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setEventPage(1);
  }, [eventBookings.length]);

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-bookings-main">
      <div className="ud-cen dashboard-bookings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">My Service Bookings</span>

        <div className="ud-cen-s2 dashboard-bookings-panel">
          <div className="dashboard-bookings-header">
            <div>
              <h2>Event Ticket Bookings</h2>
              <p>{filteredEventBookings.length} bookings found</p>
            </div>
            <div className="dashboard-bookings-toolbar">
              <div className="dashboard-bookings-search">
                <span className="material-icons" aria-hidden="true">search</span>
                <DashboardSearchField
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search event bookings"
                />
              </div>
              <Link to="/all-listing?category=events-tickets" className="dashboard-book-event-btn">
                <span className="material-icons" aria-hidden="true">confirmation_number</span>
                Book Event
              </Link>
            </div>
          </div>
          {eventBookingError ? <div className="alert alert-danger">{eventBookingError}</div> : null}

          <section className="dashboard-booking-summary" aria-label="Booking summary">
            {bookingStats.map((stat) => (
              <div className={`dashboard-booking-stat is-${stat.tone}`} key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </section>

          <div className="dashboard-bookings-grid">
            {isLoadingEventBookings ? (
              <div className="dashboard-bookings-empty">Loading event bookings...</div>
            ) : pagedEventBookings.length > 0 ? (
              pagedEventBookings.map((booking) => (
                <article className="dashboard-booking-card" key={booking.id}>
                  <div className="dashboard-booking-card-head">
                    <span className="dashboard-booking-status">{booking.bookingStatus}</span>
                    <strong>{formatCurrencyAmount(booking.totalAmount)}</strong>
                  </div>

                  <h3>{booking.eventTitle}</h3>
                  <p>{booking.venue || booking.city || "-"}</p>

                  <div className="dashboard-booking-ref">{booking.bookingReference}</div>

                  <dl className="dashboard-booking-meta">
                    <div>
                      <dt>Name</dt>
                      <dd>{booking.buyerName || "-"}</dd>
                    </div>
                    <div>
                      <dt>Booked</dt>
                      <dd>{formatDate(booking.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{booking.buyerEmail || "-"}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{booking.buyerPhone || "-"}</dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>{booking.paymentStatus} via {booking.paymentProvider}</dd>
                    </div>
                    <div>
                      <dt>Paid</dt>
                      <dd>{formatDate(booking.paidAt)}</dd>
                    </div>
                  </dl>

                  <div className="dashboard-booking-tickets">
                    <TicketLines booking={booking} />
                  </div>

                  <div className="dashboard-booking-actions">
                    <Link to={`/event-details?id=${booking.listingId}`}>View Details</Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="dashboard-bookings-empty">No event ticket bookings found.</div>
            )}
          </div>

          <Pagination
            label="event bookings"
            page={currentEventPage}
            totalCount={filteredEventBookings.length}
            totalPages={eventPageCount}
            onPageChange={setEventPage}
          />

        </div>
      </div>
    </DashboardLayout>
  );
}

function isPaidBooking(status: string) {
  const normalized = status.trim().toLowerCase();

  return ["paid", "completed", "success", "succeeded"].includes(normalized);
}

function TicketLines({ booking }: { booking: EventTicketBooking }) {
  return (
    <div className="dashboard-ticket-lines">
      {booking.items.length ? (
        booking.items.map((item) => (
          <span key={`${booking.id}-${item.name}`}>
            {item.name} x {item.quantity}
          </span>
        ))
      ) : (
        <span>-</span>
      )}
    </div>
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

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

type PaginationProps = {
  label: string;
  page: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function Pagination({ label, page, totalCount, totalPages, onPageChange }: PaginationProps) {
  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className="dashboard-bookings-pagination">
      <span>
        Showing page {page} of {totalPages} for {totalCount} {label}
      </span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Previous
        </button>
        <strong>{page} / {totalPages}</strong>
        <button type="button" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
