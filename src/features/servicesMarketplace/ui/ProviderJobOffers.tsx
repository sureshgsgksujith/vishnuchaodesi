import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProviderJobOffers,
  respondProviderJobOffer,
  type ProviderJobOffer,
} from "../api/servicesMarketplaceApi";

export default function ProviderJobOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<ProviderJobOffer[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setMessage("");
    try {
      setOffers(await getProviderJobOffers());
    } catch {
      setMessage("Job offers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  async function respond(offer: ProviderJobOffer, accept: boolean) {
    const reason = accept
      ? "PROVIDER_ACCEPTED"
      : window.prompt("Reason for rejecting this offer")?.trim();
    if (!reason) return;
    try {
      await respondProviderJobOffer(offer, accept, reason);
      if (accept) {
        navigate("/provider/services?tab=jobs");
        return;
      }
      setMessage("Offer rejected.");
      await load();
    } catch {
      setMessage("This offer expired or was handled by another request.");
      await load();
    }
  }
  return (
    <section className="services-section provider-offers-page">
      <header className="provider-offers-head">
        <div><small>New work</small><h2>Job offers</h2><p>Review jobs offered to you and respond before they expire.</p></div>
        <button type="button" className="provider-refresh-button" onClick={() => void load()} disabled={loading}><span className="material-icons">refresh</span>{loading ? "Loading..." : "Refresh"}</button>
      </header>
      <div className="provider-offers-info"><span className="material-icons">info</span><p><strong>Already accepted or assigned?</strong> It moves out of Job offers and appears in Active jobs.</p><button type="button" onClick={() => navigate("/provider/services?tab=jobs")}>View active jobs <span className="material-icons">arrow_forward</span></button></div>
      {loading ? (
        <div className="provider-offers-state"><span className="provider-loading-spinner" /><strong>Loading available job offers...</strong></div>
      ) : offers.length ? (
        <div className="services-grid provider-offers-grid">
          {offers.map((offer) => (
            <article className="provider-offer-card" key={offer.offerId}>
              <small>{offer.bookingReference}</small>
              <h3>{offer.serviceName}</h3>
              <p><span className="material-icons">event</span>{new Date(offer.startAtUtc).toLocaleString()}</p>
              <p><span className="material-icons">timer</span>Respond by {new Date(offer.expiresAtUtc).toLocaleTimeString()}</p>
              <footer><button className="is-accept" onClick={() => void respond(offer, true)}>Accept job</button><button className="is-reject" onClick={() => void respond(offer, false)}>Decline</button></footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="provider-offers-state"><span className="material-icons">notifications_none</span><h3>No new job offers</h3><p>There are no offers waiting for your response. Accepted and manually assigned bookings are available under Active jobs.</p><button type="button" onClick={() => navigate("/provider/services?tab=jobs")}>Open active jobs</button></div>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
