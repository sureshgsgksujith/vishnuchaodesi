import { useEffect, useState } from "react";
import {
  cancelServiceBooking,
  createServiceReview,
  createServicesSupportTicket,
  getServiceBookingHistory,
  requestWarrantyRevisit,
  type BookingLifecycle,
} from "../api/servicesMarketplaceApi";

export default function BookingAftercarePanel({ bookingId, status, onChanged }: { bookingId: string; status: string; onChanged: () => void }) {
  const [lifecycle, setLifecycle] = useState<BookingLifecycle>();
  const [dialog, setDialog] = useState<"cancel" | "review" | "warranty" | "support" | null>(null);
  const [message, setMessage] = useState("");
  async function load() { try { setLifecycle(await getServiceBookingHistory(bookingId)); } catch { setLifecycle(undefined); } }
  useEffect(() => { void load(); }, [bookingId]);
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form); setMessage("");
    try {
      if (dialog === "cancel" && lifecycle) await cancelServiceBooking(bookingId, lifecycle.rowVersion, String(data.get("note") || ""));
      if (dialog === "review") await createServiceReview(bookingId, Number(data.get("rating")), String(data.get("note") || ""));
      if (dialog === "warranty") await requestWarrantyRevisit(bookingId, String(data.get("note") || ""));
      if (dialog === "support") await createServicesSupportTicket({ category: "BOOKING", reasonCode: String(data.get("reason") || "OTHER"), message: String(data.get("note") || ""), priority: "NORMAL" });
      setDialog(null); setMessage("Your request was submitted successfully."); await load(); onChanged();
    } catch { setMessage("This request could not be completed. Check booking eligibility and try again."); }
  }
  const finished = status === "COMPLETED";
  const cancellable = !["COMPLETED", "CANCELLED", "FAILED"].includes(status);
  return <section className="services-aftercare">
    <div className="services-aftercare-actions">
      {cancellable ? <button type="button" className="danger-outline" onClick={() => setDialog("cancel")}><span className="material-icons">event_busy</span>Cancel booking</button> : null}
      {finished ? <button type="button" onClick={() => setDialog("review")}><span className="material-icons">star</span>Rate service</button> : null}
      {finished ? <button type="button" onClick={() => setDialog("warranty")}><span className="material-icons">verified_user</span>Warranty help</button> : null}
      <button type="button" onClick={() => setDialog("support")}><span className="material-icons">support_agent</span>Get support</button>
    </div>
    {lifecycle?.history?.length ? <div className="services-booking-timeline"><h4>Booking timeline</h4>{lifecycle.history.map((entry) => <div key={entry.id}><i /><span><strong>{entry.toStatus.replace(/_/g, " ")}</strong><small>{new Date(entry.transitionedAtUtc).toLocaleString()}</small></span></div>)}</div> : null}
    {message ? <p className="services-aftercare-message" role="status">{message}</p> : null}
    {dialog ? <div className="services-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><form className="services-action-modal" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      <button className="services-modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><span className="services-close-glyph" aria-hidden="true" /></button>
      <span className="material-icons">{dialog === "review" ? "star" : dialog === "warranty" ? "verified_user" : dialog === "support" ? "support_agent" : "event_busy"}</span>
      <h3>{dialog === "review" ? "Rate your service" : dialog === "warranty" ? "Request warranty support" : dialog === "support" ? "Contact support" : "Cancel this booking?"}</h3>
      {dialog === "review" ? <label>Rating<select name="rating" defaultValue="5"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Very poor</option></select></label> : null}
      {dialog === "support" ? <label>Topic<select name="reason"><option value="SCHEDULE">Schedule or provider</option><option value="PAYMENT">Payment</option><option value="SERVICE_QUALITY">Service quality</option><option value="OTHER">Something else</option></select></label> : null}
      <label>{dialog === "review" ? "Comments" : "Tell us what happened"}<textarea name="note" required={dialog !== "review"} rows={4} placeholder="Add useful details" /></label>
      <div><button type="button" className="secondary" onClick={() => setDialog(null)}>Keep booking</button><button type="submit">Submit request</button></div>
    </form></div> : null}
  </section>;
}
