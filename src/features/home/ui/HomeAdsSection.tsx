import { useEffect, useMemo, useState } from "react";
import { getPageBanners, type PageBanner } from "../../auth/api/pageBannersApi";

const fallbackHomeAdBanners: PageBanner[] = [
  {
    id: -201,
    pageKey: "home",
    slot: "ad",
    title: "Home ad banner",
    imageUrl: "/template-17/images/ads/732314414ads2.png",
    linkUrl: null,
    altText: "Home ad banner",
    displayOrder: 1,
    isActive: true,
  },
];

export default function HomeAdsSection() {
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [hasLoadError, setHasLoadError] = useState(false);
  const adBanners = useMemo(
    () => (hasLoadError ? fallbackHomeAdBanners : getHomeBannersForSlot(banners, "ad")),
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

  if (!adBanners.length) {
    return null;
  }

  return (
    <section>
      <div className="hom-ads">
        <div className="container">
          <div className="row">
            {adBanners.map((banner) => (
              <div className="filt-com lhs-ads" key={`${banner.id}-${banner.displayOrder}`}>
                <div className="ads-box">
                  <a
                    href={banner.linkUrl || "#"}
                    target={banner.linkUrl ? "_blank" : undefined}
                    rel={banner.linkUrl ? "noreferrer" : undefined}
                    onClick={banner.linkUrl ? undefined : (event) => event.preventDefault()}
                  >
                    <span>Ad</span>
                    <img src={banner.imageUrl} alt={banner.altText || banner.title} loading="lazy" />
                  </a>
                </div>
              </div>
            ))}
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
