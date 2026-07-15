import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { createArtistTour, getArtistTourApiErrorMessage, type UpsertArtistTourPayload } from "../api/artistToursApi";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
import "../styles/artistTours.css";

const initialForm: UpsertArtistTourPayload = {
  artistName: "",
  tourTitle: "",
  startDate: "",
  endDate: "",
  tourCities: "",
  venueName: "",
  venueAddress: "",
  city: "",
  state: "",
  country: "United States",
  description: "",
  imageUrl: "",
  ticketUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

export default function ArtistTourPostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField<K extends keyof UpsertArtistTourPayload>(key: K, value: UpsertArtistTourPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const tour = await createArtistTour(form);
      setSuccessMessage("Artist tour submitted for admin approval.");
      setForm(initialForm);
      window.setTimeout(() => navigate(`/dashboard/artist-tours/new?submitted=${tour.id}`), 200);
    } catch (error) {
      setErrorMessage(getArtistTourApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <UserHomeHeader />
      <main className="artist-tour-page artist-tour-post-page">
        <section className="artist-tour-post-hero">
          <div>
            <span>Trending Artist Tours</span>
            <h1>Post an artist tour</h1>
            <p>Submit concerts, comedy shows, cultural tours, and live artist schedules. Approved tours appear on the home page and detail pages.</p>
          </div>
          <Link to="/home">View home page</Link>
        </section>

        {errorMessage ? <div className="artist-tour-alert is-error">{errorMessage}</div> : null}
        {successMessage ? <div className="artist-tour-alert is-success">{successMessage}</div> : null}

        <form className="artist-tour-form" onSubmit={handleSubmit}>
          <section className="artist-tour-form-card">
            <h2>Tour details</h2>
            <div className="artist-tour-grid">
              <label>
                Artist name
                <input value={form.artistName} onChange={(event) => updateField("artistName", event.target.value)} required />
              </label>
              <label>
                Tour title
                <input value={form.tourTitle} onChange={(event) => updateField("tourTitle", event.target.value)} required />
              </label>
              <label>
                Start date
                <input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} required />
              </label>
              <label>
                End date
                <input type="date" value={form.endDate || ""} onChange={(event) => updateField("endDate", event.target.value)} />
              </label>
              <label className="is-wide">
                Tour cities / states
                <input value={form.tourCities} onChange={(event) => updateField("tourCities", event.target.value)} placeholder="CA, TX, NY or Dallas, Edison, Chicago" required />
              </label>
              <label className="is-wide">
                Artist image URL
                <input value={form.imageUrl || ""} onChange={(event) => updateField("imageUrl", event.target.value)} placeholder="/template-17/images/chao-home-artists/2.jpg" />
              </label>
            </div>
          </section>

          <section className="artist-tour-form-card">
            <h2>Venue and ticketing</h2>
            <div className="artist-tour-grid">
              <label>
                Venue name
                <input value={form.venueName || ""} onChange={(event) => updateField("venueName", event.target.value)} />
              </label>
              <label>
                City
                <input value={form.city || ""} onChange={(event) => updateField("city", event.target.value)} />
              </label>
              <label>
                State
                <input value={form.state || ""} onChange={(event) => updateField("state", event.target.value)} />
              </label>
              <label>
                Country
                <input value={form.country || ""} onChange={(event) => updateField("country", event.target.value)} />
              </label>
              <label className="is-wide">
                Venue address
                <input value={form.venueAddress || ""} onChange={(event) => updateField("venueAddress", event.target.value)} />
              </label>
              <label className="is-wide">
                Ticket / booking URL
                <input value={form.ticketUrl || ""} onChange={(event) => updateField("ticketUrl", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="artist-tour-form-card">
            <h2>Description and contact</h2>
            <div className="artist-tour-grid">
              <label className="is-wide">
                Description
                <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={6} required />
              </label>
              <label>
                Contact name
                <input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} required />
              </label>
              <label>
                Contact email
                <input type="email" value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} required />
              </label>
              <label>
                Contact phone
                <PhoneNumberInput value={form.contactPhone || ""} onChange={(value) => updateField("contactPhone", value)} />
              </label>
            </div>
          </section>

          <div className="artist-tour-form-actions">
            <Link to="/home">Cancel</Link>
            <button type="submit" disabled={isSaving}>{isSaving ? "Submitting..." : "Submit for approval"}</button>
          </div>
        </form>
      </main>
    </>
  );
}
