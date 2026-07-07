import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getEventTicketApiErrorMessage,
  getMyEventTicketBookings,
  type EventTicketBooking,
} from "../api/eventTicketsApi";
import { getMyProfile, type UserProfileFormValues } from "../api/profileApi";
import { getMyPlanUsage, type PlanUsage } from "../../pricing/api/pricingApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/eventBookings.css";

type PaymentGateway = {
  id: string;
  label: string;
  helpText: string;
  question: string;
};

type BillingFormState = {
  country: string;
  state: string;
  city: string;
  address: string;
  zipCode: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
};

const paymentGateways: PaymentGateway[] = [
  {
    id: "paymentpaypal",
    label: "PayPal payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a PayPal account.",
    question: "What is PayPal?",
  },
  {
    id: "paymentstripe",
    label: "Stripe payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a Stripe account.",
    question: "What is Stripe?",
  },
  {
    id: "payment_razor_pay",
    label: "RazorPay payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a RazorPay account.",
    question: "What is RazorPay?",
  },
  {
    id: "payment_paytm",
    label: "PayTm payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a PayTm account.",
    question: "What is PayTm?",
  },
];

const initialBillingState: BillingFormState = {
  country: "India",
  state: "Kerala",
  city: "Illunois city",
  address: "7th",
  zipCode: "600069",
  contactName: "hhjjj",
  contactMobile: "",
  contactEmail: "ff@gmail.com",
};

const PAYMENT_PAGE_SIZE = 5;

