import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, SyntheticEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  getListing,
  getListingApiErrorMessage,
  getNearbyServices,
  getPublicListings,
  submitListingReview,
  type ListingSummary,
  type NearbyService,
  type PublicListingQuery,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
} from "../../dashboard/utils/listingImages";
import { getCurrentCustomerUserId, isCustomerAuthenticated } from "../../auth/utils/customerSession";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import { shouldShowQuoteAction } from "../utils/quoteVisibility";
import "../styles/publicListings.css";

type LooseValue = string | number | boolean | string[] | null | undefined;
type LooseRecord = Record<string, LooseValue>;
type NamedImageItem = { name: string; imageName?: string; detail?: string; price?: string | number; link?: string };
type PostedMediaValue = { kind: "image" | "video" | "link"; src: string; label?: string; embed?: boolean };
type PostedDetailValue = string | PostedMediaValue | PostedMediaValue[];
type PostedDetailSection = {
  title: string;
  rows: Array<{ label: string; value: PostedDetailValue }>;
};

const nearbyServiceCategories = ["Schools", "Groceries", "Hospitals", "Beauty Salons", "Restaurants", "Lawyers"];

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
          pageSize: 12,
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
  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([]);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
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
  const isRealEstateListing = listing.categoryName === "Real Estate";
  const showQuoteAction = shouldShowQuoteAction(listing);
  const nearbyLocation = getNearbyLocation(listing);
  const savedNearbyServices = getSavedNearbyServices(listing);
  const postedDetailSections = getPostedDetailSections(listing);
  const quickNavItems = [
    { href: "#ld-abo", icon: "person", label: "About", show: true },
    { href: "#ld-details", icon: "fact_check", label: "Details", show: postedDetailSections.length > 0 },
    { href: "#ld-off", icon: "style", label: "Offers", show: offers.length > 0 },
    { href: "#location", icon: "map", label: "Location", show: true },
    { href: "#ld-rev", icon: "star_half", label: "Write Review", show: true },
    { href: "#claim", icon: "store", label: "Claim business", show: true },
  ];

  useEffect(() => {
    let isActive = true;

    async function loadNearbyServices() {
      if (!isRealEstateListing || !nearbyLocation) {
        setNearbyServices([]);
        setIsNearbyLoading(false);
        return;
      }

      try {
        setIsNearbyLoading(true);
        const services = await getNearbyServices({
          latitude: nearbyLocation.latitude,
          longitude: nearbyLocation.longitude,
          categories: nearbyServiceCategories,
          radiusMiles: 5,
          limitPerCategory: 5,
        });

        if (isActive) {
          setNearbyServices(services);
        }
      } catch {
        if (isActive) {
          setNearbyServices([]);
        }
      } finally {
        if (isActive) {
          setIsNearbyLoading(false);
        }
      }
    }

    void loadNearbyServices();

    return () => {
      isActive = false;
    };
  }, [isRealEstateListing, nearbyLocation?.latitude, nearbyLocation?.longitude]);

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
                <ul className="public-detail-quick-tabs">
                  {quickNavItems.filter((item) => item.show).map((item, index) => (
                    <li className={index === 0 ? "active" : ""} key={item.href}>
                      <a href={item.href} onClick={scrollToSection}><i className="material-icons">{item.icon}</i> {item.label}</a>
                    </li>
                  ))}
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

                {postedDetailSections.length ? (
                  <PostedDetailsSection sections={postedDetailSections} />
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

                {isRealEstateListing ? (
                  <TemplateSection id="nearby-services" title="Nearby services">
                    <div className="list-pg-inn-sp">
                      <NearbyServicesPanel
                        address={address}
                        services={savedNearbyServices.length ? savedNearbyServices : nearbyServices}
                        isLoading={!savedNearbyServices.length && isNearbyLoading}
                      />
                    </div>
                  </TemplateSection>
                ) : null}

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

                <section id="ld-user-reviews" className="pglist-p3 pglist-bg pglist-p-com">
                  <div className="pglist-p-com-ti">
                    <h3><span>User</span> Reviews</h3>
                  </div>
                  <div className="list-pg-inn-sp">
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
                      <CompactRatingSummary rating={displayRating} reviews={reviews} totalReviews={listing.totalReviews || 0} />
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
                        {showQuoteAction ? (
                          <li>{email ? <a href={`mailto:${email}`} className="pulse cta cta-get">Get quote</a> : <span className="pulse cta cta-get">Get quote</span>}</li>
                        ) : null}
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

                <TemplateSection id="company-info" eyebrow="Company" title="Info" className="pglist-p3">
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
                      <InfoList rows={companyRows.slice(0, 10)} />
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

                <div id="created-by" className="ld-rhs-pro pglist-bg pglist-p-com">
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

                <div id="business-profile" className="ld-rhs-pro pglist-bg pglist-p-com">
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

function PostedDetailsSection({ sections }: { sections: PostedDetailSection[] }) {
  const sectionGroups = useMemo(() => chunkArray(sections, 5), [sections]);
  const [activeSectionTitles, setActiveSectionTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    setActiveSectionTitles((currentTitles) => {
      const nextTitles: Record<number, string> = {};
      sectionGroups.forEach((group, index) => {
        const currentTitle = currentTitles[index];
        nextTitles[index] = group.some((section) => section.title === currentTitle)
          ? currentTitle
          : group[0]?.title || "";
      });
      return nextTitles;
    });
  }, [sectionGroups]);

  if (!sectionGroups.length) {
    return null;
  }

  return (
    <TemplateSection id="ld-details" eyebrow="Posted" title="Details" className="public-posted-details-section">
      <div className="list-pg-inn-sp">
        {sectionGroups.map((group, groupIndex) => {
          const activeTitle = activeSectionTitles[groupIndex] || group[0]?.title || "";
          const activeSection = group.find((section) => section.title === activeTitle) || group[0];

          return (
            <div className="public-posted-detail-group" key={`posted-detail-group-${groupIndex}`}>
              <div className="public-posted-detail-tabs" role="tablist" aria-label={`Posted detail sections ${groupIndex + 1}`}>
                {group.map((section) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={section.title === activeSection.title}
                    className={section.title === activeSection.title ? "active" : ""}
                    key={section.title}
                    onClick={() => setActiveSectionTitles((currentTitles) => ({ ...currentTitles, [groupIndex]: section.title }))}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
              <div className="public-posted-detail-card" role="tabpanel">
                <h4>{activeSection.title}</h4>
                <dl>
                  {activeSection.rows.map((row) => (
                    <div key={`${activeSection.title}-${row.label}`}>
                      <dt>{row.label}</dt>
                      <dd><PostedDetailValueView value={row.value} /></dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          );
        })}
      </div>
    </TemplateSection>
  );
}

function CompactRatingSummary({
  rating,
  reviews,
  totalReviews,
}: {
  rating: number;
  reviews: NonNullable<ListingSummary["reviews"]>;
  totalReviews: number;
}) {
  const counts = getRatingCounts(reviews);
  const reviewTotal = Math.max(totalReviews, reviews.length);
  const displayRating = rating > 0 ? rating : getAverageRatingFromReviews(reviews);

  return (
    <div className="public-profile-rating">
      <div className="public-profile-rating-main">
        <strong>{displayRating ? displayRating.toFixed(1) : "0.0"}</strong>
        <RatingStars rating={displayRating} />
      </div>
      <div className="public-profile-rating-bars" aria-label="Rating breakdown">
        {[5, 4, 3, 2, 1].map((value) => {
          const count = counts[value] || 0;
          const percentage = reviewTotal ? Math.min(100, (count / reviewTotal) * 100) : 0;

          return (
            <div className={`public-profile-rating-bar public-profile-rating-bar-${value}`} key={value}>
              <span>{value}*</span>
              <div>
                <b style={{ width: `${percentage}%` }} />
              </div>
              <em>{count}</em>
            </div>
          );
        })}
      </div>
      <p><b>{displayRating ? displayRating.toFixed(1) : "0.0"}</b> average based on {reviewTotal} Reviews</p>
    </div>
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

function NearbyServicesPanel({
  address,
  services,
  isLoading,
}: {
  address: string;
  services: NearbyService[];
  isLoading: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState(nearbyServiceCategories[0]);
  const visibleServices = services
    .filter((service) => service.category === activeCategory)
    .sort((left, right) => (left.distanceMiles ?? Number.MAX_VALUE) - (right.distanceMiles ?? Number.MAX_VALUE));
  const fallbackRows = buildNearbyFallbackRows(activeCategory, address);
  const rows = visibleServices.length ? visibleServices : fallbackRows;

  return (
    <div className="public-nearby-services">
      <div className="public-nearby-tabs" role="tablist" aria-label="Nearby services">
        {nearbyServiceCategories.map((category) => (
          <button
            type="button"
            role="tab"
            aria-selected={category === activeCategory}
            className={category === activeCategory ? "active" : ""}
            key={category}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="public-nearby-list" role="tabpanel">
        {isLoading ? <div className="public-nearby-loading">Loading nearby services...</div> : null}
        {!isLoading && rows.map((service, index) => (
          <a
            href={buildNearbyServiceHref(service, activeCategory, address)}
            target="_blank"
            rel="noreferrer"
            className="public-nearby-row"
            key={`${service.name}-${index}`}
          >
            <span className="public-nearby-icon"><i className="material-icons">location_on</i></span>
            <span>
              <strong>{service.name}</strong>
              {service.address ? <small>{service.address}</small> : null}
            </span>
            {service.distanceMiles !== null && service.distanceMiles !== undefined ? (
              <em>{service.distanceMiles.toFixed(2)} miles</em>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}

function getSavedNearbyServices(listing: ListingSummary): NearbyService[] {
  const otherInformation = parseJsonRecord(getString(listing.propertyDetails, "otherInformation"));
  const categoryAttributes = otherInformation.categoryAttributes && typeof otherInformation.categoryAttributes === "object" && !Array.isArray(otherInformation.categoryAttributes)
    ? otherInformation.categoryAttributes as Record<string, unknown>
    : {};
  const rawNearbyServices = categoryAttributes.nearby_services;

  if (typeof rawNearbyServices !== "string" || !rawNearbyServices.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawNearbyServices);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    const record = parsed as Record<string, unknown>;
    return nearbyServiceCategories.flatMap((category) => {
      const values = Array.isArray(record[category]) ? record[category].map(String) : [];
      return values
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ category, name }));
    });
  } catch {
    return [];
  }
}

function getPostedDetailSections(listing: ListingSummary): PostedDetailSection[] {
  const sections: PostedDetailSection[] = [];
  const otherInformation = parseUnknownRecord(getString(listing.propertyDetails, "otherInformation"));
  const categoryAttributes = asUnknownRecord(otherInformation.categoryAttributes);
  const customFields = asUnknownRecord(otherInformation.customFields);
  const categoryName = listing.categoryName || "";
  const isClassified = categoryName === "Classifieds";
  const classifiedCategory = getUnknownString(otherInformation, "classifiedCategory");
  const effectiveCategoryName = isClassified ? classifiedCategory : categoryName;
  const isRealEstate = effectiveCategoryName === "Real Estate";
  const isRestaurant = effectiveCategoryName === "Restaurants & Food";
  const isVehicle = effectiveCategoryName === "Vehicles";
  const isElectronics = effectiveCategoryName === "Electronics & Appliances";
  const isCareService = effectiveCategoryName === "Care Services";
  const mediaRows: Array<[string, unknown]> = [
    ["Profile image", listing.logoUrl],
    ["Cover banner", listing.coverBannerUrl],
    ["Primary image", listing.primaryImageUrl],
    ["Gallery images", listing.imageUrls || []],
    ["Video URL", listing.videoUrl],
    ["Virtual tour URL", listing.virtualTourUrl],
  ];

  addPostedSection(sections, "Listing Info", [
    ["Title", listing.title],
    ["Description", listing.description],
    ["Category", effectiveCategoryName || listing.categoryName],
    ["Sub category", isClassified ? getUnknownString(otherInformation, "classifiedSubCategory") || listing.subCategory : listing.subCategory],
    ["Detailed category", isClassified ? "" : listing.detailCategory],
  ]);
  addPostedRecordSection(sections, "Location Details", listing.locationDetails);
  addPostedRecordSection(sections, "Pricing", listing.priceDetails);

  if (isRealEstate && !isClassified) {
    addPostedRecordSection(sections, "Property Details", listing.propertyDetails, [
      "otherInformation",
      "services",
      "offers",
      "businessHours",
      "additionalContactInfo",
      "webLinks",
      "socialLinks",
      "products",
      "brands",
      "paymentMethods",
      "restaurantInfo",
    ]);
    addPostedRecordSection(sections, "Amenities", listing.amenities);
  }

  addPostedRecordSection(sections, "Category Fields", categoryAttributes);
  addPostedRecordSection(sections, "Custom Fields", customFields);

  if (isRestaurant && !isClassified) {
    addPostedRecordSection(sections, "Restaurant Details", listing.restaurantFoodDetails);
    addPostedListSection(sections, "Restaurant Menu", listing.restaurantMenuItems);
  }

  if (isVehicle && !isClassified) {
    addPostedRecordSection(sections, "Vehicle Details", listing.vehicleDetails);
  }

  if (isElectronics && !isClassified) {
    addPostedRecordSection(sections, "Electronics Details", listing.electronicsDetails);
  }

  if (isCareService && !isClassified) {
    addPostedRecordSection(sections, "Care Service Details", listing.careServiceDetails);
  }

  addPostedSection(sections, "Media", mediaRows);

  return sections;
}

function addPostedSection(sections: PostedDetailSection[], title: string, rows: Array<[string, unknown]>) {
  const seenLabels = new Set<string>();
  const filteredRows = rows
    .map(([label, value]) => ({ label, value: formatPostedValue(value) }))
    .filter((row): row is { label: string; value: PostedDetailValue } => {
      if (row.value === null) return false;

      const labelKey = normalizePostedFieldIdentity(row.label);
      if (seenLabels.has(labelKey)) return false;

      seenLabels.add(labelKey);
      return true;
    });

  if (filteredRows.length) {
    sections.push({ title, rows: filteredRows });
  }
}

function addPostedRecordSection(
  sections: PostedDetailSection[],
  title: string,
  record: Record<string, unknown> | undefined,
  excludedKeys: string[] = []
) {
  if (!record) return;

  const excluded = new Set(excludedKeys);
  const seenKeys = new Set<string>();
  addPostedSection(
    sections,
    title,
    Object.entries(record)
      .filter(([key]) => {
        if (excluded.has(key) || isHiddenPostedDetailKey(key)) return false;

        const fieldKey = normalizePostedFieldIdentity(key);
        if (seenKeys.has(fieldKey)) return false;

        seenKeys.add(fieldKey);
        return true;
      })
      .map(([key, value]) => [formatPostedLabel(key), value])
  );
}

function addPostedListSection(
  sections: PostedDetailSection[],
  title: string,
  items: Array<Record<string, unknown>> | undefined
) {
  if (!items?.length) return;

  addPostedSection(
    sections,
    title,
    items.map((item, index) => [`Item ${index + 1}`, item])
  );
}

function isHiddenPostedDetailKey(key: string) {
  const normalizedKey = key.trim();
  const lowerKey = normalizedKey.toLowerCase();

  return (
    lowerKey === "id" ||
    lowerKey === "userid" ||
    lowerKey === "listingid" ||
    lowerKey === "status" ||
    lowerKey === "views" ||
    lowerKey === "createdat" ||
    lowerKey === "updatedat" ||
    lowerKey === "created" ||
    lowerKey === "updated" ||
    /id$/i.test(normalizedKey)
  );
}

function normalizePostedFieldIdentity(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function PostedDetailValueView({ value }: { value: PostedDetailValue }) {
  if (typeof value === "string") {
    return <>{value}</>;
  }

  const items = Array.isArray(value) ? value : [value];

  return (
    <div className="public-posted-media-list">
      {items.map((item, index) => {
        const src = getPostedMediaSrc(item.src);

        if (item.kind === "image") {
          return <img key={`${item.src}-${index}`} src={src} alt={item.label || "Uploaded image"} loading="lazy" onError={hideBrokenImage} />;
        }

        if (item.kind === "video") {
          return item.embed ? (
            <iframe key={`${item.src}-${index}`} src={src} title={item.label || "Uploaded video"} loading="lazy" allowFullScreen />
          ) : (
            <video key={`${item.src}-${index}`} src={src} controls />
          );
        }

        return (
          <a key={`${item.src}-${index}`} href={src} target="_blank" rel="noreferrer">
            {item.label || "Open file"}
          </a>
        );
      })}
    </div>
  );
}

function formatPostedValue(value: unknown): PostedDetailValue | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return null;

    const parsed = parsePostedJson(trimmed);
    if (parsed !== undefined) {
      return formatPostedValue(parsed);
    }

    return getPostedMediaValue(trimmed) || trimmed;
  }

  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    const formatted = value.map(formatPostedValue).filter((item): item is PostedDetailValue => item !== null);
    const mediaItems = formatted.flatMap((item) => Array.isArray(item) ? item : typeof item === "string" ? [] : [item]);

    if (mediaItems.length === formatted.length) {
      return mediaItems;
    }

    const textItems = formatted.map(formatPostedValueAsText).filter(Boolean);
    return textItems.length ? textItems.join(", ") : null;
  }

  if (typeof value === "object") {
    const seenKeys = new Set<string>();
    const rows = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => {
        if (isHiddenPostedDetailKey(key)) return false;

        const fieldKey = normalizePostedFieldIdentity(key);
        if (seenKeys.has(fieldKey)) return false;

        seenKeys.add(fieldKey);
        return true;
      })
      .map(([key, nestedValue]) => {
        const formatted = formatPostedValue(nestedValue);
        const text = formatted ? formatPostedValueAsText(formatted) : "";
        return text ? `${formatPostedLabel(key)}: ${text}` : "";
      })
      .filter(Boolean);

    return rows.length ? rows.join("; ") : null;
  }

  return null;
}

function parsePostedJson(value: string) {
  if (!/^[\[{]/.test(value)) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function getPostedMediaValue(value: string): PostedMediaValue | null {
  const iframeSrc = getIframeSrc(value);
  const source = iframeSrc || value;
  const videoEmbedUrl = getVideoEmbedUrl(source);

  if (isImageSource(source)) {
    return { kind: "image", src: source };
  }

  if (videoEmbedUrl) {
    return { kind: "video", src: videoEmbedUrl, embed: true };
  }

  if (isVideoSource(source)) {
    return { kind: "video", src: source };
  }

  if (isUrlOrUploadPath(source)) {
    return { kind: "link", src: source, label: getPostedLinkLabel(source) };
  }

  return null;
}

function getPostedMediaSrc(src: string) {
  return isUploadPath(src) ? resolveListingImageUrl(src) : src;
}

function formatPostedValueAsText(value: PostedDetailValue): string {
  if (typeof value === "string") return value;

  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => item.label || (item.kind === "image" ? "Image" : item.kind === "video" ? "Video" : "File")).join(", ");
}

function isImageSource(value: string) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?(#.*)?$/i.test(value);
}

function isVideoSource(value: string) {
  return /\.(m4v|mov|mp4|ogg|ogv|webm)(\?.*)?(#.*)?$/i.test(value);
}

function isUrlOrUploadPath(value: string) {
  return isUploadPath(value) || /^https?:\/\//i.test(value);
}

function isUploadPath(value: string) {
  return /^\/?uploads\//i.test(value);
}

function getIframeSrc(value: string) {
  const match = value.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function getVideoEmbedUrl(value: string) {
  const youtubeMatch = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]+)/i);
  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return "";
}

function getPostedLinkLabel(value: string) {
  if (isUploadPath(value)) return "Open file";
  return "Open link";
}

function parseUnknownRecord(value: string): Record<string, unknown> {
  const parsed = parsePostedJson(value);
  return asUnknownRecord(parsed);
}

function asUnknownRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getUnknownString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function formatPostedLabel(key: string) {
  const knownLabels: Record<string, string> = {
    bhk: "BHK",
    hoaFees: "HOA Fees",
    reraNumber: "RERA / License",
    whatsAppNumber: "WhatsApp",
    videoUrl: "Video URL",
    websiteUrl: "Website URL",
    isMobileOtpVerified: "Mobile OTP Verified",
    onlineOrderingAvailable: "Online Ordering",
    deliveryAvailable: "Delivery",
    cprCertified: "CPR Certified",
    kmDriven: "KM Driven",
  };

  if (knownLabels[key]) return knownLabels[key];

  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRatingCounts(reviews: NonNullable<ListingSummary["reviews"]>) {
  return reviews.reduce<Record<number, number>>((counts, review) => {
    const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
    counts[rating] = (counts[rating] || 0) + 1;
    return counts;
  }, {});
}

function getAverageRatingFromReviews(reviews: NonNullable<ListingSummary["reviews"]>) {
  if (!reviews.length) return 0;
  return reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
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
  if (listing.categoryName === "Furniture & Home" || listing.categoryName === "Furniture & Home Decor") return "furniture-home-decor";
  if (listing.categoryName === "Fashion & Lifestyle") return "fashion-lifestyle";
  if (listing.categoryName === "Beauty Services") return "beauty-services";
  if (listing.categoryName === "Books, Sports & Hobbies") return "books-sports-hobbies";
  if (listing.categoryName === "Roommates & Rentals") return "roommates-rentals";
  if (listing.categoryName === "Jobs") return "jobs";
  if (listing.categoryName === "Events & Tickets" || listing.categoryName === "Tickets & Events") return "events-tickets";
  if (listing.categoryName === "Groups & Communities") return "groups-communities";
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

function getNearbyLocation(listing: ListingSummary) {
  const latitude = getCoordinate(listing.locationDetails, "latitude");
  const longitude = getCoordinate(listing.locationDetails, "longitude");

  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

function buildNearbyFallbackRows(category: string, address: string): NearbyService[] {
  const location = address || "near this property";

  return [
    {
      category,
      name: `${category} near property`,
      address: location,
      distanceMiles: null,
    },
  ];
}

function buildNearbyServiceHref(service: NearbyService, category: string, address: string) {
  if (service.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name)}&query_place_id=${encodeURIComponent(service.placeId)}`;
  }

  return `https://www.google.com/maps/search/${encodeURIComponent(`${service.name || category} near ${address || "property"}`)}`;
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

function getBusinessHours(listing: ListingSummary) {
  if (listing.categoryName === "Real Estate") {
    return [];
  }

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
  ];
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

function getBoolean(record: Record<string, LooseValue> | undefined, key: string) {
  return record?.[key] === true;
}

function getNumber(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : null;
}

function getCoordinate(record: Record<string, LooseValue> | undefined, key: string) {
  const value = record?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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
