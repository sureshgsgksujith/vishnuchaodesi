import { useEffect, useMemo, useState } from "react";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";

export default function HomeAdsSection() {
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const adBanners = useMemo(
    () => getHomeBannersForSlots(banners, ["chao-tv-top", "ad"]),
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
  }, [adBanners.length]);

  useEffect(() => {
    if (adBanners.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % adBanners.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [adBanners.length]);

  if (!adBanners.length) {
    return null;
  }

  return (
    <section>
      <div className="hom-ads">
        <div className="container">
          <div className="row">
            <div className="filt-com lhs-ads home-chao-tv-top-banner">
              <div className="ads-box home-dynamic-banner">
                {adBanners.length > 1 ? (
                  <button type="button" className="home-dynamic-banner-arrow is-left" onClick={() => setActiveIndex((activeIndex - 1 + adBanners.length) % adBanners.length)} aria-label="Previous banner">
                    <i className="material-icons">chevron_left</i>
                  </button>
                ) : null}

                <div className="home-dynamic-banner-window">
                  <div className="home-dynamic-banner-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                    {adBanners.map((banner) => (
                      <HomeAdBanner banner={banner} key={`${banner.id}-${banner.displayOrder}`} />
                    ))}
                  </div>
                </div>

                {adBanners.length > 1 ? (
                  <button type="button" className="home-dynamic-banner-arrow is-right" onClick={() => setActiveIndex((activeIndex + 1) % adBanners.length)} aria-label="Next banner">
                    <i className="material-icons">chevron_right</i>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeAdBanner({ banner }: { banner: PageBanner }) {
  const image = (
    <>
      <span>Ad</span>
      <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="lazy" />
    </>
  );

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
