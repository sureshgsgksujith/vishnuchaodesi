import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getEventTicketApiErrorMessage,
  getMyEventTicketBookings,
  type EventTicketBooking,
} from "../api/eventTicketsApi";
import { getMyProfile, type UserProfileFormValues } from "../api/profileApi";
import { getMyPlanPayments, getMyPlanUsage, selectPricingPlan, type PlanPayment, type PlanUsage, type PricingPlan } from "../../pricing/api/pricingApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import { getCoupons, type Coupon } from "../../coupons/api/couponsApi";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
import { getMyAllServicePostings, type AllServicePosting } from "../api/allServicePostingsApi";
import "../styles/eventBookings.css";

type PaymentGateway = {
  id: string;
  label: string;
  icon: string;
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
    id: "card",
    label: "Credit / Debit Card",
    icon: "credit_card",
    helpText:
      "You can pay with your credit card if you don’t have a PayPal account.",
    question: "What is PayPal?",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    icon: "account_balance",
    helpText:
      "You can pay with your credit card if you don’t have a Stripe account.",
    question: "What is Stripe?",
  },
  {
    id: "wallet",
    label: "Wallet / UPI",
    icon: "account_balance_wallet",
    helpText:
      "You can pay with your credit card if you don’t have a RazorPay account.",
    question: "What is RazorPay?",
  },
  {
    id: "paytm",
    label: "PayTm",
    icon: "payments",
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
  const location = useLocation();
  const navigate = useNavigate();
  const checkoutState = location.state as { checkoutPlan?: PricingPlan; returnTo?: string; pendingListingDraft?: unknown } | null;
  const checkoutPlan = checkoutState?.checkoutPlan;
  const [selectedGateway, setSelectedGateway] = useState(paymentGateways[0].id);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [billingForm, setBillingForm] = useState<BillingFormState>(initialBillingState);
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [servicePayments, setServicePayments] = useState<AllServicePosting[]>([]);
  const [yellowPagePayments, setYellowPagePayments] = useState<PlanPayment[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [profile, setProfile] = useState<UserProfileFormValues | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
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
  const activePlan = checkoutPlan || planUsage?.plan;
  const baseCheckoutAmount = activePlan?.price ?? 0;
  const discountAmount = appliedCoupon ? getCouponDiscount(appliedCoupon, baseCheckoutAmount) : 0;
  const payableAmount = Math.max(0, baseCheckoutAmount - discountAmount);
  const checkoutAmount = formatCurrencyAmount(payableAmount, billingForm.country);
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
        const [bookings, postings, planPayments] = await Promise.all([getMyEventTicketBookings(), getMyAllServicePostings(), getMyPlanPayments()]);

        if (isMounted) {
          setEventBookings(bookings || []);
          setServicePayments((postings || []).filter((posting) => posting.paymentStatus?.toLowerCase() === "paid"));
          setYellowPagePayments(planPayments || []);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activePlan || !agreedToTerms || isProcessingPlan) return;

    try {
      setIsProcessingPlan(true);
      setCheckoutMessage("");
      await selectPricingPlan(activePlan.code, {
        paymentReference: `PLAN-${Date.now()}`,
        paymentProvider: selectedGateway,
        couponCode: appliedCoupon?.code || undefined,
      });
      setCheckoutMessage("Payment completed and plan activated.");

      if (checkoutState?.returnTo) {
        navigate(checkoutState.returnTo, {
          state: { pendingListingDraft: checkoutState.pendingListingDraft, pricingConfirmed: true },
        });
      } else {
        navigate("/pricing-details", { replace: true });
      }
    } catch {
      setCheckoutMessage("Unable to complete payment. Please try again.");
    } finally {
      setIsProcessingPlan(false);
    }
  };
  const handleBillingChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBillingForm((current) => ({ ...current, [name]: value }));
  };
  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponMessage("Enter a coupon code."); return; }
    try {
      setIsApplyingCoupon(true);
      const result = await getCoupons(code, 1, 100);
      const coupon = result.items.find((item) => item.code.trim().toUpperCase() === code);
      setAppliedCoupon(coupon || null);
      setCouponMessage(coupon ? `${coupon.code} applied successfully.` : "Coupon is invalid or no longer active.");
    } catch { setAppliedCoupon(null); setCouponMessage("Unable to validate this coupon right now."); }
    finally { setIsApplyingCoupon(false); }
  };

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
              <span>Plan Price</span>
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

          <div className="dashboard-payment-history-head" style={{ marginTop: 28 }}><div><h3>Local Service Payments</h3><p>{servicePayments.length} payments found</p></div></div>
          <div className="table-responsive dashboard-payment-table-wrap">
            <table className="responsive-table bordered dashboard-payment-table">
              <thead><tr><th>Reference</th><th>Business / Plan</th><th>Total Amount</th><th>Coupon</th><th>Discount Amount</th><th>Pay Amount</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>{servicePayments.length ? servicePayments.map((payment) => <tr key={`service-${payment.id}`}><td><span className="dashboard-payment-ref">{payment.paymentReference}</span></td><td><b>{payment.businessName}</b><span>{payment.packageCode}</span></td><td>{formatCurrencyAmount(payment.subtotalAmount, payment.currency)}</td><td>{payment.couponCode || "-"}</td><td style={{ color: "#16834d" }}>-{formatCurrencyAmount(payment.discountAmount, payment.currency)}</td><td><b>{formatCurrencyAmount(payment.totalAmount, payment.currency)}</b><span>{payment.paymentProvider}</span></td><td>{formatDate(payment.paidAt || payment.createdAt)}</td><td><span className="db-list-ststus dashboard-booking-paid">{payment.paymentStatus}</span></td></tr>) : <tr><td colSpan={8} className="dashboard-empty-row">No Local Service payments found.</td></tr>}</tbody>
            </table>
          </div>

          <div className="dashboard-payment-history-head" style={{ marginTop: 28 }}><div><h3>Yellow Pages Payments</h3><p>{yellowPagePayments.length} payments found</p></div></div>
          <div className="table-responsive dashboard-payment-table-wrap"><table className="responsive-table bordered dashboard-payment-table"><thead><tr><th>Reference</th><th>Plan</th><th>Total Amount</th><th>Coupon</th><th>Discount Amount</th><th>Pay Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>{yellowPagePayments.length ? yellowPagePayments.map((payment) => <tr key={`plan-${payment.id}`}><td><span className="dashboard-payment-ref">{payment.paymentReference}</span></td><td><b>{payment.planName}</b><span>{payment.planCode}</span></td><td>{formatCurrencyAmount(payment.subtotalAmount, payment.currency)}</td><td>{payment.couponCode || "-"}</td><td style={{ color: "#16834d" }}>-{formatCurrencyAmount(payment.discountAmount, payment.currency)}</td><td><b>{formatCurrencyAmount(payment.totalAmount, payment.currency)}</b><span>{payment.paymentProvider}</span></td><td>{formatDate(payment.paidAt || payment.createdAt)}</td><td><span className="db-list-ststus dashboard-booking-paid">{payment.paymentStatus}</span></td></tr>) : <tr><td colSpan={8} className="dashboard-empty-row">No Yellow Pages payments found.</td></tr>}</tbody></table></div>

          <form className="plan-checkout" onSubmit={handleSubmit}>
            <div className="plan-checkout-bar">
              <span><i className="material-icons">verified_user</i> Secure checkout</span>
              <span><i className="material-icons">lock</i> Your payment details are protected</span>
            </div>
            <div className="plan-checkout-hero">
              <span className="material-icons">workspace_premium</span>
              <div><small>Subscription checkout</small><h2>{activePlan?.name || "Select a plan"}</h2><p>Complete your payment securely to activate your Chao Desi benefits.</p></div>
            </div>
            <div className="plan-checkout-layout">
              <div className="plan-checkout-steps">
                <CheckoutStep number={1} title="Phone Number Verification" activeStep={checkoutStep} onOpen={setCheckoutStep}>
                  <p className="plan-checkout-help">A One-Time Password (OTP) will be sent for verification. Please use a valid mobile number to continue.</p>
                  <div className="plan-checkout-phone"><select aria-label="Country code"><option>USA (+1)</option><option>IND (+91)</option><option>UK (+44)</option></select><input type="tel" value={billingForm.contactMobile} onChange={(event) => setBillingForm((current) => ({ ...current, contactMobile: event.target.value }))} placeholder="Enter your mobile number" /></div>
                  <button type="button" className="plan-checkout-btn" onClick={() => setCheckoutStep(2)}>Continue</button>
                </CheckoutStep>
                <CheckoutStep number={2} title="Share Your Contact Details" activeStep={checkoutStep} onOpen={setCheckoutStep}>
                  <div className="plan-checkout-fields"><input value={billingForm.contactName} onChange={(event) => setBillingForm((current) => ({ ...current, contactName: event.target.value }))} placeholder="Full name" /><input type="email" value={billingForm.contactEmail} onChange={(event) => setBillingForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Email address" /></div>
                  <button type="button" className="plan-checkout-btn" onClick={() => setCheckoutStep(3)}>Continue</button>
                </CheckoutStep>
                <CheckoutStep number={3} title="Payment Options" activeStep={checkoutStep} onOpen={setCheckoutStep}>
                  <p className="plan-checkout-help">Your card information is encrypted and never stored on our servers.</p>
                  {paymentGateways.map((gateway) => <label className="plan-checkout-pay" key={gateway.id}><input type="radio" name="payment" checked={selectedGateway === gateway.id} onChange={() => setSelectedGateway(gateway.id)} /><i className="material-icons">{gateway.icon}</i>{gateway.label}</label>)}
                  <button type="button" className="plan-checkout-btn" onClick={() => setCheckoutStep(4)}>Continue</button>
                </CheckoutStep>
                <CheckoutStep number={4} title="Terms & Conditions" activeStep={checkoutStep} onOpen={setCheckoutStep}>
                  <label className="plan-checkout-terms"><input type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} /> I agree to the Terms of Service, Privacy Policy and Refund Policy of Chao Desi.</label>
                </CheckoutStep>
              </div>
              <aside className="plan-checkout-summary">
                <h3>Order Summary</h3>
                <small>PLAN</small>
                <div className="plan-checkout-line"><span><b>{activePlan?.name || "No plan selected"}</b><em>{formatDurationMonths(activePlan?.durationMonths)}</em></span><strong>{formatCurrencyAmount(baseCheckoutAmount, billingForm.country)}</strong></div>
                <div className="plan-checkout-coupon"><label htmlFor="plan-coupon">Coupon code</label><div><input id="plan-coupon" value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponMessage(""); }} placeholder="Enter coupon code" /><button type="button" onClick={applyCoupon} disabled={isApplyingCoupon}>{isApplyingCoupon ? "Checking..." : "Apply"}</button></div>{couponMessage ? <p className={appliedCoupon ? "is-success" : "is-error"}>{couponMessage}</p> : null}</div>
                <div className="plan-checkout-fees"><div><span>Subtotal</span><b>{formatCurrencyAmount(baseCheckoutAmount, billingForm.country)}</b></div>{appliedCoupon ? <div className="is-discount"><span>Coupon discount</span><b>-{formatCurrencyAmount(discountAmount, billingForm.country)}</b></div> : null}<div><span>Transaction Fee</span><b>{formatCurrencyAmount(0, billingForm.country)}</b></div></div>
                <div className="plan-checkout-total"><span>Amount Payable</span><b>{checkoutAmount}</b></div>
                <button type="submit" className="plan-checkout-pay-now" disabled={!agreedToTerms || !activePlan || isProcessingPlan}><i className="material-icons">lock</i> {isProcessingPlan ? "Processing..." : "Pay Securely"}</button>
                {checkoutMessage ? <p className={checkoutMessage.startsWith("Payment completed") ? "is-success" : "is-error"}>{checkoutMessage}</p> : null}
                <p className="plan-checkout-secure"><i className="material-icons">verified_user</i> 100% secure payment</p>
              </aside>
            </div>
          </form>

          <div className="ud-pay-op legacy-plan-payment" hidden>
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
                                      <PhoneNumberInput value={billingForm.contactMobile} onChange={(contactMobile) => setBillingForm((current) => ({ ...current, contactMobile }))} placeholder="Contact phone number" />
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

function CheckoutStep({ number, title, activeStep, onOpen, children }: { number: number; title: string; activeStep: number; onOpen: (step: number) => void; children: ReactNode }) {
  const isOpen = activeStep === number;
  return <section className={`plan-checkout-step${isOpen ? " is-open" : ""}${activeStep > number ? " is-done" : ""}`}><button type="button" className="plan-checkout-step-head" onClick={() => onOpen(number)}><span>{activeStep > number ? <i className="material-icons">check</i> : number}</span><b>{title}</b><i className="material-icons">expand_more</i></button>{isOpen ? <div className="plan-checkout-step-body">{children}</div> : null}</section>;
}

function getCouponDiscount(coupon: Coupon, amount: number) {
  const text = coupon.discountText.trim();
  const value = Number(text.match(/[\d.]+/)?.[0] || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(amount, text.includes("%") ? amount * value / 100 : value);
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
