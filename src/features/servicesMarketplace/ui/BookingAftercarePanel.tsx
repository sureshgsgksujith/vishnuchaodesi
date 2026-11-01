import { useEffect, useState } from "react";
import {
  cancelServiceBooking,
  createServiceReview,
  createServicesSupportTicket,
  getCustomerServiceReview,
  getServiceBookingHistory,
  requestWarrantyRevisit,
  type BookingLifecycle,
  type CustomerServiceReview,
} from "../api/servicesMarketplaceApi";

const customerJourney = [
  { statuses: ["QUOTE_CALCULATED"], label: "Price calculated", detail: "Your selected service and final price were calculated.", owner: "Completed automatically" },
  { statuses: ["SLOT_HELD"], label: "Appointment reserved", detail: "Your selected date and time were temporarily reserved.", owner: "Completed automatically" },
  { statuses: ["PENDING_PAYMENT", "CONFIRMED", "BOOKING_CONFIRMED"], label: "Booking confirmed", detail: "Payment or booking confirmation was accepted. You do not need to pay again.", owner: "No customer action required" },
  { statuses: ["SEARCHING_PROVIDER", "PROVIDER_OFFERED"], label: "Finding a professional", detail: "Eligible professionals receive this job offer. One must accept it before assignment.", owner: "Chao Desi operations / provider" },
  { statuses: ["ACCEPTED"], label: "Professional assigned", detail: "A service professional accepted your booking.", owner: "Provider action completed" },
  { statuses: ["EN_ROUTE"], label: "Professional on the way", detail: "The professional started travelling to your service address.", owner: "Provider updates this" },
  { statuses: ["ARRIVED"], label: "Professional arrived", detail: "The professional reached your address and will start at the appointment time.", owner: "Provider updates this" },
  { statuses: ["IN_PROGRESS", "ADDITIONAL_QUOTE_PENDING"], label: "Work in progress", detail: "The professional started the job. Any additional work requires your approval.", owner: "Provider performs the service" },
  { statuses: ["COMPLETED"], label: "Service completed", detail: "The provider completed the checklist and job. You can confirm completion and rate the service.", owner: "Customer confirmation available" },
];

