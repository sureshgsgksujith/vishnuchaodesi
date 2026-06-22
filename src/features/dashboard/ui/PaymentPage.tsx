import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getEventTicketApiErrorMessage,
  getMyEventTicketBookings,
  type EventTicketBooking,
} from "../api/eventTicketsApi";
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

export default function PaymentPage() {
  const fullName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("customer_name") ||
    "Rn53";
  const [selectedGateway, setSelectedGateway] = useState(paymentGateways[0].id);
  const [billingForm, setBillingForm] =
    useState<BillingFormState>(initialBillingState);
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const checkoutAmount = formatCurrencyAmount(20, billingForm.country);
  const paidBookingCount = eventBookings.filter((booking) =>
    booking.paymentStatus.toLowerCase() === "paid"
  ).length;
  const eventPaymentTotal = useMemo(
    () => eventBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    [eventBookings],
  );

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
    <DashboardLayout mainContentClassName="ud-no-rhs">
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Payment</span>

        <div className="ud-cen-s2">
          <h2>Payment Status</h2>
          <Link to="/dashboard/plan-change" className="db-tit-btn">
            Change My Plan
          </Link>

          <div className="ud-payment">
            <div className="pay-rhs">
              <ul>
                <li>
                  <b>Name :</b> {fullName}
                </li>
                <li>
                  <b>Plan name :</b> Premium Plus
                </li>
                <li>
                  <b>Start date :</b> 17, Aug 2022
                </li>
                <li>
                  <b>Expiry date :</b> 17, Aug 2032
                </li>
                <li>
                  <b>duration :</b> 10 year
                </li>
                <li>
                  <b>Remaining Days :</b> 3533
                </li>
                <li>
                  <span className="ud-stat-pay-btn">Checkout amount: {checkoutAmount}</span>
                </li>
                <li>
                  <span className="ud-stat-pay-btn">
                    Payment Status: PENDING
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="dashboard-booking-summary">
            <div className="dashboard-booking-stat">
              <span>Event payments</span>
              <strong>{paidBookingCount}</strong>
            </div>
            <div className="dashboard-booking-stat">
              <span>Tickets booked</span>
              <strong>{eventBookings.reduce((sum, booking) => sum + getTicketCount(booking), 0)}</strong>
            </div>
            <div className="dashboard-booking-stat">
              <span>Total paid</span>
              <strong>{formatCurrencyAmount(eventPaymentTotal)}</strong>
            </div>
            <div className="dashboard-booking-stat">
              <span>Latest payment</span>
              <strong>{formatDate(eventBookings[0]?.paidAt)}</strong>
            </div>
          </div>

          {bookingError ? <div className="alert alert-danger">{bookingError}</div> : null}

          <div className="table-responsive">
            <table className="responsive-table bordered">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Event</th>
                  <th>Booking Ref</th>
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
                    <td colSpan={8} className="dashboard-empty-row">Loading event payments...</td>
                  </tr>
                ) : eventBookings.length > 0 ? (
                  eventBookings.map((booking, index) => (
                    <tr key={booking.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="dashboard-booking-title">
                          <strong>{booking.eventTitle}</strong>
                          <span>{booking.venue || booking.city || "-"}</span>
                        </div>
                      </td>
                      <td>{booking.bookingReference}</td>
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
                        <span className="db-list-ststus dashboard-booking-paid">
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
                    <td colSpan={8} className="dashboard-empty-row">No event ticket payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

function getTicketCount(booking: EventTicketBooking) {
  return booking.items.reduce((sum, item) => sum + item.quantity, 0);
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
