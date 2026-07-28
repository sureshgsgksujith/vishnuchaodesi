import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceSubCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import {
  getPublicAllServicePostings,
  type PublicAllServicePosting,
} from "../../allServices/api/allServicePostingsApi";
import { useHomeSelectedLocation } from "../hooks/useHomeSelectedLocation";

const categoryImagesBySlug: Record<string, string> = {
  "educational-institutes": "/template-17/images/home/student.jpg",
  "religious-community-services": "/template-17/service-experts/images/services/1.jpg",
  "real-estate-services": "/template-17/images/services/8.jpg",
  "health-wellness": "/template-17/images/services/4.jpg",
  "food-catering": "/template-17/images/services/resto-1.jpg",
  "wedding-events": "/template-17/service-experts/images/services/3.jpeg",
  "lessons-tuitions": "/template-17/service-experts/images/services/4.jpeg",
  "home-business-needs": "/template-17/images/home2-work.jpg",
  "financial-legal-services": "/template-17/images/services/7.jpg",
  "travel-accommodation": "/template-17/images/home/travel-bg.jpg",
};

const fallbackCategoryImages = [
  "/template-17/service-experts/images/services/1.jpg",
  "/template-17/service-experts/images/services/2.jpg",
  "/template-17/service-experts/images/services/3.jpeg",
  "/template-17/service-experts/images/services/4.jpeg",
  "/template-17/service-experts/images/services/5.jpg",
  "/template-17/service-experts/images/services/6.jpg",
  "/template-17/service-experts/images/services/7.jpg",
  "/template-17/service-experts/images/services/8.jpg",
  "/template-17/service-experts/images/services/9.jpg",
  "/template-17/service-experts/images/services/10.jpg",
];

