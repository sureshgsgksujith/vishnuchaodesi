import { useEffect, useMemo, useState } from "react";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";

const fallbackHomeSliderBanners: PageBanner[] = [
  {
    id: -101,
    pageKey: "home",
    slot: "slider",
    title: "Home slider banner 1",
    imageUrl: "/template-17/images/slider/90890557952.jpg",
    linkUrl: null,
    altText: "Home slider banner 1",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: -102,
    pageKey: "home",
    slot: "slider",
    title: "Home slider banner 2",
    imageUrl: "/template-17/images/slider/27459517111.jpg",
    linkUrl: null,
    altText: "Home slider banner 2",
    displayOrder: 2,
    isActive: true,
  },
];

export default function HomeBannerSliderSection() {
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [hasLoadError, setHasLoadError] = useState(false);
  const sliderBanners = useMemo(
    () => (hasLoadError ? fallbackHomeSliderBanners : getHomeBannersForSlot(banners, "slider")),
    [banners, hasLoadError],
  );

  useEffect(() => {
    let isActive = true;

    getPageBanners("home")
      .then((items) => {
        if (isActive) {
          setBanners(items);
          setHasLoadError(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setHasLoadError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (!sliderBanners.length) {
    return null;
  }

  return (
    <section>
      <div id="demo" className="carousel slide cate-sli caro-home" data-bs-ride="carousel">
        <div className="container">
          <div className="row">
            <div className="inn">
              <div className="carousel-inner">
                {sliderBanners.map((banner, index) => (
                  <div className={`carousel-item${index === 0 ? " active" : ""}`} key={`${banner.id}-${banner.displayOrder}`}>
                    {banner.linkUrl ? (
                      <a href={banner.linkUrl} target="_blank" rel="noreferrer">
                        <img src={banner.imageUrl} alt={banner.altText || banner.title} width="1100" height="500" />
                      </a>
                    ) : (
                      <img src={banner.imageUrl} alt={banner.altText || banner.title} width="1100" height="500" />
                    )}
                  </div>
                ))}
              </div>

              {sliderBanners.length > 1 ? (
                <>
                  <a className="carousel-control-prev" href="#demo" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon"></span>
                  </a>

                  <a className="carousel-control-next" href="#demo" data-bs-slide="next">
                    <span className="carousel-control-next-icon"></span>
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getHomeBannersForSlot(banners: PageBanner[], slot: string) {
  return banners
    .filter((banner) => banner.slot === slot && banner.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}
