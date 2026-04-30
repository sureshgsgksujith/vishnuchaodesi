import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getListing, getListingApiErrorMessage, type ListingSummary } from "../api/listingsApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../utils/listingImages";

export default function ListingPreviewPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(listingId);

    if (!Number.isFinite(id)) {
      setErrorMessage("Listing not found.");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);

    getListing(id)
      .then((result) => {
        if (!isActive) return;
        setListing(result);
        setErrorMessage("");
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getListingApiErrorMessage(error));
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
  }, [listingId]);

  return (
    <>
      <UserHomeHeader />
      <section className="listing-preview-page">
        <div className="container">
          {isLoading ? <div className="alert alert-info">Loading listing...</div> : null}
          {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
          {listing ? <ListingPreview listing={listing} /> : null}
        </div>
      </section>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}

function ListingPreview({ listing }: { listing: ListingSummary }) {
  const imageUrls = listing.imageUrls?.length ? listing.imageUrls : [listing.primaryImageUrl || ""];
  const location = [listing.locality, listing.city].filter(Boolean).join(", ");

  return (
    <article className="listing-preview">
      <div className="listing-preview-media">
        <img
          src={resolveListingImageUrl(imageUrls[0])}
          alt={listing.title}
          onError={setFallbackListingImage}
        />
      </div>
      <div className="listing-preview-body">
        <div className="listing-preview-actions">
          <Link to={`/dashboard/listings/${listing.id}/edit`} className="btn btn-primary">Edit</Link>
          <Link to="/dashboard/all-listing" className="btn btn-primary">All listings</Link>
        </div>
        <p className="listing-preview-category">{listing.categoryName} / {listing.subCategory}</p>
        <h1>{listing.title}</h1>
        {location ? <p className="listing-preview-location"><i className="material-icons">location_on</i>{location}</p> : null}
        <p>{listing.description}</p>
        <dl className="listing-preview-meta">
          <div>
            <dt>Status</dt>
            <dd>{listing.status}</dd>
          </div>
          <div>
            <dt>Detailed category</dt>
            <dd>{listing.detailCategory}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{formatPrice(listing.price)}</dd>
          </div>
          <div>
            <dt>Views</dt>
            <dd>{listing.views}</dd>
          </div>
        </dl>
        {imageUrls.length > 1 ? (
          <div className="listing-preview-gallery">
            {imageUrls.slice(1).map((imageUrl, index) => (
              <img
                key={`${imageUrl}-${index}`}
                src={resolveListingImageUrl(imageUrl)}
                alt=""
                onError={setFallbackListingImage}
              />
            ))}
          </div>
        ) : null}
        {listing.videoUrl ? (
          <div className="listing-preview-video">
            {isEmbeddableMarkup(listing.videoUrl) ? (
              <div dangerouslySetInnerHTML={{ __html: listing.videoUrl }} />
            ) : (
              <video src={listing.videoUrl} controls />
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function isEmbeddableMarkup(value: string) {
  return /<iframe[\s>]/i.test(value);
}

function formatPrice(value?: number | null) {
  if (!value) {
    return "Not listed";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
