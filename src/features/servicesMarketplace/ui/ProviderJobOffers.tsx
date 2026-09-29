import { useState } from "react";
import {
  getProviderJobOffers,
  respondProviderJobOffer,
  type ProviderJobOffer,
} from "../api/servicesMarketplaceApi";

export default function ProviderJobOffers() {
  const [offers, setOffers] = useState<ProviderJobOffer[]>([]);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  async function load() {
    try {
      setOffers(await getProviderJobOffers());
    } catch {
      setMessage("Job offers could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }
  async function respond(offer: ProviderJobOffer, accept: boolean) {
    const reason = accept
      ? "PROVIDER_ACCEPTED"
      : window.prompt("Reason for rejecting this offer")?.trim();
    if (!reason) return;
    try {
      await respondProviderJobOffer(offer, accept, reason);
      setMessage(accept ? "Job accepted." : "Offer rejected.");
      await load();
    } catch {
      setMessage("This offer expired or was handled by another request.");
      await load();
    }
  }
  return (
    <section className="services-section">
      <h2>Job offers</h2>
      {!loaded ? (
        <button onClick={() => void load()}>Load job offers</button>
      ) : offers.length ? (
        <div className="services-grid">
          {offers.map((offer) => (
            <article key={offer.offerId}>
              <small>{offer.bookingReference}</small>
              <h3>{offer.serviceName}</h3>
              <p>{new Date(offer.startAtUtc).toLocaleString()}</p>
              <p>
                Respond by {new Date(offer.expiresAtUtc).toLocaleTimeString()}
              </p>
              <button onClick={() => void respond(offer, true)}>Accept</button>
              <button onClick={() => void respond(offer, false)}>Reject</button>
            </article>
          ))}
        </div>
      ) : (
        <p>No active offers.</p>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
