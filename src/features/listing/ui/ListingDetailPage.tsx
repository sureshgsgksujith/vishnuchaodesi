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
import { getQuoteActionLabel, shouldShowQuoteAction } from "../utils/quoteVisibility";
import { submitJobApplication, submitRequirement } from "../api/requirementsApi";
import { getMyProfile } from "../../dashboard/api/profileApi";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";
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
type ListingInteractionProps = {
  reviews: NonNullable<ListingSummary["reviews"]>;
  reviewRating: number;
  reviewMessage: string;
  reviewSuccess: string;
  reviewError: string;
  isReviewSubmitting: boolean;
  loginPrompt: { title: string; message: string } | null;
  quoteForm: { name: string; email: string; mobileNumber: string; message: string };
  quoteStatus: string;
  quoteActionLabel: string;
  isQuoteModalOpen: boolean;
  isQuoteProfileLoading: boolean;
  isQuoteSubmitting: boolean;
  onReviewRatingChange: (rating: number) => void;
  onReviewMessageChange: (message: string) => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLoginPromptClose: () => void;
  onOpenQuote: () => void;
  onQuoteChange: (updates: Partial<{ name: string; email: string; mobileNumber: string; message: string }>) => void;
  onQuoteClose: () => void;
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const nearbyServiceCategories = ["Schools", "Groceries", "Hospitals", "Beauty Salons", "Restaurants", "Lawyers"];
const allowedResumeExtensions = [".pdf", ".doc", ".docx"];
const resumeAcceptTypes = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const maxResumeFileBytes = 10 * 1024 * 1024;

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
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    message: "",
  });
  const [quoteStatus, setQuoteStatus] = useState("");
  const [isQuoteProfileLoading, setIsQuoteProfileLoading] = useState(false);
  const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false);
  const [isJobApplicationModalOpen, setIsJobApplicationModalOpen] = useState(false);
  const [jobApplicationForm, setJobApplicationForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    message: "",
  });
  const [jobResumeFile, setJobResumeFile] = useState<File | null>(null);
  const [jobApplicationStatus, setJobApplicationStatus] = useState("");
  const [isJobApplicationProfileLoading, setIsJobApplicationProfileLoading] = useState(false);
  const [isJobApplicationSubmitting, setIsJobApplicationSubmitting] = useState(false);
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
  const isRoommatesRentalListing = listing.categoryName === "Roommates & Rentals";
  const isLocalServiceListing = isLocalServiceDetailListing(listing);
  const isJobsListing = listing.categoryName === "Jobs";
  const showReviewSections = !isJobsListing;
  const showQuoteAction = shouldShowQuoteAction(listing);
  const showEnquiryAction = !isJobsListing && showQuoteAction;
  const quoteActionLabel = getQuoteActionLabel(listing);
  const recruiterContactHref = getRecruiterContactHref(email, phone);
  const nearbyLocation = getNearbyLocation(listing);
  const savedNearbyServices = getSavedNearbyServices(listing);
  const postedDetailSections = getPostedDetailSections(listing);
  const quickNavItems = [
    { href: "#ld-abo", icon: "person", label: "About", show: true },
    { href: "#ld-details", icon: "fact_check", label: "Details", show: postedDetailSections.length > 0 },
    { href: "#ld-off", icon: "style", label: "Offers", show: offers.length > 0 },
    { href: "#location", icon: "map", label: "Location", show: true },
    { href: "#ld-rev", icon: "star_half", label: "Write Review", show: showReviewSections },
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
    if (isReviewSubmitting) {
      return;
    }

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

  async function openQuoteModal() {
    if (!isCustomerAuthenticated()) {
      setLoginPrompt({
        title: "Login required",
        message: "Please login to send your enquiry.",
      });
      return;
    }

    if (isOwnerViewing) {
      setLoginPrompt({
        title: "Owner action not needed",
        message: "You are the owner of this listing. You do not need to send an enquiry for your own post.",
      });
      return;
    }

    setIsQuoteModalOpen(true);
    setQuoteStatus("");
    setQuoteForm({
      name: localStorage.getItem("fullName") || localStorage.getItem("customer_name") || "",
      email: localStorage.getItem("email") || "",
      mobileNumber: localStorage.getItem("mobileNumber") || "",
      message: "",
    });
    setIsQuoteProfileLoading(true);

    try {
      const { profile } = await getMyProfile();
      setQuoteForm((current) => ({
        ...current,
        name: profile.fullName || current.name,
        email: profile.email || current.email,
        mobileNumber: profile.mobileNumber || current.mobileNumber,
      }));
    } finally {
      setIsQuoteProfileLoading(false);
    }
  }

  async function submitQuoteForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isQuoteSubmitting) {
      return;
    }

    setQuoteStatus("");
    setIsQuoteSubmitting(true);

    try {
      await submitRequirement({
        listingId: listing.id,
        listingTitle: listing.title,
        name: quoteForm.name,
        email: quoteForm.email,
        mobileNumber: quoteForm.mobileNumber,
        message: quoteForm.message,
        categoryName: listing.categoryName || "Listing",
        pageUrl: `${window.location.origin}/listing-details?id=${listing.id}`,
      });
      setQuoteStatus("Your enquiry has been sent successfully.");
      setQuoteForm((current) => ({ ...current, message: "" }));
      window.setTimeout(() => {
        setIsQuoteModalOpen(false);
        setQuoteStatus("");
      }, 1400);
    } catch {
      setQuoteStatus("Unable to send enquiry. Please try again.");
    } finally {
      setIsQuoteSubmitting(false);
    }
  }

  async function openJobApplicationModal() {
    if (!isCustomerAuthenticated()) {
      setLoginPrompt({
        title: "Login required",
        message: "Please login to apply for this job.",
      });
      return;
    }

    if (isOwnerViewing) {
      setLoginPrompt({
        title: "Owner action not needed",
        message: "You are the owner of this job listing. You do not need to apply for your own post.",
      });
      return;
    }

    setIsJobApplicationModalOpen(true);
    setJobApplicationStatus("");
    setJobResumeFile(null);
    setJobApplicationForm({
      name: localStorage.getItem("fullName") || localStorage.getItem("customer_name") || "",
      email: localStorage.getItem("email") || "",
      mobileNumber: localStorage.getItem("mobileNumber") || "",
      message: "",
    });
    setIsJobApplicationProfileLoading(true);

    try {
      const { profile } = await getMyProfile();
      setJobApplicationForm((current) => ({
        ...current,
        name: profile.fullName || current.name,
        email: profile.email || current.email,
        mobileNumber: profile.mobileNumber || current.mobileNumber,
      }));
    } finally {
      setIsJobApplicationProfileLoading(false);
    }
  }

  async function submitJobApplicationForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isJobApplicationSubmitting) {
      return;
    }

    setJobApplicationStatus("");

    if (!jobResumeFile) {
      setJobApplicationStatus("Please upload your resume.");
      return;
    }

    const resumeError = getResumeFileError(jobResumeFile);
    if (resumeError) {
      setJobApplicationStatus(resumeError);
      return;
    }

    setIsJobApplicationSubmitting(true);
    try {
      await submitJobApplication({
        listingId: listing.id,
        name: jobApplicationForm.name,
        email: jobApplicationForm.email,
        mobileNumber: jobApplicationForm.mobileNumber,
        message: jobApplicationForm.message,
        pageUrl: `${window.location.origin}/listing-details?id=${listing.id}`,
        resume: jobResumeFile,
      });
      setJobApplicationStatus("Your application has been sent successfully.");
      setJobApplicationForm((current) => ({ ...current, message: "" }));
      setJobResumeFile(null);
      window.setTimeout(() => {
        setIsJobApplicationModalOpen(false);
        setJobApplicationStatus("");
      }, 1400);
    } catch {
      setJobApplicationStatus("Unable to submit application. Please try again.");
    } finally {
      setIsJobApplicationSubmitting(false);
    }
  }

  function handleJobResumeChange(file: File | null) {
    setJobApplicationStatus("");

    if (!file) {
      setJobResumeFile(null);
      return true;
    }

    const resumeError = getResumeFileError(file);
    if (resumeError) {
      setJobResumeFile(null);
      setJobApplicationStatus(resumeError);
      return false;
    }

    setJobResumeFile(file);
    return true;
  }

  if (isRoommatesRentalListing) {
    return (
      <RoommatesRentalDetail
        listing={listing}
        relatedListings={relatedListings}
        galleryImages={galleryImages}
        postedDetailSections={postedDetailSections}
        reviews={reviews}
        reviewRating={reviewRating}
        reviewMessage={reviewMessage}
        reviewSuccess={reviewSuccess}
        reviewError={reviewError}
        isReviewSubmitting={isReviewSubmitting}
        loginPrompt={loginPrompt}
        quoteForm={quoteForm}
        quoteStatus={quoteStatus}
        quoteActionLabel={quoteActionLabel}
        isQuoteModalOpen={isQuoteModalOpen}
        isQuoteProfileLoading={isQuoteProfileLoading}
        isQuoteSubmitting={isQuoteSubmitting}
        onReviewRatingChange={setReviewRating}
        onReviewMessageChange={setReviewMessage}
        onReviewSubmit={handleReviewSubmit}
        onLoginPromptClose={() => setLoginPrompt(null)}
        onOpenQuote={openQuoteModal}
        onQuoteChange={(updates) => setQuoteForm((current) => ({ ...current, ...updates }))}
        onQuoteClose={() => setIsQuoteModalOpen(false)}
        onQuoteSubmit={submitQuoteForm}
      />
    );
  }

  if (isLocalServiceListing) {
    return (
      <LocalServiceDetail
        listing={listing}
        galleryImages={galleryImages}
        postedDetailSections={postedDetailSections}
        reviews={reviews}
        reviewRating={reviewRating}
        reviewMessage={reviewMessage}
        reviewSuccess={reviewSuccess}
        reviewError={reviewError}
        isReviewSubmitting={isReviewSubmitting}
        loginPrompt={loginPrompt}
        quoteForm={quoteForm}
        quoteStatus={quoteStatus}
        quoteActionLabel={quoteActionLabel}
        isQuoteModalOpen={isQuoteModalOpen}
        isQuoteProfileLoading={isQuoteProfileLoading}
        isQuoteSubmitting={isQuoteSubmitting}
        onReviewRatingChange={setReviewRating}
        onReviewMessageChange={setReviewMessage}
        onReviewSubmit={handleReviewSubmit}
        onLoginPromptClose={() => setLoginPrompt(null)}
        onOpenQuote={openQuoteModal}
        onQuoteChange={(updates) => setQuoteForm((current) => ({ ...current, ...updates }))}
        onQuoteClose={() => setIsQuoteModalOpen(false)}
        onQuoteSubmit={submitQuoteForm}
      />
    );
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

                {showReviewSections && !listing.totalReviews ? <div className="spa-first-review">Be the First One To Review This Listing!!!</div> : null}

                {showReviewSections ? (
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
                        <button type="submit" className="btn btn-primary app-loading-button" disabled={isReviewSubmitting} aria-busy={isReviewSubmitting}>
                          {isReviewSubmitting ? (
                            <>
                              <span className="app-button-spinner" aria-hidden="true"></span>
                              Submitting...
                            </>
                          ) : "Submit Review"}
                        </button>
                      </form>
                    </div>
                  </div>
                </TemplateSection>
                ) : null}

                {loginPrompt ? (
                  <LoginRequiredPrompt
                    title={loginPrompt.title}
                    message={loginPrompt.message}
                    onClose={() => setLoginPrompt(null)}
                  />
                ) : null}

                {showReviewSections ? (
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
                ) : null}
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
                      {showReviewSections ? <CompactRatingSummary rating={displayRating} reviews={reviews} totalReviews={listing.totalReviews || 0} /> : null}
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
                      <ul className={isJobsListing ? "row public-job-detail-actions" : "row"}>
                        {isJobsListing ? (
                          <>
                            <li><button type="button" className="cta cta-get public-job-apply-button" onClick={openJobApplicationModal}>Apply Now</button></li>
                            <li><a href={recruiterContactHref} className="cta cta-call">Contact Recruiter</a></li>
                          </>
                        ) : (
                          <>
                            <li>{phone ? <a href={`tel:${phone}`} className="cta cta-call">Call Now</a> : <span className="cta cta-call">Call Now</span>}</li>
                            {showEnquiryAction ? (
                              <li>
                                <button type="button" className="pulse cta cta-get public-detail-quote-button" onClick={openQuoteModal}>
                                  {quoteActionLabel}
                                </button>
                              </li>
                            ) : null}
                          </>
                        )}
                      </ul>
                    </div>
                    <div className="pg-list-oths">
                      <ul>
                        <li><span className="cta cta-like"><i className="material-icons">visibility</i><b>{listing.views || 0}</b> VIEWS</span></li>
                        {whatsapp ? <li><a href={`https://wa.me/${numbersOnly(whatsapp)}`} className="cta cta-rev" target="_blank" rel="noreferrer"><i className="material-icons">chat</i>WhatsApp</a></li> : null}
                        {!isJobsListing ? <li><button type="button" className="public-share-button" onClick={() => shareListing(listing)}><i className="material-icons">share</i>Share</button></li> : null}
                      </ul>
                    </div>
                  </div>
                </div>

                {!isJobsListing && isQuoteModalOpen ? (
                  <ListingQuoteModal
                    form={quoteForm}
                    isProfileLoading={isQuoteProfileLoading}
                    isSubmitting={isQuoteSubmitting}
                    listing={listing}
                    title={quoteActionLabel}
                    status={quoteStatus}
                    onChange={(updates) => setQuoteForm((current) => ({ ...current, ...updates }))}
                    onClose={() => setIsQuoteModalOpen(false)}
                    onSubmit={submitQuoteForm}
                  />
                ) : null}

                {isJobsListing && isJobApplicationModalOpen ? (
                  <JobApplicationModal
                    form={jobApplicationForm}
                    isProfileLoading={isJobApplicationProfileLoading}
                    isSubmitting={isJobApplicationSubmitting}
                    listing={listing}
                    resumeFile={jobResumeFile}
                    status={jobApplicationStatus}
                    onChange={(updates) => setJobApplicationForm((current) => ({ ...current, ...updates }))}
                    onClose={() => setIsJobApplicationModalOpen(false)}
                    onResumeChange={handleJobResumeChange}
                    onSubmit={submitJobApplicationForm}
                  />
                ) : null}

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
                            {!isJobsListing ? <span className="rat-small-num">{Number(item.averageRating || item.rating || 0).toFixed(1)}</span> : null}
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

function LocalServiceDetail({
  listing,
  galleryImages,
  postedDetailSections,
  reviews,
  reviewRating,
  reviewMessage,
  reviewSuccess,
  reviewError,
  isReviewSubmitting,
  loginPrompt,
  quoteForm,
  quoteStatus,
  quoteActionLabel,
  isQuoteModalOpen,
  isQuoteProfileLoading,
  isQuoteSubmitting,
  onReviewRatingChange,
  onReviewMessageChange,
  onReviewSubmit,
  onLoginPromptClose,
  onOpenQuote,
  onQuoteChange,
  onQuoteClose,
  onQuoteSubmit,
}: {
  listing: ListingSummary;
  galleryImages: string[];
  postedDetailSections: PostedDetailSection[];
} & ListingInteractionProps) {
  const details = getLocalServiceDisplayDetails(listing);
  const country = getString(listing.locationDetails, "country");
  const address = buildAddress(listing);
  const rating = Number(listing.averageRating || listing.rating || 0);
  const displayRating = rating > 0 ? rating : getAverageRatingFromReviews(reviews);
  const phone = details.phone || getString(listing.sellerInformation, "mobileNumber");
  const email = details.email || getString(listing.sellerInformation, "email");
  const whatsapp = details.whatsapp || getString(listing.sellerInformation, "whatsAppNumber") || phone;
  const website = normalizeWebsite(details.website || getString(listing.sellerInformation, "websiteUrl"));
  const serviceImage = galleryImages[0] || listing.primaryImageUrl || listing.logoUrl || "/template-17/classifieds/images/6.jpg";
  const ownerImage = listing.logoUrl || listing.primaryImageUrl || "";
  const features = getLocalServiceFeatures(listing);
  const packages = getLocalServicePackages(listing, country);
  const serviceItems = getLocalServiceItems(listing);
  const businessHours = getBusinessHours(listing);
  const todaysHours = getTodayHours(businessHours);
  const contactRows = getLocalServiceContactRows(listing, phone, email, whatsapp, website?.label || "");
  const infoRows = getLocalServiceInfoRows(listing, details);
  const quickNavItems = [
    { href: "#lsd-about", icon: "person", label: "Overview", show: true },
    { href: "#lsd-features", icon: "check_circle", label: "Features", show: features.length > 0 },
    { href: "#lsd-pricing", icon: "style", label: "Pricing", show: packages.length > 0 },
    { href: "#lsd-location", icon: "map", label: "Location", show: true },
    { href: "#lsd-contact", icon: "mail", label: "Contact", show: contactRows.length > 0 },
    { href: "#lsd-reviews", icon: "star_half", label: "Reviews", show: true },
    { href: "#lsd-posted", icon: "fact_check", label: "Details", show: postedDetailSections.length > 0 },
  ];

  return (
    <article className="public-local-service-detail">
      <section className="public-local-service-quick">
        <div className="container">
          <ul>
            {quickNavItems.filter((item) => item.show).map((item, index) => (
              <li className={index === 0 ? "active" : ""} key={item.href}>
                <a href={item.href} onClick={scrollToSection}>
                  <i className="material-icons" aria-hidden="true">{item.icon}</i>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="public-local-service-hero">
        <div className="container">
          <nav className="public-local-service-crumb" aria-label="breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>{listing.title}</span>
          </nav>
          <div className="public-local-service-hero-grid">
            <div>
              <h1>{listing.title}</h1>
              <p>{details.summary || listing.description || "Local service details are available from this provider."}</p>
              <div className="public-local-service-meta">
                {address ? <span><i className="material-icons" aria-hidden="true">place</i>{address}</span> : null}
                <span><i className="material-icons" aria-hidden="true">star</i>{displayRating ? displayRating.toFixed(1) : "0.0"} ({Math.max(listing.totalReviews || 0, reviews.length)} reviews)</span>
                <span><i className="material-icons" aria-hidden="true">verified_user</i>{details.verifiedText}</span>
              </div>
              <div className="public-local-service-actions">
                <button type="button" className="public-local-service-btn public-local-service-btn-primary" onClick={onOpenQuote}>
                  Get a free quote
                </button>
                {phone ? (
                  <a href={`tel:${phone}`} className="public-local-service-btn public-local-service-btn-light">
                    <i className="material-icons" aria-hidden="true">call</i>
                    Call now
                  </a>
                ) : null}
              </div>
            </div>
            <div className="public-local-service-hero-card">
              <img src={resolveListingImageUrl(serviceImage)} alt={listing.title} onError={hideBrokenImage} loading="eager" />
              <div>
                <strong>{formatPrice(listing.price, country)}</strong>
                <span>{details.serviceType || listing.detailCategory || listing.subCategory || "Service provider"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-local-service-sticky">
        <div className="container">
          <img src={resolveListingImageUrl(ownerImage || serviceImage)} alt="" onError={hideBrokenImage} loading="lazy" />
          <div>
            <strong>{listing.title}</strong>
            <span>{[details.categoryLabel, listing.city].filter(Boolean).join(" | ")}</span>
          </div>
          <RatingStars rating={displayRating} />
          <button type="button" onClick={onOpenQuote}>{quoteActionLabel}</button>
        </div>
      </section>

      <section className="public-local-service-body">
        <div className="container">
          <div className="public-local-service-layout">
            <main className="public-local-service-main">
              <LocalServiceCard id="lsd-about" title="About This Service" eyebrow="Overview">
                <p className="public-local-service-copy">{details.description || listing.description || "Details are not listed."}</p>
                <div className="public-local-service-highlights">
                  {infoRows.slice(0, 4).map(([label, value]) => (
                    <span key={label}>
                      <i className="material-icons" aria-hidden="true">done</i>
                      <b>{label}</b>
                      {formatValue(value)}
                    </span>
                  ))}
                </div>
              </LocalServiceCard>

              <LocalServiceCard title="Service Information">
                <InfoList rows={infoRows} />
              </LocalServiceCard>

              {features.length ? (
                <LocalServiceCard id="lsd-features" title="Features & Amenities">
                  <div className="public-local-service-features">
                    {features.map((feature) => (
                      <div key={feature.title}>
                        <span><i className="material-icons" aria-hidden="true">{feature.icon}</i></span>
                        <div>
                          <h4>{feature.title}</h4>
                          {feature.detail ? <p>{feature.detail}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </LocalServiceCard>
              ) : null}

              {serviceItems.length ? (
                <LocalServiceCard title="Services Offered">
                  <div className="public-local-service-items">
                    {serviceItems.map((service, index) => (
                      <div key={`${service.name}-${index}`}>
                        {getDynamicImage(service.imageName, galleryImages, serviceImage, index) ? (
                          <img src={resolveListingImageUrl(getDynamicImage(service.imageName, galleryImages, serviceImage, index))} alt="" onError={hideBrokenImage} loading="lazy" />
                        ) : null}
                        <strong>{service.name}</strong>
                      </div>
                    ))}
                  </div>
                </LocalServiceCard>
              ) : null}

              {packages.length ? (
                <LocalServiceCard id="lsd-pricing" title="Pricing & Packages">
                  <div className="public-local-service-packages">
                    {packages.map((servicePackage, index) => (
                      <div className={index === 1 ? "is-popular" : ""} key={`${servicePackage.name}-${index}`}>
                        {index === 1 ? <span className="public-local-service-popular">Most popular</span> : null}
                        <h4>{servicePackage.name}</h4>
                        <strong>{servicePackage.price}</strong>
                        {servicePackage.detail ? <p>{servicePackage.detail}</p> : null}
                        <button type="button" onClick={onOpenQuote}>Request Quote</button>
                      </div>
                    ))}
                  </div>
                </LocalServiceCard>
              ) : null}

              {galleryImages.length ? (
                <LocalServiceCard title="Gallery">
                  <div className="public-local-service-gallery">
                    {galleryImages.map((imageUrl, index) => (
                      <img key={`${imageUrl}-${index}`} src={resolveListingImageUrl(imageUrl)} alt="" onError={hideBrokenImage} loading="lazy" />
                    ))}
                  </div>
                </LocalServiceCard>
              ) : null}

              <LocalServiceCard id="lsd-location" title="Location">
                <p className="public-local-service-copy">{address || "Location details not listed."}</p>
                <div className="public-local-service-map">
                  <iframe
                    src={buildMapUrl(address)}
                    title={`${listing.title} location`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </LocalServiceCard>

              <LocalServiceCard id="lsd-contact" title="Contact Provider">
                <ul className="public-local-service-contact-list">
                  {contactRows.map(([label, value]) => (
                    <li key={label}>
                      <i className="material-icons" aria-hidden="true">{getContactIcon(label)}</i>
                      <span>{label}</span>
                      <b>{formatValue(value)}</b>
                    </li>
                  ))}
                </ul>
              </LocalServiceCard>

              {postedDetailSections.length ? (
                <LocalServiceCard id="lsd-posted" title="Posted Details" eyebrow="More">
                  <PostedDetailsSection sections={postedDetailSections} />
                </LocalServiceCard>
              ) : null}

              <LocalServiceCard id="lsd-reviews" title="Reviews">
                <form className="public-local-service-review-form" onSubmit={onReviewSubmit}>
                  <div className="public-review-rating-input" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={value <= reviewRating ? "active" : ""}
                        aria-label={`${value} star rating`}
                        onClick={() => onReviewRatingChange(value)}
                      >
                        <i className="material-icons" aria-hidden="true">star</i>
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="form-control"
                    placeholder="Write review"
                    value={reviewMessage}
                    onChange={(event) => onReviewMessageChange(event.target.value)}
                  />
                  {reviewSuccess ? <div className="alert alert-success">{reviewSuccess}</div> : null}
                  {reviewError ? <div className="alert alert-danger">{reviewError}</div> : null}
                  <button type="submit" className="app-loading-button" disabled={isReviewSubmitting} aria-busy={isReviewSubmitting}>
                    {isReviewSubmitting ? (
                      <>
                        <span className="app-button-spinner" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : "Submit Review"}
                  </button>
                </form>
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
              </LocalServiceCard>
            </main>

            <aside className="public-local-service-side">
              <div className="public-local-service-side-card">
                <div className="public-local-service-provider">
                  {ownerImage ? <img src={resolveListingImageUrl(ownerImage)} alt="" onError={hideBrokenImage} loading="lazy" /> : <span>{listing.title.charAt(0).toUpperCase()}</span>}
                  <div>
                    <h3>{listing.sellerName || getString(listing.sellerInformation, "name") || listing.title}</h3>
                    <p>{details.verifiedText}</p>
                  </div>
                </div>
                <button type="button" className="public-local-service-btn public-local-service-btn-primary" onClick={onOpenQuote}>{quoteActionLabel}</button>
                {phone ? <a href={`tel:${phone}`} className="public-local-service-btn public-local-service-btn-light">Call {phone}</a> : null}
                {whatsapp ? <a href={`https://wa.me/${numbersOnly(whatsapp)}`} className="public-local-service-btn public-local-service-btn-outline" target="_blank" rel="noreferrer">WhatsApp</a> : null}
              </div>

              <div className="public-local-service-side-card">
                <h3>Business Hours</h3>
                {todaysHours ? (
                  <div className="public-local-service-open">
                    <strong>{todaysHours.time === "Closed" ? "Closed" : "Open"}</strong>
                    <span>{todaysHours.day}: {todaysHours.time}</span>
                  </div>
                ) : null}
                {businessHours.length ? (
                  <ul className="public-local-service-hours">
                    {businessHours.map((item) => <li key={item.day}><span>{item.day}</span><b>{item.time}</b></li>)}
                  </ul>
                ) : (
                  <p>Business hours are not listed.</p>
                )}
              </div>

              <div className="public-local-service-side-card">
                <h3>Quick Info</h3>
                <InfoList rows={infoRows.slice(0, 8)} />
              </div>
            </aside>
          </div>

        </div>
      </section>

      {isQuoteModalOpen ? (
        <ListingQuoteModal
          form={quoteForm}
          isProfileLoading={isQuoteProfileLoading}
          isSubmitting={isQuoteSubmitting}
          listing={listing}
          title={quoteActionLabel}
          status={quoteStatus}
          onChange={onQuoteChange}
          onClose={onQuoteClose}
          onSubmit={onQuoteSubmit}
        />
      ) : null}

      {loginPrompt ? (
        <LoginRequiredPrompt
          title={loginPrompt.title}
          message={loginPrompt.message}
          onClose={onLoginPromptClose}
        />
      ) : null}
    </article>
  );
}

function LocalServiceCard({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="public-local-service-card">
      <div className="public-local-service-title">
        <h2>{eyebrow ? <span>{eyebrow}</span> : null}{title}</h2>
      </div>
      {children}
    </section>
  );
}

function RoommatesRentalDetail({
  listing,
  relatedListings,
  galleryImages,
  postedDetailSections,
  reviews,
  reviewRating,
  reviewMessage,
  reviewSuccess,
  reviewError,
  isReviewSubmitting,
  loginPrompt,
  quoteForm,
  quoteStatus,
  quoteActionLabel,
  isQuoteModalOpen,
  isQuoteProfileLoading,
  isQuoteSubmitting,
  onReviewRatingChange,
  onReviewMessageChange,
  onReviewSubmit,
  onLoginPromptClose,
  onOpenQuote,
  onQuoteChange,
  onQuoteClose,
  onQuoteSubmit,
}: {
  listing: ListingSummary;
  relatedListings: ListingSummary[];
  galleryImages: string[];
  postedDetailSections: PostedDetailSection[];
  reviews: NonNullable<ListingSummary["reviews"]>;
  reviewRating: number;
  reviewMessage: string;
  reviewSuccess: string;
  reviewError: string;
  isReviewSubmitting: boolean;
  loginPrompt: { title: string; message: string } | null;
  quoteForm: { name: string; email: string; mobileNumber: string; message: string };
  quoteStatus: string;
  quoteActionLabel: string;
  isQuoteModalOpen: boolean;
  isQuoteProfileLoading: boolean;
  isQuoteSubmitting: boolean;
  onReviewRatingChange: (rating: number) => void;
  onReviewMessageChange: (message: string) => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLoginPromptClose: () => void;
  onOpenQuote: () => void;
  onQuoteChange: (updates: Partial<{ name: string; email: string; mobileNumber: string; message: string }>) => void;
  onQuoteClose: () => void;
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const details = getRoommatesRentalDisplayDetails(listing);
  const country = getString(listing.locationDetails, "country");
  const address = buildAddress(listing);
  const phone = details.phone || getString(listing.sellerInformation, "mobileNumber");
  const email = details.email || getString(listing.sellerInformation, "email");
  const whatsapp = getString(listing.sellerInformation, "whatsAppNumber") || phone;
  const images = getRoommatesRentalImages(galleryImages);
  const tabSections = getRoommatesRentalTabSections(listing, postedDetailSections, details.amenities.length > 0);
  const relatedRooms = relatedListings.slice(0, 3);
  const ownerName = listing.sellerName || details.contactName || getString(listing.sellerInformation, "name") || "Room Owner";
  const displayPrice = details.monthlyRent
    ? `${formatCurrencyAmount(Number(details.monthlyRent), country)}`
    : formatPrice(listing.price, country);
  const priceSuffix = details.monthlyRent || listing.price ? "/ Month" : "";
  const availableText = details.availableFrom ? formatShortDate(details.availableFrom) || details.availableFrom : "";
  const roomHighlightFacts = [
    { icon: "payments", label: "Rent", value: `${displayPrice} ${priceSuffix}`.trim() },
    { icon: "meeting_room", label: "Room Type", value: normalizeRoommateDisplayText(details.roomType) },
    { icon: "bathtub", label: "Bathroom", value: getRoommateCountText(details.bathrooms) },
    { icon: "home", label: "Property Type", value: normalizeRoommateDisplayText(details.propertyType) },
  ].filter((item) => item.value);

  return (
    <article className="public-room-detail">
      <section className="public-room-hero">
        <div className="container">
          <nav className="public-room-crumb" aria-label="breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to={buildBackHref(listing)}>Rooms & Rentals</Link>
            {listing.city ? (
              <>
                <span>/</span>
                <span>{listing.city}</span>
              </>
            ) : null}
          </nav>
          <span className="public-room-badge">
            <i className="material-icons" aria-hidden="true">verified</i>
            {listing.subCategory || "Room Listing"}
          </span>
          <h1>{listing.title}</h1>
          <div className="public-room-hero-meta">
            {address ? <span><i className="material-icons" aria-hidden="true">location_on</i>{address}</span> : null}
            {availableText ? <span><i className="material-icons" aria-hidden="true">event_available</i>Available from: {availableText}</span> : null}
            {details.roomType ? <span><i className="material-icons" aria-hidden="true">meeting_room</i>{details.roomType}</span> : null}
            {details.preferredGender ? <span><i className="material-icons" aria-hidden="true">wc</i>{details.preferredGender}</span> : null}
          </div>
          <div className="public-room-hero-actions">
            <button type="button" className="public-room-btn public-room-btn-primary" onClick={onOpenQuote}>
              <i className="material-icons" aria-hidden="true">mail</i>
              Contact Advertiser
            </button>
            {phone ? (
              <a href={`tel:${phone}`} className="public-room-btn public-room-btn-light">
                <i className="material-icons" aria-hidden="true">call</i>
                Call Now
              </a>
            ) : null}
            <a href="#room-location" className="public-room-btn public-room-btn-outline" onClick={scrollToSection}>
              <i className="material-icons" aria-hidden="true">map</i>
              View Location
            </a>
          </div>
        </div>
      </section>

      <section className="public-room-wrap">
        <div className="container">
          <div className="public-room-layout">
            <div className="public-room-main">
              <div className="public-room-card public-room-card-pad">
                <div className="public-room-gallery">
                  <img src={resolveListingImageUrl(images[0])} alt={listing.title} loading="eager" onError={hideBrokenImage} />
                  <div className="public-room-photo-side">
                    <img src={resolveListingImageUrl(images[1])} alt="" loading="lazy" onError={hideBrokenImage} />
                    <img src={resolveListingImageUrl(images[2])} alt="" loading="lazy" onError={hideBrokenImage} />
                  </div>
                </div>
              </div>

              <div className="public-room-card public-room-card-pad">
                <RoomSectionTitle title="Room Highlights" description="Everything a renter needs to know before contacting the advertiser." />
                <div className="public-room-facts">
                  {roomHighlightFacts.map((item) => (
                    <RoomFact icon={item.icon} label={item.label} value={item.value} key={item.label} />
                  ))}
                </div>
              </div>

              <div className="public-room-card public-room-card-pad">
                <RoomSectionTitle title="About This Room" description={details.neighborhood || address || "Room and rental details"} />
                <div className="public-room-copy">
                  <p>{details.description || listing.description || "Details are not listed."}</p>
                </div>
              </div>

              {details.amenities.length ? (
                <div className="public-room-card public-room-card-pad">
                  <RoomSectionTitle title="Amenities" description="Included features for a comfortable stay." />
                  <div className="public-room-amenities">
                    {details.amenities.map((amenity) => (
                      <div className="public-room-amenity" key={amenity}>
                        <i className="material-icons" aria-hidden="true">check_circle</i>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {tabSections.length ? (
                <div className="public-room-card public-room-card-pad">
                  <RoomSectionTitle title="Posted Details" description="Additional listing information grouped tab wise." />
                  <RoommatesRentalTabs sections={tabSections} />
                </div>
              ) : null}

              <div className="public-room-card public-room-card-pad" id="room-location">
                <RoomSectionTitle title="Location" description={address || "Location details not listed."} />
                <div className="public-room-map">
                  <iframe
                    src={buildMapUrl(address)}
                    title={`${listing.title} location`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="public-room-card public-room-card-pad" id="ld-rev">
                <RoomSectionTitle title="Reviews" description="Share your experience with this listing." />
                <form className="public-room-review-form" onSubmit={onReviewSubmit}>
                  <div className="public-review-rating-input" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={value <= reviewRating ? "active" : ""}
                        aria-label={`${value} star rating`}
                        onClick={() => onReviewRatingChange(value)}
                      >
                        <i className="material-icons" aria-hidden="true">star</i>
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="form-control"
                    placeholder="Write review"
                    value={reviewMessage}
                    onChange={(event) => onReviewMessageChange(event.target.value)}
                  />
                  {reviewSuccess ? <div className="alert alert-success">{reviewSuccess}</div> : null}
                  {reviewError ? <div className="alert alert-danger">{reviewError}</div> : null}
                  <button type="submit" className="public-room-btn public-room-btn-primary app-loading-button" disabled={isReviewSubmitting} aria-busy={isReviewSubmitting}>
                    {isReviewSubmitting ? (
                      <>
                        <span className="app-button-spinner" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : "Submit Review"}
                  </button>
                </form>
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

              {relatedRooms.length ? (
                <div className="public-room-card public-room-card-pad">
                  <RoomSectionTitle title={`More Rooms Near ${listing.city || "You"}`} description="Similar room listings that match nearby renter needs." />
                  <div className="public-room-related-list">
                    {relatedRooms.map((item) => (
                      <Link to={`/listing-details?id=${item.id}`} className="public-room-related" key={item.id}>
                        <span className="public-room-related-thumb">
                          {item.primaryImageUrl || item.imageUrls?.[0] ? (
                            <img src={resolveListingImageUrl(item.primaryImageUrl || item.imageUrls?.[0])} alt="" loading="lazy" onError={hideBrokenImage} />
                          ) : (
                            <i className="material-icons" aria-hidden="true">bed</i>
                          )}
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{[item.subCategory, item.city].filter(Boolean).join(", ")}</small>
                          <b>{formatPrice(item.price, country)}</b>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="public-room-side">
              <div className="public-room-card public-room-side-card" id="room-contact">
                <div className="public-room-price-box">
                  <span>Monthly Rent</span>
                  <strong>{displayPrice}</strong>
                  {priceSuffix ? <small>{priceSuffix}</small> : null}
                </div>
                <div className="public-room-card-pad">
                  <div className="public-room-host">
                    <div className="public-room-host-avatar">{ownerName.charAt(0).toUpperCase()}</div>
                    <div>
                      <h4>{ownerName}</h4>
                      <p>Verified Chao Desi advertiser</p>
                    </div>
                  </div>
                  <button type="button" className="public-room-btn public-room-btn-primary public-room-full-btn" onClick={onOpenQuote}>
                    {quoteActionLabel}
                  </button>
                  {phone ? <a href={`tel:${phone}`} className="public-room-btn public-room-btn-light public-room-full-btn">Call {phone}</a> : null}
                  {whatsapp ? (
                    <a href={`https://wa.me/${numbersOnly(whatsapp)}`} className="public-room-btn public-room-btn-outline public-room-full-btn" target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  {email ? <a href={`mailto:${email}`} className="public-room-email">{email}</a> : null}
                </div>
              </div>

              <div className="public-room-card public-room-card-pad">
                <RoomSectionTitle title="Listing Details" />
                <ul className="public-room-list">
                  <li><i className="material-icons" aria-hidden="true">calendar_today</i><span>{availableText ? `Posted ${formatMonthYear(listing.createdAt)} and available from ${availableText}.` : `Posted ${formatMonthYear(listing.createdAt)}.`}</span></li>
                  {details.utilitiesIncluded ? <li><i className="material-icons" aria-hidden="true">verified_user</i><span>Utilities included: {details.utilitiesIncluded}.</span></li> : null}
                  {details.preferredOccupation ? <li><i className="material-icons" aria-hidden="true">groups</i><span>Suitable for {details.preferredOccupation.toLowerCase()} renters.</span></li> : null}
                  {address ? <li><i className="material-icons" aria-hidden="true">place</i><span>{address}</span></li> : null}
                </ul>
              </div>

              <div className="public-room-card public-room-card-pad">
                <RoomSectionTitle title="Need A Roommate?" description="Post your room or roommate requirement and get matched with local seekers." />
                <Link to="/dashboard/listings/start" className="public-room-btn public-room-btn-primary public-room-full-btn">Post Your Need</Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {isQuoteModalOpen ? (
        <ListingQuoteModal
          form={quoteForm}
          isProfileLoading={isQuoteProfileLoading}
          isSubmitting={isQuoteSubmitting}
          listing={listing}
          title={quoteActionLabel}
          status={quoteStatus}
          onChange={onQuoteChange}
          onClose={onQuoteClose}
          onSubmit={onQuoteSubmit}
        />
      ) : null}

      {loginPrompt ? (
        <LoginRequiredPrompt
          title={loginPrompt.title}
          message={loginPrompt.message}
          onClose={onLoginPromptClose}
        />
      ) : null}
    </article>
  );
}

function RoomSectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="public-room-section-title">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function RoomFact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="public-room-fact">
      <i className="material-icons" aria-hidden="true">{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RoommatesRentalTabs({ sections }: { sections: PostedDetailSection[] }) {
  const [activeTitle, setActiveTitle] = useState(sections[0]?.title || "");

  useEffect(() => {
    if (!sections.some((section) => section.title === activeTitle)) {
      setActiveTitle(sections[0]?.title || "");
    }
  }, [activeTitle, sections]);

  const activeSection = sections.find((section) => section.title === activeTitle) || sections[0];

  if (!activeSection) {
    return null;
  }

  return (
    <div className="public-room-tabs">
      <div className="public-room-tab-list" role="tablist" aria-label="Room details">
        {sections.map((section) => (
          <button
            type="button"
            role="tab"
            aria-selected={section.title === activeSection.title}
            className={section.title === activeSection.title ? "active" : ""}
            key={section.title}
            onClick={() => setActiveTitle(section.title)}
          >
            <i className="material-icons" aria-hidden="true">{getRoomTabIcon(section.title)}</i>
            {section.title}
          </button>
        ))}
      </div>
      <div className="public-room-tab-panel" role="tabpanel">
        <div className="public-room-tab-heading">
          <span><i className="material-icons" aria-hidden="true">{getRoomTabIcon(activeSection.title)}</i></span>
          <div>
            <h3>{activeSection.title}</h3>
            <p>{getRoomTabDescription(activeSection.title)}</p>
          </div>
        </div>
        <dl className={activeSection.rows.length === 1 ? "is-single" : ""}>
          {activeSection.rows.map((row) => (
            <div key={`${activeSection.title}-${row.label}`}>
              <dt>{row.label}</dt>
              <dd><RoomPostedDetailValue value={row.value} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function RoomPostedDetailValue({ value }: { value: PostedDetailValue }) {
  if (typeof value === "string") {
    const parts = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length > 1 && parts.every((item) => item.length <= 34)) {
      return (
        <div className="public-room-value-chips">
          {parts.map((item) => <span key={item}>{item}</span>)}
        </div>
      );
    }
  }

  return <PostedDetailValueView value={value} />;
}

function getRoomTabIcon(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("rental")) return "payments";
  if (normalizedTitle.includes("room")) return "king_bed";
  if (normalizedTitle.includes("preference")) return "group";
  if (normalizedTitle.includes("amenit")) return "verified";
  if (normalizedTitle.includes("contact")) return "contact_phone";
  if (normalizedTitle.includes("verification")) return "workspace_premium";
  return "fact_check";
}

function getRoomTabDescription(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("rental")) return "Rent, deposit, lease and availability details.";
  if (normalizedTitle.includes("room")) return "Room type, property type and living space information.";
  if (normalizedTitle.includes("preference")) return "Renter and roommate preferences posted by the advertiser.";
  if (normalizedTitle.includes("amenit")) return "Comfort features and nearby facilities included with this listing.";
  if (normalizedTitle.includes("contact")) return "Advertiser contact and viewing preference information.";
  if (normalizedTitle.includes("verification")) return "Verification, lease, student, sublease and special rental details.";
  return "Additional information submitted with this listing.";
}

function ListingQuoteModal({
  form,
  isProfileLoading,
  isSubmitting,
  listing,
  title,
  status,
  onChange,
  onClose,
  onSubmit,
}: {
  form: { name: string; email: string; mobileNumber: string; message: string };
  isProfileLoading: boolean;
  isSubmitting: boolean;
  listing: ListingSummary;
  title: string;
  status: string;
  onChange: (updates: Partial<{ name: string; email: string; mobileNumber: string; message: string }>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="public-quote-modal-backdrop" role="dialog" aria-modal="true">
      <form className="public-quote-modal public-detail-quote-modal" onSubmit={onSubmit}>
        <div className="public-quote-ribbon">Listing Enquiry</div>
        <button type="button" className="public-quote-close" aria-label="Close" onClick={onClose}>x</button>
        <h2>{title}</h2>
        <p>{listing.title}</p>
        <input
          type="text"
          placeholder="Enter name*"
          required
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <input
          type="email"
          placeholder="Email*"
          readOnly
          required
          value={form.email}
        />
        <PhoneNumberInput value={form.mobileNumber} onChange={(mobileNumber) => onChange({ mobileNumber })} placeholder="Phone number*" required />
        <textarea
          placeholder="Enter your query or message"
          value={form.message}
          onChange={(event) => onChange({ message: event.target.value })}
        />
        {status ? <div className="public-quote-status">{status}</div> : null}
        <button type="submit" className="app-loading-button" disabled={isProfileLoading || isSubmitting || !form.email} aria-busy={isProfileLoading || isSubmitting}>
          {isProfileLoading || isSubmitting ? (
            <>
              <span className="app-button-spinner" aria-hidden="true"></span>
              {isProfileLoading ? "Loading..." : "Submitting..."}
            </>
          ) : "Submit Enquiry"}
        </button>
      </form>
    </div>
  );
}

function JobApplicationModal({
  form,
  isProfileLoading,
  isSubmitting,
  listing,
  resumeFile,
  status,
  onChange,
  onClose,
  onResumeChange,
  onSubmit,
}: {
  form: { name: string; email: string; mobileNumber: string; message: string };
  isProfileLoading: boolean;
  isSubmitting: boolean;
  listing: ListingSummary;
  resumeFile: File | null;
  status: string;
  onChange: (updates: Partial<{ name: string; email: string; mobileNumber: string; message: string }>) => void;
  onClose: () => void;
  onResumeChange: (file: File | null) => boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="public-quote-modal-backdrop" role="dialog" aria-modal="true">
      <form className="public-quote-modal public-detail-quote-modal public-job-application-modal" onSubmit={onSubmit}>
        <div className="public-quote-ribbon">Job Application</div>
        <button type="button" className="public-quote-close" aria-label="Close" onClick={onClose}>x</button>
        <h2>Apply Now</h2>
        <p>{listing.title}</p>
        <input
          type="text"
          placeholder="Enter name*"
          required
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <input
          type="email"
          placeholder="Email*"
          readOnly
          required
          value={form.email}
        />
        <PhoneNumberInput value={form.mobileNumber} onChange={(mobileNumber) => onChange({ mobileNumber })} placeholder="Phone number*" required />
        <label className="public-job-resume-field">
          <span>Resume*</span>
          <input
            type="file"
            accept={resumeAcceptTypes}
            required
            onChange={(event) => {
              const isAccepted = onResumeChange(event.target.files?.[0] || null);
              if (!isAccepted) {
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
        <div className="public-job-resume-note">
          {resumeFile ? resumeFile.name : "PDF, DOC, or DOCX up to 10 MB"}
        </div>
        <textarea
          placeholder="Cover note or message"
          value={form.message}
          onChange={(event) => onChange({ message: event.target.value })}
        />
        {status ? <div className="public-quote-status">{status}</div> : null}
        <button type="submit" className="app-loading-button" disabled={isProfileLoading || isSubmitting || !form.email} aria-busy={isProfileLoading || isSubmitting}>
          {isProfileLoading || isSubmitting ? (
            <>
              <span className="app-button-spinner" aria-hidden="true"></span>
              {isProfileLoading ? "Loading..." : "Submitting..."}
            </>
          ) : "Submit Application"}
        </button>
      </form>
    </div>
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

const localServiceCategoryNames = new Set([
  "Financial & Taxation Services",
  "Lessons/Tuitions",
  "Home & Business Needs",
  "Travel & Accommodation",
  "Health & Wellness",
  "Beauty Services",
]);

const localServiceSubCategoryNames = new Set([
  "Real Estate Services",
  "Wedding & Events",
  "Food & Catering",
  "Financial & Taxation Services",
  "Lessons/Tuitions",
  "Home & Business Needs",
  "Travel & Accommodation",
  "Health & Wellness",
]);

function isLocalServiceDetailListing(listing: ListingSummary) {
  return (
    localServiceCategoryNames.has(listing.categoryName) ||
    localServiceSubCategoryNames.has(listing.subCategory) ||
    localServiceSubCategoryNames.has(listing.detailCategory)
  );
}

function getLocalServiceDisplayDetails(listing: ListingSummary) {
  const attributes = getListingCategoryAttributes(listing);
  const contactInfo = parseJsonRecord(getString(listing.propertyDetails, "additionalContactInfo"));
  const categoryLabel = localServiceSubCategoryNames.has(listing.subCategory)
    ? listing.subCategory
    : listing.categoryName || "Local Service";

  return {
    categoryLabel,
    summary: getLocalServiceAttributeValue(attributes, "tagline", "shortDescription", "summary"),
    description: getLocalServiceAttributeValue(attributes, "description", "serviceDescription") || getString(listing.propertyDetails, "businessDescription"),
    serviceType: getLocalServiceAttributeValue(attributes, "serviceType", "service_type", "servicesOffered", "services_offered") || listing.detailCategory,
    serviceArea: getLocalServiceAttributeValue(attributes, "serviceArea", "service_area", "delivery_radius", "service_radius", "operatingZones"),
    experience: getLocalServiceAttributeValue(attributes, "experience", "yearsOfExperience", "years_experience"),
    licenseNumber: getLocalServiceAttributeValue(attributes, "licenseNumber", "license_number", "businessRegistrationNumber"),
    availability: getLocalServiceAttributeValue(attributes, "availability", "working_days", "open_24x7"),
    bookingType: getLocalServiceAttributeValue(attributes, "bookingType", "onlineBooking", "online_booking", "reservations_accepted"),
    phone: getLocalServiceAttributeValue(attributes, "phone", "contact_phone", "mainPhone") || getString(contactInfo, "mainPhone"),
    email: getLocalServiceAttributeValue(attributes, "email", "contact_email") || getString(contactInfo, "email"),
    whatsapp: getLocalServiceAttributeValue(attributes, "whatsapp", "whatsAppNumber"),
    website: getLocalServiceAttributeValue(attributes, "website", "websiteUrl", "onlineBookingUrl"),
    verifiedText: getBoolean(listing.settings, "verifiedByAdmin") ? "Verified provider" : "Listed provider",
  };
}

function getLocalServiceInfoRows(
  listing: ListingSummary,
  details: ReturnType<typeof getLocalServiceDisplayDetails>
): Array<[string, LooseValue]> {
  return [
    ["Category", details.categoryLabel],
    ["Service Type", details.serviceType],
    ["Service Area", details.serviceArea || buildAddress(listing)],
    ["Experience", details.experience],
    ["License", details.licenseNumber],
    ["Availability", details.availability],
    ["Booking", details.bookingType],
    ["Starting Price", listing.price ? formatPrice(listing.price, getString(listing.locationDetails, "country")) : ""],
  ];
}

function getLocalServiceContactRows(
  listing: ListingSummary,
  phone: string,
  email: string,
  whatsapp: string,
  website: string
): Array<[string, LooseValue]> {
  const rows: Array<[string, LooseValue]> = [
    ["Phone", phone],
    ["Email", email],
    ["WhatsApp", whatsapp],
    ["Website", website],
    ["Address", buildAddress(listing)],
  ];

  return rows.filter(([, value]) => Boolean(value));
}

function getLocalServiceFeatures(listing: ListingSummary) {
  const attributes = getListingCategoryAttributes(listing);
  const amenityItems = Object.entries(listing.amenities || {})
    .filter(([, value]) => value === true)
    .map(([key]) => formatPostedLabel(key));
  const enabledAttributeItems = Object.entries(attributes)
    .filter(([, value]) => value === true || String(value).toLowerCase() === "yes")
    .map(([key]) => formatPostedLabel(key))
    .filter((label) => !["Open 24x7", "Online Booking"].includes(label));
  const serviceItems = getLocalServiceItems(listing).map((item) => item.name).filter(Boolean);
  const paymentMethods = getPaymentMethodLabels(listing);
  const rawFeatures = Array.from(new Set([...serviceItems, ...amenityItems, ...enabledAttributeItems, ...paymentMethods])).slice(0, 8);

  if (!rawFeatures.length) {
    return [
      { title: "Verified listing", detail: "Provider details are available through Chao Desi.", icon: "verified_user" },
      { title: "Local service area", detail: buildAddress(listing) || "Service area is available on request.", icon: "location_on" },
      { title: "Customer enquiries", detail: "Send a request and the provider can respond directly.", icon: "mail" },
    ];
  }

  return rawFeatures.map((title, index) => ({
    title,
    detail: getLocalServiceFeatureDetail(title),
    icon: ["done_all", "local_shipping", "groups", "event_available", "security", "payment", "workspace_premium", "support_agent"][index % 8],
  }));
}

function getLocalServiceFeatureDetail(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("cash") || normalizedTitle.includes("card") || normalizedTitle.includes("pay")) {
    return "Flexible payment option supported by this provider.";
  }

  if (normalizedTitle.includes("delivery") || normalizedTitle.includes("travel") || normalizedTitle.includes("mobile")) {
    return "Available for mobile or area-based service requests.";
  }

  if (normalizedTitle.includes("verified") || normalizedTitle.includes("license")) {
    return "Important provider verification details are listed.";
  }

  return "Included with this local service listing.";
}

function getLocalServiceItems(listing: ListingSummary): NamedImageItem[] {
  const services = parseJsonArray<NamedImageItem>(getString(listing.propertyDetails, "services"))
    .filter((item) => item.name)
    .slice(0, 6);

  if (services.length) {
    return services;
  }

  const attributes = getListingCategoryAttributes(listing);
  const serviceText = getLocalServiceAttributeValue(attributes, "servicesOffered", "services_offered", "serviceType", "service_type");
  const serviceNames = splitTextList(serviceText || listing.detailCategory || listing.subCategory).slice(0, 6);
  return serviceNames.map((name) => ({ name }));
}

function getLocalServicePackages(listing: ListingSummary, country?: string) {
  const offers = getOfferItems(listing);

  if (offers.length) {
    return offers.map((offer) => ({
      name: offer.name || "Service package",
      price: offer.price ? formatPrice(Number(offer.price), country) : formatPrice(listing.price, country),
      detail: offer.detail || "Package details are available from the provider.",
    }));
  }

  const attributes = getListingCategoryAttributes(listing);
  const priceText = getLocalServiceAttributeValue(
    attributes,
    "price_range",
    "average_cost_for_two",
    "per_plate_pricing",
    "delivery_fee",
    "hourlyRate",
    "serviceFee"
  );

  if (priceText || listing.price) {
    return [
      {
        name: "Standard Service",
        price: listing.price ? formatPrice(listing.price, country) : priceText,
        detail: "Contact the provider for final pricing based on your requirement.",
      },
    ];
  }

  return [
    {
      name: "Custom Quote",
      price: "Price on request",
      detail: "Share your requirement and receive a quote from the provider.",
    },
  ];
}

function getPaymentMethodLabels(listing: ListingSummary) {
  const paymentMethods = parseJsonRecord(getString(listing.propertyDetails, "paymentMethods"));
  return Object.entries(paymentMethods)
    .filter(([, value]) => value === true)
    .map(([key]) => formatPostedLabel(key));
}

function getLocalServiceAttributeValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
  }

  return "";
}

function splitTextList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getContactIcon(label: string) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("phone")) return "call";
  if (normalizedLabel.includes("email")) return "mail";
  if (normalizedLabel.includes("whatsapp")) return "chat";
  if (normalizedLabel.includes("website")) return "language";
  return "place";
}

function getRoommatesRentalDisplayDetails(listing: ListingSummary) {
  const attributes = getListingCategoryAttributes(listing);
  const monthlyRent = getRoommateNumber(attributes, "monthly_rent", "monthlyRent", "rent", "price") || listing.price || null;

  return {
    description: getRoommateAttributeValue(attributes, "description") || listing.description,
    propertyType: getRoommateAttributeValue(attributes, "property_type", "propertyType"),
    neighborhood: getRoommateAttributeValue(attributes, "neighborhood"),
    monthlyRent,
    securityDeposit: getRoommateNumber(attributes, "security_deposit", "securityDeposit"),
    utilitiesIncluded: getRoommateBooleanText(attributes, "utilities_included", "utilitiesIncluded"),
    leaseDuration: getRoommateAttributeValue(attributes, "lease_duration", "leaseDuration"),
    availableFrom: getRoommateAttributeValue(attributes, "available_from", "availableFrom"),
    roomType: getRoommateAttributeValue(attributes, "room_type", "roomType"),
    bedrooms: getRoommateAttributeValue(attributes, "bedrooms", "number_of_bedrooms", "numberOfBedrooms"),
    bathrooms: getRoommateAttributeValue(attributes, "bathrooms"),
    furnishingType: getRoommateAttributeValue(attributes, "furnishing_type", "furnishingType"),
    roomSize: getRoommateAttributeValue(attributes, "room_size_sqft", "roomSizeSqft", "room_size"),
    preferredGender: getRoommateAttributeValue(attributes, "preferred_gender", "preferredGender"),
    preferredOccupation: getRoommateAttributeValue(attributes, "preferred_occupation", "preferredOccupation"),
    contactName: getRoommateAttributeValue(attributes, "contact_name", "contactName"),
    phone: getRoommateAttributeValue(attributes, "phone", "contact_phone", "contactPhone"),
    email: getRoommateAttributeValue(attributes, "email", "contact_email", "contactEmail"),
    amenities: getRoommatesRentalAmenities(attributes, listing.amenities),
  };
}

function getRoommatesRentalImages(galleryImages: string[]) {
  const fallbacks = [
    "/template-17/images/chao-home-room-listings/2.jpeg",
    "/template-17/images/chao-home-room-listings/1.png",
    "/template-17/images/chao-home-room-listings/3.png",
  ];

  return Array.from(new Set([...galleryImages, ...fallbacks])).slice(0, 3);
}

function getRoommatesRentalTabSections(
  listing: ListingSummary,
  fallbackSections: PostedDetailSection[],
  hideAmenitiesSection = false
) {
  const attributes = getListingCategoryAttributes(listing);
  const sections: PostedDetailSection[] = [];

  addPostedSection(sections, "Rental", [
    ["Monthly Rent", getRoommateNumber(attributes, "monthly_rent", "monthlyRent", "rent", "price") || listing.price],
    ["Security Deposit", getRoommateNumber(attributes, "security_deposit", "securityDeposit")],
    ["Utilities Included", getRoommateBooleanText(attributes, "utilities_included", "utilitiesIncluded")],
    ["Negotiable", getRoommateBooleanText(attributes, "price_negotiable", "priceNegotiable")],
    ["Lease Duration", getRoommateAttributeValue(attributes, "lease_duration", "leaseDuration")],
    ["Available From", getRoommateAttributeValue(attributes, "available_from", "availableFrom")],
    ["Available Until", getRoommateAttributeValue(attributes, "available_until", "availableUntil")],
  ]);

  addPostedSection(sections, "Room", [
    ["Property Type", getRoommateAttributeValue(attributes, "property_type", "propertyType") || listing.subCategory],
    ["Detailed Category", listing.detailCategory],
    ["Bedrooms", getRoommateAttributeValue(attributes, "bedrooms", "number_of_bedrooms", "numberOfBedrooms")],
    ["Bathrooms", getRoommateAttributeValue(attributes, "bathrooms")],
    ["Room Type", getRoommateAttributeValue(attributes, "room_type", "roomType")],
    ["Furnishing", getRoommateAttributeValue(attributes, "furnishing_type", "furnishingType")],
    ["Room Size", getRoommateAttributeValue(attributes, "room_size_sqft", "roomSizeSqft", "room_size")],
  ]);

  addPostedSection(sections, "Preferences", [
    ["Preferred Gender", getRoommateAttributeValue(attributes, "preferred_gender", "preferredGender")],
    ["Preferred Occupation", getRoommateAttributeValue(attributes, "preferred_occupation", "preferredOccupation")],
    ["Preferred Age Range", getRoommateAttributeValue(attributes, "preferred_age_range", "preferredAgeRange")],
    ["Smoking Allowed", getRoommateBooleanText(attributes, "smoking_allowed", "smokingAllowed")],
    ["Pets Allowed", getRoommateBooleanText(attributes, "pets_allowed", "petsAllowed")],
    ["Couples Allowed", getRoommateBooleanText(attributes, "couples_allowed", "couplesAllowed")],
  ]);

  if (!hideAmenitiesSection) {
    addPostedSection(sections, "Amenities", [
      ["Amenities", getRoommatesRentalAmenities(attributes, listing.amenities)],
      ["Public Transportation Nearby", getRoommateBooleanText(attributes, "public_transportation_nearby", "publicTransportationNearby")],
      ["University Nearby", getRoommateBooleanText(attributes, "university_nearby", "universityNearby")],
      ["Grocery Stores Nearby", getRoommateBooleanText(attributes, "grocery_stores_nearby", "groceryStoresNearby")],
      ["Hospital Nearby", getRoommateBooleanText(attributes, "hospital_nearby", "hospitalNearby")],
      ["Shopping Center Nearby", getRoommateBooleanText(attributes, "shopping_center_nearby", "shoppingCenterNearby")],
    ]);
  }

  addPostedSection(sections, "Contact", [
    ["Contact Name", getRoommateAttributeValue(attributes, "contact_name", "contactName")],
    ["Phone", getRoommateAttributeValue(attributes, "phone", "contact_phone", "contactPhone")],
    ["Email", getRoommateAttributeValue(attributes, "email", "contact_email", "contactEmail")],
    ["Preferred Contact Method", getRoommateAttributeValue(attributes, "preferred_contact_method", "preferredContactMethod")],
    ["Schedule Property Viewing", getRoommateBooleanText(attributes, "schedule_property_viewing", "schedulePropertyViewing")],
    ["Open House Dates", getRoommateAttributeValue(attributes, "open_house_dates", "openHouseDates")],
  ]);

  addPostedSection(sections, "Verification", [
    ["Identity Verified", getRoommateBooleanText(attributes, "identity_verified", "identityVerified")],
    ["Property Ownership Verified", getRoommateBooleanText(attributes, "property_ownership_verified", "propertyOwnershipVerified")],
    ["Background Verification", getRoommateBooleanText(attributes, "background_verification", "backgroundVerification")],
    ["University Name", getRoommateAttributeValue(attributes, "university_name", "universityName")],
    ["Distance From Campus", getRoommateAttributeValue(attributes, "distance_from_campus", "distanceFromCampus")],
    ["Student Only", getRoommateBooleanText(attributes, "student_only", "studentOnly")],
    ["Original Lease End Date", getRoommateAttributeValue(attributes, "original_lease_end_date", "originalLeaseEndDate")],
    ["Landlord Approval Required", getRoommateBooleanText(attributes, "landlord_approval_required", "landlordApprovalRequired")],
    ["Corporate Rates", getRoommateAttributeValue(attributes, "corporate_rates", "corporateRates")],
    ["Business Traveler Amenities", getRoommateAttributeValue(attributes, "business_traveler_amenities", "businessTravelerAmenities")],
    ["Daily Rate", getRoommateNumber(attributes, "daily_rate", "dailyRate")],
    ["Cleaning Fee", getRoommateNumber(attributes, "cleaning_fee", "cleaningFee")],
  ]);

  return sections.length ? sections : fallbackSections;
}

function getListingCategoryAttributes(listing: ListingSummary): Record<string, unknown> {
  const otherInformation = parseUnknownRecord(getString(listing.propertyDetails, "otherInformation"));
  return asUnknownRecord(otherInformation.categoryAttributes);
}

function getRoommateAttributeValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      const normalized = normalizeRoommateDisplayText(value);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
  }

  return "";
}

function normalizeRoommateDisplayText(value: string | null | undefined) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "";
  }

  const key = normalized.toLowerCase();
  if (["contact advertiser", "contact provider", "not listed", "not available", "n/a", "na", "null", "undefined", "-"].includes(key)) {
    return "";
  }

  return normalized;
}

function getRoommateCountText(value: string | null | undefined) {
  const normalized = normalizeRoommateDisplayText(value);
  if (!normalized || !/\d/.test(normalized)) {
    return "";
  }

  return normalized;
}

function getRoommateNumber(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = normalizeRoommateDisplayText(value);
      if (!normalized) {
        continue;
      }

      const parsed = Number(normalized.replace(/,/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getRoommateBooleanText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().toLowerCase();

      if (["yes", "true", "1", "included", "available"].includes(normalized)) {
        return "Yes";
      }

      if (["no", "false", "0", "not included", "unavailable"].includes(normalized)) {
        return "No";
      }

      return value.trim();
    }
  }

  return "";
}

function getRoommatesRentalAmenities(
  attributes: Record<string, unknown>,
  amenities?: Record<string, boolean>
) {
  const attributeAmenities = [
    ["wifi_included", "Wi-Fi Included"],
    ["parking_available", "Parking Available"],
    ["laundry_facility", "Laundry Facility"],
    ["air_conditioning", "Air Conditioning"],
    ["heating", "Heating"],
    ["gym_access", "Gym Access"],
    ["swimming_pool", "Swimming Pool"],
    ["elevator", "Elevator"],
    ["security_system", "Security System"],
    ["public_transportation_nearby", "Public Transportation Nearby"],
    ["university_nearby", "University Nearby"],
    ["grocery_stores_nearby", "Grocery Stores Nearby"],
    ["hospital_nearby", "Hospital Nearby"],
    ["shopping_center_nearby", "Shopping Center Nearby"],
  ];
  const enabledAttributes = attributeAmenities
    .filter(([key]) => getRoommateBooleanText(attributes, key) === "Yes")
    .map(([, label]) => label);
  const enabledAmenities = Object.entries(amenities || {})
    .filter(([, value]) => value === true)
    .map(([key]) => formatPostedLabel(key));

  return Array.from(new Set([...enabledAttributes, ...enabledAmenities]));
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

function getRecruiterContactHref(email: string, phone: string) {
  if (email) {
    return `mailto:${email}`;
  }

  if (phone) {
    return `tel:${phone}`;
  }

  return "#company-info";
}

function shareListing(listing: ListingSummary) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/listing-details?id=${listing.id}` : "";
  const title = listing.title || "Listing";

  if (typeof navigator !== "undefined" && "share" in navigator && url) {
    void navigator.share({ title, url }).catch(() => undefined);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && url) {
    void navigator.clipboard.writeText(url);
  }
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

function getResumeFileError(file: File) {
  const extension = `.${file.name.split(".").pop() || ""}`.toLowerCase();

  if (!allowedResumeExtensions.includes(extension)) {
    return "Resume must be a PDF, DOC, or DOCX file.";
  }

  if (file.size > maxResumeFileBytes) {
    return "Resume file size must be 10 MB or less.";
  }

  return "";
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