export default function HomePopularServicesSection() {
  const { activeCity } = useHomeSelectedLocation();
  const [categories, setCategories] = useState<AllServiceCategoryOption[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(0);
  const [activeSubCategorySlug, setActiveSubCategorySlug] = useState("");
  const [providers, setProviders] = useState<PublicAllServicePosting[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providerMessage, setProviderMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    setIsLoadingCategories(true);

    getAllServiceDirectoryTree()
      .then((items) => {
        if (!isActive) return;

        const nextCategories = items.filter((category) => category.subCategories.length).slice(0, 10);
        if (!nextCategories.length) {
          setCategories([]);
          setActiveCategoryId(0);
          setActiveSubCategorySlug("");
          setProviderMessage("No service categories are currently available.");
          return;
        }

        setCategories(nextCategories);
        setActiveCategoryId((current) => {
          const exists = nextCategories.some((category) => category.id === current);
          return exists ? current : nextCategories[0].id;
        });
      })
      .catch(() => {
        if (!isActive) return;
        setCategories([]);
        setActiveCategoryId(0);
        setActiveSubCategorySlug("");
        setProviderMessage("Unable to load service categories right now.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) || categories[0],
    [activeCategoryId, categories],
  );
  const activeTabs = useMemo(() => buildTabs(activeCategory), [activeCategory]);
  const activeTab = useMemo(
    () => activeTabs.find((tab) => tab.slug === activeSubCategorySlug) || activeTabs[0],
    [activeSubCategorySlug, activeTabs],
  );

  useEffect(() => {
    if (!activeCategory) return;

    const firstTab = buildTabs(activeCategory)[0];
    if (firstTab && !buildTabs(activeCategory).some((tab) => tab.slug === activeSubCategorySlug)) {
      setActiveSubCategorySlug(firstTab.slug);
    }
  }, [activeCategory, activeSubCategorySlug]);

  useEffect(() => {
    if (!activeCategory || isLoadingCategories) {
      setIsLoadingProviders(isLoadingCategories);
      if (!isLoadingCategories) setProviders([]);
      return;
    }

    let isActive = true;
    setIsLoadingProviders(true);
    setProviderMessage("");

    const baseQuery = {
      categoryId: activeCategory.id > 0 ? activeCategory.id : undefined,
      category: activeCategory.id > 0 ? undefined : activeCategory.name,
      page: 1,
      pageSize: 5,
    };
    const subCategory = activeTab?.slug || activeTab?.name;

    (async () => {
      let result = await getPublicAllServicePostings({
        ...baseQuery,
        subCategory,
        city: activeCity || undefined,
      });
      let message = "";

      if (result.totalCount === 0 && subCategory) {
        result = await getPublicAllServicePostings({
          ...baseQuery,
          city: activeCity || undefined,
        });
      }

      if (result.totalCount === 0 && activeCity) {
        message = `No ${activeTab?.name || activeCategory.name} providers are posted in ${activeCity} yet.`;
      }

      return { result, message };
    })()
      .then(({ result, message }) => {
        if (!isActive) return;
        setProviders(result.items);
        setProviderMessage(message);
      })
      .catch(() => {
        if (!isActive) return;
        setProviders([]);
        setProviderMessage("Unable to load providers right now.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProviders(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeCategory, activeCity, activeTab, isLoadingCategories]);

  const onSelectCategory = (category: AllServiceCategoryOption) => {
    setActiveCategoryId(category.id);
    setActiveSubCategorySlug(buildTabs(category)[0]?.slug || "");
  };

  return (
    <section className="home-services-combined popular-services-section py-5">
      <div className="container">
        <div className="popular-services-heading text-center">
          <h2>
            <span>Popular Services</span> near you
          </h2>
          <p>Fulfill your local service needs with trusted providers</p>
        </div>

        <div className="popular-services-layout">
          <aside className="popular-services-categories" aria-label="Popular service categories">
            <div className="popular-services-category-grid">
              {categories.slice(0, 10).map((category, index) => (
                <button
                  type="button"
                  className={`popular-services-category ${category.id === activeCategory?.id ? "active" : ""}`}
                  key={category.id}
                  onClick={() => onSelectCategory(category)}
                >
                  <img src={getCategoryImage(category, index)} alt="" loading="lazy" />
                  <span>{cleanCategoryName(category.name)}</span>
                </button>
              ))}
            </div>

            <Link to="/all-services" className="popular-services-view-all">
              View all services
            </Link>
          </aside>

          <div className="popular-services-panel">
            <div className="popular-services-panel-head">
              <div>
                <span>{activeCity ? `Near ${activeCity}` : "Popular now"}</span>
                <h3>{activeCategory?.name || "Local Services"}</h3>
              </div>
              <Link to={buildCategoryHref(activeCategory, activeTab)} className="popular-services-panel-link">
                Explore category
              </Link>
            </div>

            <div className="popular-services-tabs" role="tablist" aria-label={`${activeCategory?.name || "Service"} tabs`}>
              {activeTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab.slug === activeTab?.slug}
                  className={tab.slug === activeTab?.slug ? "active" : ""}
                  key={tab.slug}
                  onClick={() => setActiveSubCategorySlug(tab.slug)}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {providerMessage ? <p className="popular-services-note">{providerMessage}</p> : null}

            <div className="popular-services-list">
              {isLoadingProviders || isLoadingCategories ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div className="popular-services-provider skeleton" key={index}>
                    <span />
                    <div />
                  </div>
                ))
              ) : providers.length ? (
                providers.map((provider) => <ProviderRow provider={provider} key={provider.id} fallbackServiceName={activeTab?.name || activeCategory?.name || "Service"} />)
              ) : (
                <div className="popular-services-empty">
                  <i className="material-icons">storefront</i>
                  <p>No providers posted in this category yet.</p>
                  <Link to="/dashboard/services/new">Post your service</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="home-section-wrapper">
          <div className="home-cta-section">
            <div className="container">
              <div className="row">
                <div className="col-lg-6">
                  <div className="cta-box">
                    <div className="cta-header-block">
                      <div className="cta-header">
                        <i className="material-icons">trending_up</i>
                        <h4>Start Getting New Customers.</h4>
                      </div>

                      <p className="cta-sub">
                        Get listed, reach over 100K+ users, provide solutions, and grow your business.
                      </p>
                    </div>

                    <ul className="cta-list">
                      <li><span>1</span> Expand your business by connecting with customers actively searching.</li>
                      <li><span>2</span> Receive service requests via WhatsApp and email.</li>
                      <li><span>3</span> Ensure visibility in the right categories.</li>
                      <li><span>4</span> Showcase ratings and reviews to build trust.</li>
                      <li><span>5</span> Easily manage leads, quotes, and bookings.</li>
                    </ul>

                    <Link to="/post-your-ads" className="cta-btn">Create Your Business Profile</Link>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="cta-box">
                    <div className="cta-header-block">
                      <div className="cta-header">
                        <i className="material-icons">groups</i>
                        <h4>Connect With Perfect Local Service Business.</h4>
                      </div>

                      <p className="cta-sub">
                        Find a service or nearby business, request a quote, and get it done.
                      </p>
                    </div>

                    <ul className="cta-list">
                      <li><span>1</span> Access verified professionals and stores.</li>
                      <li><span>2</span> Discover services based on location and budget.</li>
                      <li><span>3</span> Compare offers from different providers.</li>
                      <li><span>4</span> Connect via WhatsApp or email instantly.</li>
                      <li><span>5</span> Find services tailored to your needs.</li>
                    </ul>

                    <Link to="/local-services" className="cta-btn">Find a Professional</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProviderRow({ provider, fallbackServiceName }: { provider: PublicAllServicePosting; fallbackServiceName: string }) {
  const primaryService = getProviderServiceNames(provider)[0] || provider.serviceName || fallbackServiceName;
  const extraCount = Math.max(getProviderServiceNames(provider).length - 1, 0);
  const phone = formatPhone(provider);
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <article className="popular-services-provider">
      <div className="popular-services-provider-info">
        <h4>{provider.businessName}</h4>
        <p>
          <i className="material-icons">location_on</i>
          {getProviderLocation(provider)}
        </p>
        <p>
          <i className="material-icons">business</i>
          {primaryService}{extraCount ? ` +${extraCount} More` : ""}
        </p>
      </div>
      <div className="popular-services-actions">
        {telHref ? (
          <a href={telHref} className="popular-services-call" aria-label={`Call ${provider.businessName}`}>
            <i className="material-icons">call</i>
          </a>
        ) : (
          <span className="popular-services-call disabled" aria-hidden="true">
            <i className="material-icons">call</i>
          </span>
        )}
        <Link to={`/local-service-details/${provider.id}?service=${encodeURIComponent(primaryService)}`} className="popular-services-view">
          View More
        </Link>
      </div>
    </article>
  );
}

function buildTabs(category?: AllServiceCategoryOption): AllServiceSubCategoryOption[] {
  if (!category?.subCategories.length) {
    return category ? [fallbackSubCategory(category.id * 1000, category.name, category.slug)] : [];
  }

  return category.subCategories.slice(0, 3);
}

function fallbackSubCategory(id: number, name: string, slug: string): AllServiceSubCategoryOption {
  return {
    id,
    name,
    slug,
    detailedCategories: [],
  };
}

function getCategoryImage(category: AllServiceCategoryOption, index: number) {
  return categoryImagesBySlug[category.slug] || fallbackCategoryImages[index % fallbackCategoryImages.length];
}

function cleanCategoryName(name: string) {
  return name.replace(/\s+Services$/i, "").replace(/\s*\/\s*/g, " / ");
}

function buildCategoryHref(category?: AllServiceCategoryOption, subCategory?: AllServiceSubCategoryOption) {
  if (!category) {
    return "/all-services";
  }

  const detail = subCategory?.detailedCategories[0];
  const params = new URLSearchParams({
    category: category.name,
    categoryId: String(category.id),
  });

  if (subCategory) {
    params.set("subCategory", subCategory.name);
  }

  if (detail) {
    params.set("service", detail.name);
    params.set("detail", detail.slug);
  } else if (subCategory) {
    params.set("service", subCategory.name);
    params.set("detail", subCategory.slug);
  }

  return `/all-services-detailed?${params.toString()}`;
}

function getProviderServiceNames(provider: PublicAllServicePosting) {
  const names = provider.selectedServices
    .map((service) => service.detailedCategoryName || service.subCategoryName)
    .filter(Boolean);

  return Array.from(new Set(names));
}

function getProviderLocation(provider: PublicAllServicePosting) {
  return provider.primaryServiceLocation || provider.serviceLocations.find((location) => location.formattedAddress)?.formattedAddress || "Service area available";
}

function formatPhone(provider: PublicAllServicePosting) {
  const value = `${provider.phoneCountryCode || ""} ${provider.phoneNumber || ""}`.trim();
  return value || "";
}
