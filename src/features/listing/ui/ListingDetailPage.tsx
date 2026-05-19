import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, SyntheticEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getListing,
  getListingApiErrorMessage,
  getPublicListings,
  submitListingReview,
  type ListingSummary,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
} from "../../dashboard/utils/listingImages";
import { getCurrentCustomerUserId, isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/publicListings.css";

type LooseValue = string | number | boolean | string[] | null | undefined;
type LooseRecord = Record<string, LooseValue>;
type NamedImageItem = { name: string; imageName?: string; detail?: string; price?: string | number; link?: string };

export default function ListingDetailPage() {
  const { listingId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [relatedListings, setRelatedListings] = useState<ListingSummary[]>([]);
  const isAuthenticated = isCustomerAuthenticated();
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");

  const requestedId = listingId || searchParams.get("id") || searchParams.get("listingId");

  useEffect(() => {
    let isActive = true;

    async function loadListing() {
      if (!isAuthenticated) {
        setListing(null);
        setRelatedListings([]);
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const id = Number(requestedId);
        let currentListing: ListingSummary | null = null;

        if (requestedId && Number.isFinite(id)) {
          currentListing = await getListing(id);
        } else {
          const result = await getPublicListings({ page: 1, pageSize: 1 });
          currentListing = result.items[0] || null;
        }

        if (!isActive) return;

        if (!currentListing) {
          setListing(null);
          setRelatedListings([]);
          setErrorMessage("Listing not found.");
          return;
        }

        setListing(currentListing);

        const category = getCategorySlug(currentListing);
        const related = await getPublicListings({
          category,
          city: currentListing.city || getString(currentListing.locationDetails, "city") || undefined,
          page: 1,
          pageSize: 200,
        });

        if (isActive) {
          setRelatedListings((related.items || []).filter((item) => item.id !== currentListing?.id));
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getListingApiErrorMessage(error));
          setListing(null);
          setRelatedListings([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, requestedId]);

  return (
    <>
      <CustomerHeader />
      <main className="public-detail-page public-detail-template">
        {isLoading ? (
          <div className="container public-detail-status">
            <div className="alert alert-info">Loading listing...</div>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="container public-detail-status">
            <div className="alert alert-danger">{errorMessage}</div>
          </div>
        ) : null}
        {listing ? (
          <ListingDetail
            listing={listing}
            relatedListings={relatedListings}
            onListingUpdate={(updatedListing) => setListing(updatedListing)}
          />
        ) : null}
        {!isAuthenticated ? (
          <LoginRequiredPrompt
            title="Login required"
            message="Please login to view listing details."
            closeTo="/all-listing"
            returnTo={`${location.pathname}${location.search}`}
          />
        ) : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function ListingDetail({
  listing,
  relatedListings,
  onListingUpdate,
}: {
  listing: ListingSummary;
  relatedListings: ListingSummary[];
  onListingUpdate: (listing: ListingSummary) => void;
}) {
  const galleryImages = useMemo(() => getGalleryImages(listing), [listing]);
  const reviews = listing.reviews || [];
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<{ title: string; message: string } | null>(null);
  const scrollingRelatedListings = relatedListings.length > 1 ? [...relatedListings, ...relatedListings] : relatedListings;
  const relatedScrollDuration = `${Math.max(72, relatedListings.length * 18)}s`;
  const country = getString(listing.locationDetails, "country");
  const address = buildAddress(listing);
  const phone = getString(listing.sellerInformation, "mobileNumber");
  const email = getString(listing.sellerInformation, "email");
  const whatsapp = getString(listing.sellerInformation, "whatsAppNumber") || phone;
  const website = normalizeWebsite(getString(listing.sellerInformation, "websiteUrl"));
  const rating = Number(listing.averageRating || listing.rating || 0);
  const displayRating = rating > 0 ? rating : 0;
  const businessDescription = getString(listing.propertyDetails, "businessDescription") || listing.description;
  const services = getServiceItems(listing);
  const serviceAreas = getServiceAreas(listing);
  const detailRows = getDetailRows(listing);
  const businessHours = getBusinessHours(listing);
  const todaysHours = getTodayHours(businessHours);
  const companyRows = getCompanyRows(listing);
  const offers = getOfferItems(listing);
  const products = getProducts(listing);
  const profileImage = listing.logoUrl || listing.primaryImageUrl || galleryImages[0] || "";
  const bannerImage = getBannerImage(listing);
  const bannerImages = bannerImage ? [bannerImage] : [];
  const ownerImage = listing.logoUrl || listing.primaryImageUrl || "";
  const businessProfileName = listing.sellerName || getString(listing.sellerInformation, "name") || listing.title;
  const businessProfileText = address || [listing.categoryName, listing.subCategory].filter(Boolean).join(", ");
  const isVerified = getBoolean(listing.settings, "verifiedByAdmin");
  const currentUserId = getCurrentCustomerUserId();
  const isOwnerViewing = currentUserId === listing.userId;

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewSuccess("");
    setReviewError("");

    if (!isCustomerAuthenticated() || !currentUserId) {
      setLoginPrompt({
        title: "Login required",
        message: "Please login to submit your rating and review.",
      });
      return;
    }

    if (isOwnerViewing) {
      setLoginPrompt({
        title: "Review not allowed",
        message: "You cannot submit a rating or review for your own listing.",
      });
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating.");
      return;
    }

    try {
      setIsReviewSubmitting(true);
      const updatedListing = await submitListingReview(listing.id, {
        rating: reviewRating,
        reviewMessage,
      });
      onListingUpdate(updatedListing);
      setReviewSuccess("Review submitted.");
    } catch (error) {
      const message = getListingApiErrorMessage(error);
      if (message.toLowerCase().includes("own listing")) {
        setReviewError("");
        setLoginPrompt({
          title: "Review not allowed",
          message: "You cannot submit a rating or review for your own listing.",
        });
        return;
      }

      setReviewError(message);
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  return (
    <article className="public-detail-v3">
      <section>
        <div className="v3-list-ql public-detail-quick">
          <div className="container">
            <div className="row">
              <div className="v3-list-ql-inn">
                <ul>
                  <li className="active">
                    <a href="#ld-abo" onClick={scrollToSection}><i className="material-icons">person</i> About</a>
                  </li>
                  {services.length ? (
                    <li><a href="#ld-ser" onClick={scrollToSection}><i className="material-icons">business_center</i> Services</a></li>
                  ) : null}
                  <li><a href="#ld-off" onClick={scrollToSection}><i className="material-icons">style</i> Offers</a></li>
                  <li><a href="#location" onClick={scrollToSection}><i className="material-icons">map</i> Location</a></li>
                  <li><a href="#ld-rev" onClick={scrollToSection}><i className="material-icons">star_half</i> Write Review</a></li>
                  <li><a href="#claim" onClick={scrollToSection}><i className="material-icons">store</i>Claim business</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {bannerImages.length ? (
        <section className={`news-hom-ban-sli list-ban-sli public-detail-banner-strip ${bannerImages.length === 1 ? "public-detail-banner-single" : ""}`}>
          <div className="news-hom-ban-sli-inn">
            <ul className="list-ban-sli-25">
              {bannerImages.map((imageUrl, index) => (
                <li key={`${imageUrl}-${index}`}>
                  <div className="im">
                    <img
                      src={resolveListingImageUrl(imageUrl)}
                      alt={index === 0 ? listing.title : "listing images"}
                      onError={hideBrokenImage}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="list-pg-bg">
        <div className="container">
          <div>
            <div className="com-padd row">
              <div className="eve-bred-crum">
                <ul>
                  <li><Link to="/">Home</Link></li>
                  <li><Link to={buildBackHref(listing)}>{listing.categoryName || "Listings"}</Link></li>
                  <li><a href="#!">{listing.title}</a></li>
                </ul>
              </div>

              <div className="col-md-8 list-pg-lt list-page-com-p">
                <TemplateSection id="ld-abo" eyebrow="About" title={listing.title}>
                  <div className="list-pg-inn-sp list-pg-inn-abo">
                    <p>{businessDescription || "Details are not listed."}</p>
                  </div>
                </TemplateSection>

                {services.length ? (
                  <TemplateSection id="ld-ser" eyebrow="Services" title="Offered">
                    <div className="list-pg-inn-sp">
                      <div className="row pg-list-ser">
                        <ul className="row">
                          {services.map((service, index) => (
                            <li className={getDynamicImage(service.imageName, galleryImages, profileImage, index) ? "col-md-3 col-sm-6" : "col-md-3 col-sm-6 public-service-text-only"} key={`${service.name}-${index}`}>
                              {getDynamicImage(service.imageName, galleryImages, profileImage, index) ? (
                                <div className="pg-list-ser-p1">
                                <img
                                  src={resolveListingImageUrl(getDynamicImage(service.imageName, galleryImages, profileImage, index))}
                                  alt=""
                                  onError={hideBrokenImage}
                                  loading="lazy"
                                />
                                </div>
                              ) : null}
                              <div className="pg-list-ser-p2">
                                <h4>{service.name}</h4>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TemplateSection>
                ) : null}

                {serviceAreas.length ? (
                  <TemplateSection id="ld-ser-area" eyebrow="Service" title="Areas">
                    <div className="list-pg-inn-sp">
                      <div className="pg-list-ser-area">
                        {serviceAreas.map((area) => <span key={area}>{area}</span>)}
                      </div>
                    </div>
                  </TemplateSection>
                ) : null}

                {products.length ? (
                  <TemplateSection id="ld-products" title="Products" className="pg-list-prod-sec">
                    <div className="list-pg-inn-sp">
                      <div className="row plac-hom-all-pla pg-list-prod public-detail-product-list">
                        <ul>
                          {products.map((product, index) => (
                            <li className="col-md-4" key={`${product}-${index}`}>
                              <div className="all-pro-box">
                                <div className="all-pro-img">
                                  {getDynamicImage("", galleryImages, profileImage, index) ? (
                                    <img src={resolveListingImageUrl(getDynamicImage("", galleryImages, profileImage, index))} alt="" onError={hideBrokenImage} loading="lazy" />
                                  ) : null}
                                </div>
                                <div className="all-pro-txt">
                                  <h4>{product}</h4>
                                  <span>{formatPrice(listing.price, country)}</span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TemplateSection>
                ) : null}

                {offers.length ? (
                  <TemplateSection id="ld-off" eyebrow="Special" title="Offers" className="pglist-off-last">
                    <div className="list-pg-inn-sp">
                      {offers.map((offer, index) => (
                        <div className="home-list-pop row" key={`${offer.name}-${index}`}>
                          {getDynamicImage(offer.imageName, galleryImages, profileImage, index) ? (
                            <div className="col-md-3">
                              <img
                                src={resolveListingImageUrl(getDynamicImage(offer.imageName, galleryImages, profileImage, index))}
                                alt=""
                                onError={hideBrokenImage}
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                          <div className="col-md-9 home-list-pop-desc">
                            <h3>{offer.name || "Special offer"}</h3>
                            {offer.price ? <h4>{formatPrice(Number(offer.price), country)}</h4> : null}
                            {offer.detail ? <p>{offer.detail}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TemplateSection>
                ) : null}

                {listing.restaurantMenuItems?.length ? (
                  <TemplateSection id="ld-menu" eyebrow="Restaurant" title="Menu">
                    <div className="list-pg-inn-sp">
                      <div className="public-template-menu">
                        {listing.restaurantMenuItems.map((item, index) => (
                          <div key={`${getString(item, "itemName")}-${index}`}>
                            <strong>{getString(item, "itemName") || "Menu item"}</strong>
                            <span>{formatPrice(getNumber(item, "price"), country)}</span>
                            {getString(item, "description") ? <p>{getString(item, "description")}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TemplateSection>
                ) : null}

                {galleryImages.length ? (
                  <section id="ld-gal" className="pglist-bg pglist-p-com">
                    <div className="list-pg-inn-sp">
                      <div className="public-detail-gallery-grid">
                        {galleryImages.map((imageUrl, index) => (
                          <img
                            key={`${imageUrl}-${index}`}
                            src={resolveListingImageUrl(imageUrl)}
                            alt=""
                            onError={hideBrokenImage}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null}

                <TemplateSection id="location" eyebrow="Our" title="Location" className="pglist-p3">
                  <div className="list-pg-inn-sp">
                    <div className="list-pg-map">
                      <iframe
                        src={buildMapUrl(address)}
                        title={`${listing.title} location`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                </TemplateSection>

                {!listing.totalReviews ? <div className="spa-first-review">Be the First One To Review This Listing!!!</div> : null}

                <TemplateSection id="ld-rev" eyebrow="Write Your" title="Reviews">
                  <div className="list-pg-inn-sp">
                    <div className="list-pg-write-rev">
                      <form onSubmit={handleReviewSubmit}>
                        <div className="form-group public-review-rating-input" aria-label="Rating">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={value <= reviewRating ? "active" : ""}
                              aria-label={`${value} star rating`}
                              onClick={() => setReviewRating(value)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <div className="form-group">
                          <textarea
                            className="form-control"
                            placeholder="Write review"
                            value={reviewMessage}
                            onChange={(event) => setReviewMessage(event.target.value)}
                          />
                        </div>
                        {reviewSuccess ? <div className="alert alert-success">{reviewSuccess}</div> : null}
                        {reviewError ? <div className="alert alert-danger">{reviewError}</div> : null}
                        <input
                          type="submit"
                          className="btn btn-primary"
                          value={isReviewSubmitting ? "Submitting..." : "Submit Review"}
                          disabled={isReviewSubmitting}
                        />
                      </form>
                    </div>
                  </div>
                </TemplateSection>

                {loginPrompt ? (
                  <LoginRequiredPrompt
                    title={loginPrompt.title}
                    message={loginPrompt.message}
                    onClose={() => setLoginPrompt(null)}
                  />
                ) : null}

                <section className="pglist-p3 pglist-bg pglist-p-com">
                  <div className="pglist-p-com-ti">
                    <h3><span>User</span> Reviews</h3>
                  </div>
                  <div className="list-pg-inn-sp">
                    <div className="lp-ur-all">
                      <div className="lp-ur-all-left">
                        <span className="lp-ur-all-left-11">{listing.totalReviews || 0} Reviews</span>
                      </div>
                      <div className="lp-ur-all-right">
                        <h5>{displayRating ? displayRating.toFixed(1) : "No ratings yet"}</h5>
                        <p><label><RatingStars rating={displayRating} /></label></p>
                      </div>
                    </div>
                    {reviews.length ? (
                      <div className="public-user-review-list">
                        {reviews.map((review) => (
                          <div className="public-user-review" key={review.id}>
                            <div>
                              <strong>{review.reviewerName || "User"}</strong>
                              <span>{formatShortDate(review.updatedAt || review.createdAt)}</span>
                            </div>
                            <RatingStars rating={review.rating} />
                            {review.reviewMessage ? <p>{review.reviewMessage}</p> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="list-pg-rt col-md-4">
                <div className="pglist-bg pglist-p-com">
                  <div className="pg-list-ban-info-23">
                    <div className="pg-list-1-pro">
                      {profileImage ? <img src={resolveListingImageUrl(profileImage)} alt="" onError={hideBrokenImage} /> : null}
                      {isVerified ? <span className="stat"><i className="material-icons">verified_user</i></span> : null}
                    </div>
                    <div className="pg-list-1-left">
                      <h1>{listing.title}</h1>
                      <div className="pg-list-revi-23 row">
                        <div className="pg-list-revi-lhs">
                          <div className="list-rat-all">
                            <b>{displayRating ? displayRating.toFixed(1) : "0.0"}</b>
                            <label className="rat"><RatingStars rating={displayRating} /></label>
                          </div>
                        </div>
                        <p className="txt"><span><b>{displayRating ? displayRating.toFixed(1) : "0.0"}</b> average based on {listing.totalReviews || 0} Reviews</span></p>
                      </div>
                      <div className="list-number pag-p1-phone">
                        <ul>
                          {address ? <li className="ic-addr">{address}</li> : null}
                          {phone ? <a href={`tel:${phone}`}><li className="ic-php">{phone}</li></a> : null}
                          {email ? <a href={`mailto:${email}`}><li className="ic-mai">{email}</li></a> : null}
                          {website ? <a target="_blank" rel="noreferrer" href={website.href}><li className="ic-web">{website.label}</li></a> : null}
                        </ul>
                      </div>
                    </div>
                    <div className="list-ban-btn">
                      <ul className="row">
                        <li>{phone ? <a href={`tel:${phone}`} className="cta cta-call">Call Now</a> : <span className="cta cta-call">Call Now</span>}</li>
                        <li>{email ? <a href={`mailto:${email}`} className="pulse cta cta-get">Get quote</a> : <span className="pulse cta cta-get">Get quote</span>}</li>
                      </ul>
                    </div>
                    <div className="pg-list-oths">
                      <ul>
                        <li><span className="cta cta-like"><i className="material-icons">visibility</i><b>{listing.views || 0}</b> VIEWS</span></li>
                        {whatsapp ? <li><a href={`https://wa.me/${numbersOnly(whatsapp)}`} className="cta cta-rev" target="_blank" rel="noreferrer"><i className="material-icons">chat</i>WhatsApp</a></li> : null}
                        <li><button type="button" className="public-share-button"><i className="material-icons">share</i>Share</button></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <TemplateSection eyebrow="Company" title="Info" className="pglist-p3">
                  <div className="list-pg-inn-sp">
                    {businessHours.length ? (
                      <div className="list-work-hrs public-work-hours-open">
                        <div className="today">
                          <b>Working hours</b>
                          <span className="status">{todaysHours?.time === "Closed" ? "Closed" : "Open"}</span>
                          {todaysHours ? <span className="time">{todaysHours.time}</span> : null}
                        </div>
                        <div className="timing">
                          <ul>
                            {businessHours.map((item) => <li key={item.day}>{item.day}: <span className="time">{item.time}</span></li>)}
                          </ul>
                        </div>
                      </div>
                    ) : null}
                    <div className="list-pg-oth-info">
                      <InfoList rows={companyRows.concat(detailRows).slice(0, 10)} />
                    </div>
                    <div className="list-pg-guar" id="claim">
                      <ul>
                        <li>
                          <h4>Claim this business</h4>
                          <span className="clim-edit">Suggest an edit</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </TemplateSection>

                <div className="ld-rhs-pro pglist-bg pglist-p-com">
                  <div className="pglist-p-com-ti">
                    <h3><span>Listing</span> Created by</h3>
                  </div>
                  <div className="lis-pro-badg-23 row">
                    {ownerImage ? <img src={resolveListingImageUrl(ownerImage)} alt="" onError={hideBrokenImage} loading="lazy" /> : null}
                    <div>
                      <h4>{listing.sellerName || getString(listing.sellerInformation, "name") || "Business owner"}</h4>
                      <p>Member since {formatMonthYear(listing.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="ld-rhs-pro pglist-bg pglist-p-com">
                  <div className="pglist-p-com-ti">
                    <h3>Business profile</h3>
                  </div>
                  <div className="lis-pro-badg-23 row">
                    {profileImage ? <img className="proi" src={resolveListingImageUrl(profileImage)} alt="" onError={hideBrokenImage} loading="lazy" /> : null}
                    <div>
                      <h4>{businessProfileName}</h4>
                      {businessProfileText ? <p>{businessProfileText}</p> : null}
                    </div>
                  </div>
                </div>
              </div>

              {relatedListings.length ? (
                <div className="list-det-rel-pre">
                  <h2>Related listings:</h2>
                  <ul
                    className={`prod-sli plac-hom-all-pla public-related-template-list ${
                      relatedListings.length > 1 ? "public-related-auto-list" : ""
                    }`}
                    style={{ "--related-scroll-duration": relatedScrollDuration } as CSSProperties}
                  >
                    {scrollingRelatedListings.map((item, index) => (
                      <li key={`${item.id}-${index}`} aria-hidden={index >= relatedListings.length}>
                        <div className="plac-hom-box">
                          {item.primaryImageUrl || item.imageUrls?.[0] ? (
                            <div className="plac-hom-box-im">
                              <img
                                src={resolveListingImageUrl(item.primaryImageUrl || item.imageUrls?.[0])}
                                alt=""
                                onError={hideBrokenImage}
                                loading="lazy"
                              />
                            <h4>{item.title}</h4>
                            </div>
                          ) : null}
                          <div className="rel-list-txt-box">
                            <span className="rat-small-num">{Number(item.averageRating || item.rating || 0).toFixed(1)}</span>
                            <span className="rat-more-cta-ic">More details</span>
                          </div>
                          <Link to={`/listing-details?id=${item.id}`} className="fclick" aria-label={item.title}></Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

function LoginRequiredPrompt({
  title,
  message,
  closeTo,
  returnTo,
  onClose,
}: {
  title: string;
  message: string;
  closeTo?: string;
  returnTo?: string;
  onClose?: () => void;
}) {
  const loginPath = returnTo ? `/login?returnUrl=${encodeURIComponent(returnTo)}` : "/login";

  return (
    <div className="public-login-prompt-backdrop" role="dialog" aria-modal="true" aria-labelledby="public-login-prompt-title">
      <div className="public-login-prompt">
        <h4 id="public-login-prompt-title">{title}</h4>
        <p>{message}</p>
        <div>
          <Link className="btn btn-primary" to={loginPath}>Login</Link>
          {closeTo ? (
            <Link className="btn btn-default" to={closeTo}>Close</Link>
          ) : (
            <button type="button" className="btn btn-default" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateSection({
  id,
  eyebrow,
  title,
  className = "",
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`pglist-bg pglist-p-com ${className}`}>
      <div className="pglist-p-com-ti">
        <h3>{eyebrow ? <span>{eyebrow}</span> : null} {title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoList({ rows }: { rows: Array<[string, LooseValue]> }) {
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");

  if (!visibleRows.length) {
    return <p>Details are not listed.</p>;
  }

  return (
    <ul>
      {visibleRows.map(([label, value]) => (
        <li key={label}>{label}<span>{formatValue(value)}</span></li>
      ))}
    </ul>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating || 0);

  return (
    <span className="public-stars" aria-label={`${rating || 0} rating`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i className={index < rounded ? "material-icons" : "material-icons public-star-muted"} key={index}>star</i>
      ))}
    </span>
  );
}

function getCategorySlug(listing: ListingSummary): PublicListingQuery["category"] {
  if (listing.categoryName === "Restaurants & Food") return "restaurants-food";
  if (listing.categoryName === "Vehicles") return "vehicles";
  if (listing.categoryName === "Electronics & Appliances") return "electronics-appliances";
  if (listing.categoryName === "Care Services") return "care-services";
  if (listing.categoryName === "Real Estate") return "real-estate";
  return undefined;
}

function getGalleryImages(listing: ListingSummary) {
  const images = [
    listing.coverBannerUrl,
    listing.primaryImageUrl,
    ...(listing.imageUrls || []),
  ].filter(Boolean) as string[];

  return Array.from(new Set(images)).slice(0, 8);
}

function getBannerImage(listing: ListingSummary) {
  return listing.coverBannerUrl || listing.primaryImageUrl || "";
}

function buildAddress(listing: ListingSummary) {
  return [
    getString(listing.locationDetails, "locality") || listing.locality,
    getString(listing.locationDetails, "city") || listing.city,
    getString(listing.locationDetails, "state"),
    getString(listing.locationDetails, "country"),
  ].filter(Boolean).join(", ");
}

function getServiceItems(listing: ListingSummary): NamedImageItem[] {
  const services = parseJsonArray<NamedImageItem>(getString(listing.propertyDetails, "services"))
    .filter((item) => item.name);
  if (services.length) return services.slice(0, 8);

  const restaurantServices = getArray(listing.restaurantFoodDetails, "serviceTypes").map((name) => ({ name }));
  if (restaurantServices.length) return restaurantServices.slice(0, 8);

  const amenityServices = getAmenityLabels(listing).map((name) => ({ name }));
  if (amenityServices.length) return amenityServices.slice(0, 8);

  return [listing.detailCategory, listing.subCategory].filter(Boolean).map((name) => ({ name }));
}

function getOfferItems(listing: ListingSummary): NamedImageItem[] {
  return parseJsonArray<NamedImageItem>(getString(listing.propertyDetails, "offers"))
    .filter((item) => item.name || item.detail || item.price)
    .slice(0, 4);
}

function getProducts(listing: ListingSummary) {
  return parseJsonArray<string>(getString(listing.propertyDetails, "products"))
    .filter(Boolean)
    .slice(0, 6);
}

function getServiceAreas(listing: ListingSummary) {
  const landmark = getString(listing.locationDetails, "landmark");
  return [
    ...splitWords(landmark),
    getString(listing.locationDetails, "city") || listing.city || "",
    getString(listing.locationDetails, "state"),
  ].filter(Boolean).slice(0, 8);
}

function getDetailRows(listing: ListingSummary): Array<[string, LooseValue]> {
  if (listing.categoryName === "Restaurants & Food") {
    const amenities = getArray(listing.restaurantFoodDetails, "amenities");
    return [
      ["Business name", getString(listing.restaurantFoodDetails, "businessName") || listing.title],
      ["Cuisine", getString(listing.restaurantFoodDetails, "cuisineType")],
      ["Business type", getString(listing.restaurantFoodDetails, "businessType")],
      ["Service types", getArray(listing.restaurantFoodDetails, "serviceTypes").join(", ")],
      ["Average cost for two", getValue(listing.restaurantFoodDetails, "averageCostForTwo")],
      ["Delivery", getBooleanText(listing.restaurantFoodDetails, "deliveryAvailable")],
      ["Online ordering", getBooleanText(listing.restaurantFoodDetails, "onlineOrderingAvailable")],
      ["Amenities", amenities.join(", ")],
    ];
  }

  if (listing.categoryName === "Vehicles") {
    return [
      ["Brand", getString(listing.vehicleDetails, "brand")],
      ["Model", getString(listing.vehicleDetails, "model")],
      ["Year", getValue(listing.vehicleDetails, "yearOfManufacture")],
      ["Condition", getString(listing.vehicleDetails, "vehicleCondition")],
      ["Fuel", getString(listing.vehicleDetails, "fuelType")],
      ["Transmission", getString(listing.vehicleDetails, "transmission")],
      ["KM driven", getValue(listing.vehicleDetails, "kmDriven")],
      ["Features", getArray(listing.vehicleDetails, "features").join(", ")],
    ];
  }

  if (listing.categoryName === "Electronics & Appliances") {
    return [
      ["Brand", getString(listing.electronicsDetails, "brand")],
      ["Model", getString(listing.electronicsDetails, "modelNameNumber")],
      ["Condition", getString(listing.electronicsDetails, "condition")],
      ["Purchase year", getValue(listing.electronicsDetails, "purchaseYear")],
      ["Warranty", getBooleanText(listing.electronicsDetails, "warranty")],
      ["RAM", getString(listing.electronicsDetails, "ram")],
      ["Storage", getString(listing.electronicsDetails, "storage")],
      ["Processor", getString(listing.electronicsDetails, "processor")],
      ["Screen size", getString(listing.electronicsDetails, "screenSize")],
      ["Capacity", getString(listing.electronicsDetails, "capacity")],
      ["Features", getArray(listing.electronicsDetails, "features").join(", ")],
    ];
  }

  if (listing.categoryName === "Care Services") {
    return [
      ["Provider type", getString(listing.careServiceDetails, "providerType")],
      ["Experience", getValue(listing.careServiceDetails, "experienceYears")],
      ["Languages", getArray(listing.careServiceDetails, "languagesSpoken").join(", ")],
      ["Services", getArray(listing.careServiceDetails, "servicesOffered").join(", ")],
      ["Availability", getString(listing.careServiceDetails, "availabilityType")],
      ["Available days", getArray(listing.careServiceDetails, "availableDays").join(", ")],
      ["Time slots", getString(listing.careServiceDetails, "availableTimeSlots")],
      ["Rate type", getString(listing.careServiceDetails, "rateType")],
      ["CPR certified", getBooleanText(listing.careServiceDetails, "cprCertified")],
      ["Background check", getBooleanText(listing.careServiceDetails, "backgroundCheck")],
      ["Age groups", getArray(listing.careServiceDetails, "ageGroups").join(", ")],
    ];
  }

  return [
    ["Property type", getString(listing.propertyDetails, "propertyType")],
    ["BHK", getString(listing.propertyDetails, "bhk")],
    ["Bathrooms", getValue(listing.propertyDetails, "bathrooms")],
    ["Balconies", getValue(listing.propertyDetails, "balconies")],
    ["Furnishing", getString(listing.propertyDetails, "furnishingType")],
    ["Super built-up area", getValue(listing.propertyDetails, "superBuiltUpArea")],
    ["Carpet area", getValue(listing.propertyDetails, "carpetArea")],
    ["Availability", getString(listing.propertyDetails, "availability")],
    ["Seller type", getString(listing.sellerInformation, "sellerType")],
  ];
}

function getBusinessHours(listing: ListingSummary) {
  const savedHours = parseJsonArray<Record<string, LooseValue>>(getString(listing.propertyDetails, "businessHours"));
  const hours = savedHours.length
    ? savedHours.map((item) => ({
        day: getString(item, "day") || "Day",
        time: getString(item, "status") === "Closed" ? "Closed" : formatHourRange(getString(item, "open"), getString(item, "close"), Boolean(item.is24Hours)),
      }))
    : (listing.restaurantOperatingHours || []).map((item) => ({
        day: getString(item, "dayOfWeek") || "Day",
        time: getBoolean(item, "isOpen") ? formatHourRange(getString(item, "openTime"), getString(item, "closeTime"), getBoolean(item, "is24Hours")) : "Closed",
      }));

  return hours.filter((item) => item.day && item.time).slice(0, 7);
}

function getTodayHours(hours: Array<{ day: string; time: string }>) {
  if (!hours.length) return null;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  return hours.find((item) => item.day.toLowerCase() === today) || hours[0];
}

function getCompanyRows(listing: ListingSummary): Array<[string, LooseValue]> {
  const contactInfo = parseJsonRecord(getString(listing.propertyDetails, "additionalContactInfo"));
  return [
    ["Phone", getString(listing.sellerInformation, "mobileNumber") || getString(contactInfo, "mainPhone")],
    ["Email", getString(listing.sellerInformation, "email") || getString(contactInfo, "email")],
    ["WhatsApp", getString(listing.sellerInformation, "whatsAppNumber")],
    ["Pincode", getString(listing.locationDetails, "pincode")],
    ["Verified", getBooleanText(listing.settings, "verifiedByAdmin")],
    ["Ad type", getString(listing.settings, "adType")],
  ];
}

function getAmenityLabels(listing: ListingSummary) {
  const amenityLabels: Record<string, string> = {
    parking: "Parking",
    lift: "Lift",
    powerBackup: "Power backup",
    security: "Security",
    gym: "Gym",
    swimmingPool: "Swimming pool",
    garden: "Garden",
    childrensPlayArea: "Children play area",
    cctv: "CCTV",
  };

  return Object.entries(listing.amenities || {})
    .filter(([, value]) => value === true)
    .map(([key]) => amenityLabels[key] || key);
}

function buildBackHref(listing: ListingSummary) {
  const params = new URLSearchParams();
  const category = getCategorySlug(listing);

  if (category) params.set("category", category);
  if (listing.city) params.set("city", listing.city);

  const query = params.toString();
  return query ? `/all-listing?${query}` : "/all-listing";
}

function getString(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getValue(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined || Array.isArray(value) ? "" : value;
}

function getArray(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function getBoolean(record: Record<string, LooseValue> | undefined, key: string) {
  return record?.[key] === true;
}

function getBooleanText(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "boolean" ? (value ? "Yes" : "No") : "";
}

function getNumber(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : null;
}

function parseJsonArray<T>(value: string): T[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) as T[] : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: string): LooseRecord {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as LooseRecord : {};
  } catch {
    return {};
  }
}

function splitWords(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function formatHourRange(open: string, close: string, is24Hours: boolean) {
  if (is24Hours) return "Open 24 hours";
  if (!open && !close) return "Open";
  return `${stripSeconds(open)} - ${stripSeconds(close)}`;
}

function stripSeconds(value: string) {
  return value.replace(/:00$/, "");
}

function formatValue(value: LooseValue) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function normalizeWebsite(value: string) {
  if (!value) return null;
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return { href, label: value.replace(/^https?:\/\//i, "") };
}

function numbersOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMonthYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(value?: number | null, country?: string) {
  if (!value) {
    return "Price on request";
  }

  return formatCurrencyAmount(value, country);
}

function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
}

function getDynamicImage(preferred: string | undefined, galleryImages: string[], fallback: string, index: number) {
  return preferred || galleryImages[index % galleryImages.length] || fallback;
}

function buildMapUrl(address: string) {
  const query = address || "New York, NY, USA";
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute("href");
  if (!href?.startsWith("#") || href === "#!") return;

  event.preventDefault();
  const target = document.querySelector(href);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
