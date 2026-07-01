import { useEffect, useMemo, useState } from "react";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";

export default function HomeBannerSliderSection() {
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderBanners = useMemo(
    () => getHomeBannersForSlots(banners, ["pricing-top", "slider"]),
    [banners],
  );

  useEffect(() => {
    let isActive = true;

    getPageBanners("home")
      .then((items) => {
        if (isActive) {
          setBanners(items);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [sliderBanners.length]);

  useEffect(() => {
    if (sliderBanners.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % sliderBanners.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [sliderBanners.length]);

  if (!sliderBanners.length) {
    return null;
  }

  return (
    <section className="home-dynamic-banner-section home-pricing-banner-section">
      <div className="container">
        <div className="home-dynamic-banner">
          {sliderBanners.length > 1 ? (
            <button type="button" className="home-dynamic-banner-arrow is-left" onClick={() => setActiveIndex((activeIndex - 1 + sliderBanners.length) % sliderBanners.length)} aria-label="Previous banner">
              <i className="material-icons">chevron_left</i>
            </button>
          ) : null}

          <div className="home-dynamic-banner-window">
            <div className="home-dynamic-banner-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {sliderBanners.map((banner) => (
                <HomeDynamicBanner banner={banner} key={`${banner.id}-${banner.displayOrder}`} />
              ))}
            </div>
          </div>

          {sliderBanners.length > 1 ? (
            <button type="button" className="home-dynamic-banner-arrow is-right" onClick={() => setActiveIndex((activeIndex + 1) % sliderBanners.length)} aria-label="Next banner">
              <i className="material-icons">chevron_right</i>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HomeDynamicBanner({ banner }: { banner: PageBanner }) {
  const image = <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="lazy" />;

  return (
    <div className="home-dynamic-banner-slide">
      {banner.linkUrl ? (
        <a href={banner.linkUrl} target="_blank" rel="noreferrer">
          {image}
        </a>
      ) : image}
    </div>
  );
}

function getHomeBannersForSlots(banners: PageBanner[], slots: string[]) {
  const slotSet = new Set(slots);

  return banners
    .filter((banner) => slotSet.has(banner.slot) && banner.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}
