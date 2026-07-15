import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getArtistTour, getArtistTourApiErrorMessage, type ArtistTour } from "../api/artistToursApi";
import "../styles/artistTours.css";

const fallbackImage = "/template-17/images/chao-home-artists/2.jpg";

export default function ArtistTourDetailPage() {
  const { tourId } = useParams();
  const [tour, setTour] = useState<ArtistTour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const id = Number(tourId);

    if (!Number.isFinite(id) || id <= 0) {
      setErrorMessage("Artist tour not found.");
      setIsLoading(false);
      return;
    }

    getArtistTour(id)
      .then((result) => {
        if (isActive) {
          setTour(result);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getArtistTourApiErrorMessage(error));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [tourId]);

  return (
    <>
      <CustomerHeader />
      <main className="artist-tour-page artist-tour-detail-page">
        {isLoading ? <div className="artist-tour-status">Loading artist tour...</div> : null}
        {errorMessage ? <div className="artist-tour-status is-error">{errorMessage}</div> : null}
        {tour ? (
          <>
            <section className="artist-tour-detail-hero">
              <img src={tour.imageUrl || fallbackImage} alt={tour.artistName} />
              <div>
                <span>Trending Artist Tour 2026</span>
                <h1>{tour.artistName}</h1>
                <p>{tour.tourTitle}</p>
                <div className="artist-tour-detail-meta">
                  <strong>{formatTourDate(tour)}</strong>
                  <strong>{tour.tourCities}</strong>
                </div>
                <div className="artist-tour-detail-actions">
                  {tour.ticketUrl ? <a href={tour.ticketUrl} target="_blank" rel="noreferrer">Book tickets</a> : null}
                  <Link to="/dashboard/artist-tours/new">Post another tour</Link>
                </div>
              </div>
            </section>

            <section className="artist-tour-detail-layout">
              <article>
                <h2>About this tour</h2>
                <p>{tour.description}</p>
              </article>
              <aside>
                <h2>Event information</h2>
                <dl>
                  <div><dt>Venue</dt><dd>{tour.venueName || "To be announced"}</dd></div>
                  <div><dt>Address</dt><dd>{tour.venueAddress || [tour.city, tour.state, tour.country].filter(Boolean).join(", ")}</dd></div>
                  <div><dt>Contact</dt><dd>{tour.contactName}</dd></div>
                  <div><dt>Email</dt><dd>{tour.contactEmail}</dd></div>
                  {tour.contactPhone ? <div><dt>Phone</dt><dd>{tour.contactPhone}</dd></div> : null}
                </dl>
              </aside>
            </section>
          </>
        ) : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function formatTourDate(tour: ArtistTour) {
  const start = formatDate(tour.startDate);
  const end = tour.endDate ? formatDate(tour.endDate) : "";
  return end && end !== start ? `${start} - ${end}` : start;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