export default function BookingAftercarePanel({ bookingId, status, onChanged }: { bookingId: string; status: string; onChanged: () => void }) {
  const [lifecycle, setLifecycle] = useState<BookingLifecycle>();
  const [review, setReview] = useState<CustomerServiceReview | null>();
  const [dialog, setDialog] = useState<"cancel" | "review" | "warranty" | "support" | null>(null);
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [journeyExpanded, setJourneyExpanded] = useState(false);
  async function load() {
    try {
      const result = await getServiceBookingHistory(bookingId);
      setLifecycle(result);
    } catch { setLifecycle(undefined); }
    if (status === "COMPLETED") {
      try { setReview((await getCustomerServiceReview(bookingId)) ?? null); }
      catch { setReview(null); }
    } else {
      setReview(undefined);
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => void load();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [bookingId, status]);
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form); setMessage(""); setDialogError(""); setSubmitting(true);
    try {
      if (dialog === "cancel") {
        if (!lifecycle) throw new Error("Booking details are still loading.");
        const reason = String(data.get("reason") || "").trim();
        const note = String(data.get("note") || "").trim();
        await cancelServiceBooking(bookingId, lifecycle.rowVersion, `${reason}${note ? `: ${note}` : ""}`);
      }
      if (dialog === "review") await createServiceReview(bookingId, Number(data.get("rating")), String(data.get("note") || ""));
      if (dialog === "warranty") await requestWarrantyRevisit(bookingId, String(data.get("note") || ""));
      if (dialog === "support") await createServicesSupportTicket({ category: "BOOKING", reasonCode: String(data.get("reason") || "OTHER"), message: String(data.get("note") || ""), priority: "NORMAL" });
      setDialog(null); setMessage(dialog === "review" ? "Thank you. Your rating was submitted and cannot be submitted again." : dialog === "cancel" ? "Your booking was cancelled successfully." : "Your request was submitted successfully."); await load(); onChanged();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "This request could not be completed. Please try again."); }
    finally { setSubmitting(false); }
  }
  const finished = status === "COMPLETED";
  const hasSavedReview = Boolean(review?.publicId && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
  const cancellable = !["COMPLETED", "CANCELLED", "FAILED"].includes(status);
  const currentStatus = lifecycle?.status || status;
  const paymentReceived = currentStatus !== "PENDING_PAYMENT" && Boolean(lifecycle?.history.some((entry) => entry.toStatus === "PENDING_PAYMENT"));
  const recordedStep = Math.max(0, customerJourney.findIndex((step) => step.statuses.includes(currentStatus)));
  const currentStep = paymentReceived && ["CONFIRMED", "BOOKING_CONFIRMED"].includes(currentStatus) ? 3 : recordedStep;
  return <section className="services-aftercare">
    <div className="services-aftercare-actions">
      {cancellable ? <button type="button" className="danger-outline" onClick={() => { setDialogError(""); setDialog("cancel"); }}><span className="material-icons" aria-hidden="true">event_busy</span><span className="services-aftercare-button-label">Cancel booking</span></button> : null}
      {finished && !hasSavedReview ? <button type="button" className="rate-service-action" onClick={() => setDialog("review")}><span className="material-icons" aria-hidden="true">star</span><span className="services-aftercare-button-label">Rate service</span></button> : null}
      {finished && hasSavedReview && review ? <div className="services-review-submitted"><span className="material-icons">verified</span><span><strong>Rating submitted</strong><small>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · Saved successfully</small></span></div> : null}
      {finished ? <button type="button" className="warranty-action" onClick={() => setDialog("warranty")}><span className="material-icons" aria-hidden="true">verified_user</span><span className="services-aftercare-button-label">Warranty help</span></button> : null}
      <button type="button" className="support-action" onClick={() => setDialog("support")}><span className="material-icons" aria-hidden="true">support_agent</span><span className="services-aftercare-button-label">Get support</span></button>
    </div>
    {lifecycle ? <div className={`services-booking-timeline${journeyExpanded ? " is-expanded" : " is-collapsed"}`}><header className="services-timeline-header"><div><h4>Your service journey</h4><p className="services-timeline-note">Follow your booking from confirmation through service completion.</p></div><button type="button" aria-expanded={journeyExpanded} onClick={() => setJourneyExpanded((value) => !value)}><span className="material-icons" aria-hidden="true">{journeyExpanded ? "expand_less" : "expand_more"}</span>{journeyExpanded ? "Hide journey" : "Show journey"}</button></header>{journeyExpanded ? <div className="services-timeline-content">{customerJourney.map((step, index) => {
      const assignmentCompleted = currentStatus === "ACCEPTED";
      const terminalCompleted = currentStatus === "COMPLETED";
      const state = terminalCompleted || (assignmentCompleted && index <= recordedStep) || index < currentStep ? "completed" : index === currentStep && !assignmentCompleted ? "current" : "upcoming";
      const event = [...lifecycle.history].reverse().find((entry) => step.statuses.includes(entry.toStatus));
      const isConfirmationStep = step.statuses.includes("BOOKING_CONFIRMED");
      const label = isConfirmationStep && paymentReceived ? "Payment received & booking confirmed" : step.label;
      const detail = isConfirmationStep && paymentReceived ? "Your payment was received successfully and the appointment is confirmed. No further payment is required now." : step.detail;
      return <div className={`services-timeline-step is-${state}`} key={step.label}><i /><span><b>{state === "completed" ? "Completed" : state === "current" ? "Current step" : "Upcoming"}</b><strong>{label}</strong><p>{detail}</p><em>{step.owner}</em>{event ? <small>{new Date(event.transitionedAtUtc).toLocaleString()}</small> : null}</span></div>;
    })}{["CANCELLED", "FAILED", "MANUAL_REVIEW"].includes(currentStatus) ? <div className="services-timeline-exception"><strong>{currentStatus.replace(/_/g, " ")}</strong><p>Please use Get support if you need assistance with this booking.</p></div> : null}</div> : null}</div> : null}
    {message ? <p className="services-aftercare-message" role="status">{message}</p> : null}
    {dialog ? <div className="services-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><form className="services-action-modal" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      <button className="services-modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><span className="services-close-glyph" aria-hidden="true" /></button>
      <span className="material-icons">{dialog === "review" ? "star" : dialog === "warranty" ? "verified_user" : dialog === "support" ? "support_agent" : "event_busy"}</span>
      <h3>{dialog === "review" ? "Rate your service" : dialog === "warranty" ? "Request warranty support" : dialog === "support" ? "Contact support" : "Cancel this booking?"}</h3>
      {dialog === "cancel" ? <p className="services-cancel-warning">Your appointment will be cancelled after you confirm. This action may be subject to the cancellation policy.</p> : null}
      {dialog === "review" ? <label>Rating<select name="rating" defaultValue="5"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Very poor</option></select></label> : null}
      {dialog === "support" ? <label>Topic<select name="reason"><option value="SCHEDULE">Schedule or provider</option><option value="PAYMENT">Payment</option><option value="SERVICE_QUALITY">Service quality</option><option value="OTHER">Something else</option></select></label> : null}
      {dialog === "cancel" ? <label>Cancellation reason<select name="reason" defaultValue="" required><option value="" disabled>Select a reason</option><option value="Schedule changed">My schedule changed</option><option value="Booked by mistake">Booked by mistake</option><option value="Provider or timing issue">Provider or timing issue</option><option value="Price concern">Price concern</option><option value="Service no longer needed">Service no longer needed</option><option value="Other">Other reason</option></select></label> : null}
      <label>{dialog === "review" ? "Comments" : dialog === "cancel" ? "Additional details (optional)" : "Tell us what happened"}<textarea name="note" required={dialog !== "review" && dialog !== "cancel"} rows={4} placeholder={dialog === "cancel" ? "Add any information that may help us" : "Add useful details"} /></label>
      {dialogError ? <p className="services-action-modal-error" role="alert">{dialogError}</p> : null}
      <div><button type="button" className="secondary" disabled={submitting} onClick={() => setDialog(null)}>{dialog === "cancel" ? "Keep booking" : "Close"}</button><button type="submit" className={dialog === "cancel" ? "danger-submit" : ""} disabled={submitting}>{submitting ? "Submitting..." : dialog === "cancel" ? "Confirm cancellation" : "Submit request"}</button></div>
    </form></div> : null}
  </section>;
}