export default function PaymentPage() {
  const [selectedGateway, setSelectedGateway] = useState(paymentGateways[0].id);
  const [billingForm, setBillingForm] =
    useState<BillingFormState>(initialBillingState);
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [profile, setProfile] = useState<UserProfileFormValues | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const fullName =
    profile?.fullName ||
    localStorage.getItem("fullName") ||
    localStorage.getItem("customer_name") ||
    "Customer";
  const paidBookings = useMemo(
    () => eventBookings.filter((booking) => isPaidBooking(booking.paymentStatus)),
    [eventBookings],
  );
  const paidBookingCount = paidBookings.length;
  const sortedEventBookings = useMemo(
    () => [...eventBookings].sort((first, second) => getBookingTime(second) - getBookingTime(first)),
    [eventBookings],
  );
  const filteredEventPayments = useMemo(
    () => filterPaymentBookings(sortedEventBookings, paymentSearch),
    [paymentSearch, sortedEventBookings],
  );
  const paymentPageCount = Math.max(1, Math.ceil(filteredEventPayments.length / PAYMENT_PAGE_SIZE));
  const currentPaymentPage = Math.min(paymentPage, paymentPageCount);
  const pagedEventPayments = filteredEventPayments.slice(
    (currentPaymentPage - 1) * PAYMENT_PAGE_SIZE,
    currentPaymentPage * PAYMENT_PAGE_SIZE,
  );
  const eventPaymentTotal = useMemo(
    () => paidBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    [paidBookings],
  );
  const activePlan = planUsage?.plan;
  const checkoutAmount = formatCurrencyAmount(activePlan?.price ?? 0, billingForm.country);
  const planStartDate = profile?.createdAt || "";
  const planExpiryDate = profile?.profileExpiryDate || derivePlanExpiryDate(planStartDate, activePlan?.durationMonths);
  const remainingDays = getRemainingDays(planExpiryDate);
  const planStatus = getPlanStatus(planUsage, activePlan?.name);

  useEffect(() => {
    let isMounted = true;

    async function loadBookings() {
      try {
        setIsLoadingBookings(true);
        setBookingError("");
        const bookings = await getMyEventTicketBookings();

        if (isMounted) {
          setEventBookings(bookings || []);
        }
      } catch (error) {
        if (isMounted) {
          setBookingError(getEventTicketApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingBookings(false);
        }
      }
    }

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentSearch, eventBookings.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountDetails() {
      const [profileResult, planResult] = await Promise.allSettled([
        getMyProfile(),
        getMyPlanUsage(),
      ]);

      if (!isMounted) {
        return;
      }

      if (profileResult.status === "fulfilled") {
        const nextProfile = profileResult.value.profile;
        setProfile(nextProfile);
        setBillingForm((current) => ({
          ...current,
          country: nextProfile.country || current.country,
          state: nextProfile.state || current.state,
          city: nextProfile.city || current.city,
          address: [nextProfile.addressLine1, nextProfile.addressLine2].filter(Boolean).join(", ") || current.address,
          zipCode: nextProfile.zipCode || current.zipCode,
          contactName: nextProfile.fullName || current.contactName,
          contactMobile: nextProfile.mobileNumber || current.contactMobile,
          contactEmail: nextProfile.email || current.contactEmail,
        }));
      }

      if (planResult.status === "fulfilled") {
        setPlanUsage(planResult.value);
      }
    }

    loadAccountDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBillingChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setBillingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-payment-main">
      <div className="ud-cen dashboard-payment-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Payment</span>

        <div className="ud-cen-s2 dashboard-payment-panel">
          <div className="dashboard-payment-hero">
            <div>
              <span>Payment Status</span>
              <h2>{activePlan?.name || "No active plan"}</h2>
              <p>{fullName}</p>
            </div>
            <Link to="/dashboard/plan-change" className="dashboard-payment-plan-btn">
              Change My Plan
            </Link>
          </div>

          <div className="dashboard-payment-plan-grid">
            <div className="dashboard-payment-plan-card is-plan">
              <span>Plan</span>
              <strong>{activePlan?.name || "Not selected"}</strong>
            </div>
            <div className="dashboard-payment-plan-card">
              <span>Start Date</span>
              <strong>{formatDate(planStartDate)}</strong>
            </div>
            <div className="dashboard-payment-plan-card">
              <span>Expiry Date</span>
              <strong>{formatDate(planExpiryDate)}</strong>
            </div>
            <div className="dashboard-payment-plan-card">
              <span>Duration</span>
              <strong>{formatDurationMonths(activePlan?.durationMonths)}</strong>
            </div>
            <div className="dashboard-payment-plan-card">
              <span>Remaining Days</span>
              <strong>{remainingDays}</strong>
            </div>
            <div className="dashboard-payment-plan-card is-amount">
              <span>Checkout Amount</span>
              <strong>{checkoutAmount}</strong>
            </div>
            <div className={`dashboard-payment-plan-card is-status ${planStatus.className}`}>
              <span>Payment Status</span>
              <strong>{planStatus.label}</strong>
            </div>
          </div>

          <div className="dashboard-booking-summary">
            <div className="dashboard-booking-stat is-blue">
              <span>Event payments</span>
              <strong>{paidBookingCount}</strong>
            </div>
            <div className="dashboard-booking-stat is-green">
              <span>Tickets booked</span>
              <strong>{eventBookings.reduce((sum, booking) => sum + getTicketCount(booking), 0)}</strong>
            </div>
            <div className="dashboard-booking-stat is-orange">
              <span>Total paid</span>
              <strong>{formatCurrencyAmount(eventPaymentTotal)}</strong>
            </div>
            <div className="dashboard-booking-stat is-violet">
              <span>Latest payment</span>
              <strong>{formatDate(sortedEventBookings[0]?.paidAt || sortedEventBookings[0]?.createdAt)}</strong>
            </div>
          </div>

          {bookingError ? <div className="alert alert-danger">{bookingError}</div> : null}

          <div className="dashboard-payment-history-head">
            <div>
              <h3>Event Payment History</h3>
              <p>{filteredEventPayments.length} payments found</p>
            </div>
            <label className="dashboard-payment-search">
              <span className="material-icons" aria-hidden="true">search</span>
              <input
                type="search"
                value={paymentSearch}
                onChange={(event) => setPaymentSearch(event.target.value)}
                placeholder="Search payments..."
              />
            </label>
          </div>

          <div className="table-responsive dashboard-payment-table-wrap">
            <table className="responsive-table bordered dashboard-payment-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Event</th>
                  <th>Booking Ref</th>
                  <th>Event Date</th>
                  <th>Tickets</th>
                  <th>Payment</th>
                  <th>Paid Date</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingBookings ? (
                  <tr>
                    <td colSpan={9} className="dashboard-empty-row">Loading event payments...</td>
                  </tr>
                ) : pagedEventPayments.length > 0 ? (
                  pagedEventPayments.map((booking, index) => (
                    <tr key={booking.id}>
                      <td>{(currentPaymentPage - 1) * PAYMENT_PAGE_SIZE + index + 1}</td>
                      <td>
                        <div className="dashboard-booking-title">
                          <strong>{booking.eventTitle}</strong>
                          <span>{booking.venue || booking.city || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-payment-ref">{booking.bookingReference}</span>
                      </td>
                      <td>
                        <div className="dashboard-booking-title">
                          <strong>{formatEventDate(booking.eventDate)}</strong>
                          <span>{booking.eventTime || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <TicketLines booking={booking} />
                      </td>
                      <td>
                        <b>{formatCurrencyAmount(booking.totalAmount)}</b>
                        <br />
                        <span>{booking.paymentProvider}</span>
                      </td>
                      <td>{formatDate(booking.paidAt)}</td>
                      <td>
                        <span className={`db-list-ststus ${isPaidBooking(booking.paymentStatus) ? "dashboard-booking-paid" : "dashboard-booking-confirmed"}`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <Link to={`/event-details?id=${booking.listingId}`} className="db-list-edit">
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="dashboard-empty-row">No event ticket payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaymentPagination
            page={currentPaymentPage}
            totalCount={filteredEventPayments.length}
            totalPages={paymentPageCount}
            onPageChange={setPaymentPage}
          />

          <div className="ud-pay-op">
            <h4>Select your payment option</h4>
            <ul>
              {paymentGateways.map((gateway) => {
                const isSelected = gateway.id === selectedGateway;

                return (
                  <li key={gateway.id}>
                    <div className="pay-full">
                      <div className="rbbox">
                        <input
                          type="radio"
                          id={gateway.id}
                          name="payment"
                          checked={isSelected}
                          onChange={() => setSelectedGateway(gateway.id)}
                        />
                        <label htmlFor={gateway.id}>{gateway.label}</label>
                        <div
                          className="pay-note"
                          style={{ display: isSelected ? "block" : "none" }}
                        >
                          <span>
                            <i className="material-icons">star</i>{" "}
                            {gateway.helpText}
                          </span>
                          <span>
                            <i className="material-icons">star</i>
                            {gateway.question}
                          </span>

                          <form onSubmit={handleSubmit}>
                            <h4>Billing details</h4>
                            <ul>
                              <li>
                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        readOnly
                                        className="form-control"
                                        value={fullName}
                                        placeholder="Full name *"
                                        required
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="country"
                                        className="form-control"
                                        value={billingForm.country}
                                        placeholder="Country"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="state"
                                        className="form-control"
                                        value={billingForm.state}
                                        placeholder="State"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="city"
                                        className="form-control"
                                        value={billingForm.city}
                                        placeholder="City *"
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-12">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="address"
                                        className="form-control"
                                        value={billingForm.address}
                                        placeholder="Village & Street name"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="zipCode"
                                        className="form-control"
                                        value={billingForm.zipCode}
                                        placeholder="Postcode/ZIP"
                                        inputMode="numeric"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="contactName"
                                        value={billingForm.contactName}
                                        placeholder="Contact person *"
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="contactMobile"
                                        value={billingForm.contactMobile}
                                        placeholder="Contact phone number"
                                        inputMode="numeric"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="email"
                                        className="form-control"
                                        name="contactEmail"
                                        value={billingForm.contactEmail}
                                        placeholder="Contact Email Id "
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </li>
                            </ul>

                            <button type="submit" className="db-pro-bot-btn">
                              Start Payment
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="ud-notes">
            <p>
              <b>Notes:</b> Hi, Before start "Ads Payment" you must know the
              pricing details and positions and all. You just click the
              "Pricing and other details" button in this same page and you know
              the all details. If your payment done means your invoice
              automatically received your "Payment invoice" page and you never
              stop your Ads till the end date.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
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

type PaymentPaginationProps = {
  page: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function PaymentPagination({ page, totalCount, totalPages, onPageChange }: PaymentPaginationProps) {
  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className="dashboard-payment-pagination">
      <span>{totalCount} payments</span>
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

function getTicketCount(booking: EventTicketBooking) {
  return booking.items.reduce((sum, item) => sum + item.quantity, 0);
}

function filterPaymentBookings(bookings: EventTicketBooking[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return bookings;
  }

  return bookings.filter((booking) =>
    [
      booking.eventTitle,
      booking.venue,
      booking.city,
      booking.eventDate,
      booking.eventTime,
      booking.bookingReference,
      booking.paymentProvider,
      booking.paymentStatus,
      booking.bookingStatus,
      booking.buyerName,
      booking.buyerEmail,
      booking.buyerPhone,
      booking.items.map((item) => `${item.name} ${item.quantity}`).join(" "),
      formatCurrencyAmount(booking.totalAmount),
      formatEventDate(booking.eventDate),
      formatDate(booking.paidAt),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function isPaidBooking(status: string) {
  const normalized = status.trim().toLowerCase();

  return ["paid", "completed", "success", "succeeded"].includes(normalized);
}

function getBookingTime(booking: EventTicketBooking) {
  const value = booking.paidAt || booking.createdAt;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getRemainingDays(value?: string | null) {
  if (!value) {
    return "-";
  }

  const expiry = new Date(value);

  if (Number.isNaN(expiry.getTime())) {
    return "-";
  }

  const diff = expiry.getTime() - Date.now();

  return String(Math.max(0, Math.ceil(diff / 86400000)));
}

function derivePlanExpiryDate(startDate?: string | null, durationMonths?: number) {
  if (!startDate || !durationMonths) {
    return "";
  }

  const date = new Date(startDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMonth(date.getMonth() + durationMonths);

  return date.toISOString();
}

function formatDurationMonths(value?: number) {
  if (!value) {
    return "-";
  }

  if (value % 12 === 0) {
    const years = value / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }

  return `${value} ${value === 1 ? "month" : "months"}`;
}

function getPlanStatus(planUsage: PlanUsage | null, planName?: string) {
  if (planUsage?.isPlanExpired) {
    return { label: "Expired", className: "is-expired" };
  }

  if (planUsage?.requiresPlanSelection || !planName) {
    return { label: "Pending", className: "is-pending" };
  }

  return { label: "Active", className: "is-active" };
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

function formatEventDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
