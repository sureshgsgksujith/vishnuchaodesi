import { useEffect, useState } from "react";
import {
  getPublicListings,
  type ListingSummary,
} from "../../dashboard/api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../../dashboard/utils/listingImages";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

const JOB_LISTING_LIMIT = 10;

function getDetailValue(
  listing: ListingSummary,
  sections: Array<keyof Pick<ListingSummary, "propertyDetails" | "locationDetails" | "settings">>,
  keys: string[],
) {
  for (const sectionName of sections) {
    const section = listing[sectionName];
    if (!section) {
      continue;
    }

    for (const key of keys) {
      const value = section[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }

  return "";
}

function getJobLocation(listing: ListingSummary, selectedCity?: string) {
  const locality = listing.locality || getDetailValue(listing, ["locationDetails"], ["locality", "area"]);
  const city = listing.city || getDetailValue(listing, ["locationDetails"], ["city"]) || selectedCity;
  const state = getDetailValue(listing, ["locationDetails"], ["state"]);

  return [locality, city, state].filter(Boolean).slice(0, 2).join(", ");
}

function getJobMeta(listing: ListingSummary) {
  return getDetailValue(listing, ["propertyDetails", "settings"], ["employmentType", "employment_type", "jobType", "workMode"]) ||
    listing.subCategory ||
    "Job";
}

function getLatestListingTime(listing: ListingSummary) {
  return new Date(listing.createdAt || 0).getTime();
}

export default function HomeJobsSection() {
  const [jobListings, setJobListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentLocation, selectedCity, activeCity, locationRevision } = useHomeSelectedLocation();

  useEffect(() => {
    let isActive = true;

    if (!selectedCity && (currentLocation.status === "loading" || currentLocation.status === "idle")) {
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setJobListings([]);

    getPublicListings({
      category: "jobs",
      city: activeCity || undefined,
      page: 1,
      pageSize: JOB_LISTING_LIMIT,
      forceRefresh: locationRevision > 0,
    })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setJobListings(
          [...result.items]
            .sort((first, second) => getLatestListingTime(second) - getLatestListingTime(first))
            .slice(0, JOB_LISTING_LIMIT),
        );
      })
      .catch(() => {
        if (isActive) {
          setJobListings([]);
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
  }, [activeCity, currentLocation.status, locationRevision, selectedCity]);

  if (!isLoading && !jobListings.length) {
    return (
      <section className="chao-jobs">
        <div className="container">
          <div className="text-center jobs-header">
            <h2>Jobs</h2>
            <p className="subtitle">Recently posted jobs</p>
          </div>

          <div className="jobs-tabs text-center">
            <a href="/all-listing?category=jobs" className="tab-btn active">Job Seeker</a>
            <a href="/dashboard/listings/new?category=jobs" className="tab-btn">Recruiters</a>
          </div>

          <div className="home-section-loader">No job posts available right now.</div>
        </div>
      </section>
    );
  }

  const shouldScroll = jobListings.length > 4;
  const displayListings = shouldScroll ? [...jobListings, ...jobListings] : jobListings;
  const allJobsHref = activeCity
    ? `/all-listing?category=jobs&city=${encodeURIComponent(activeCity)}`
    : "/all-listing?category=jobs";

  return (
    <section className="chao-jobs">
      <div className="container">
        <div className="text-center jobs-header">
          <h2>Jobs</h2>
          <p className="subtitle">
            {activeCity ? `Recently posted jobs near ${activeCity}` : "Recently posted jobs"}
          </p>
        </div>

        <div className="jobs-tabs text-center">
          <a href={allJobsHref} className="tab-btn active">Job Seeker</a>
          <a href="/dashboard/listings/new?category=jobs" className="tab-btn">Recruiters</a>
        </div>

        {isLoading ? (
          <div className="home-section-loader">
            <span className="home-location-spinner" aria-hidden="true"></span>
            Loading job posts
          </div>
        ) : (
          <>
            <div className="home-jobs-header-row">
              <h3>Latest job posts</h3>
              <a href={allJobsHref}>View all jobs</a>
            </div>

            <div className="plac-hom-all-pla home-jobs-listings">
              <ul className={`travel-sliser home-featured-listings-slider ${shouldScroll ? "is-scrolling" : "is-static"}`}>
                {displayListings.map((listing, index) => {
                  const image = resolveListingImageUrl(listing.primaryImageUrl || listing.imageUrls?.[0]);
                  const location = getJobLocation(listing, activeCity);
                  const meta = getJobMeta(listing);

                  return (
                    <li key={`job-${listing.id}-${index}`} aria-hidden={shouldScroll && index >= jobListings.length}>
                      <div className="plac-hom-box home-job-card">
                        <div className="plac-hom-box-im">
                          <img src={image} alt={listing.title} loading="lazy" onError={setFallbackListingImage} />
                          <div className="home-featured-card-copy">
                            <h4>{listing.title}</h4>
                            {location ? <p>{location}</p> : null}
                          </div>
                        </div>

                        <div className="plac-hom-box-txt">
                          <div className="home-job-card-meta">
                            <b>{meta}</b>
                            {listing.detailCategory ? <span>{listing.detailCategory}</span> : null}
                          </div>
                          <span>View details</span>
                        </div>

                        <a href={`/listing-details?id=${listing.id}`} className="fclick" aria-label={listing.title}></a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
