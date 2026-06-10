import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import CustomerHeader from "./CustomerHeader";
import HomeHeroSection from "./HomeHeroSection";
import "../styles/home.css";

const HomePromoCards = lazy(() => import("./HomePromoCards"));
const HomeArtistToursSection = lazy(() => import("./HomeArtistToursSection"));
const HomeRoommatesSection = lazy(() => import("./HomeRoommatesSection"));
const HomeEventsSection = lazy(() => import("./HomeEventsSection"));
const HomePopularServicesSection = lazy(() => import("./HomePopularServicesSection"));
const HomeCareServicesSection = lazy(() => import("./HomeCareServicesSection"));
const HomeJobsSection = lazy(() => import("./HomeJobsSection"));
const HomeAstrologySection = lazy(() => import("./HomeAstrologySection"));
const HomeTechnologySection = lazy(() => import("./HomeTechnologySection"));
const HomeLawyersSection = lazy(() => import("./HomeLawyersSection"));
const HomeTravelCarsSection = lazy(() => import("./HomeTravelCarsSection"));
const HomeBuySellSection = lazy(() => import("./HomeBuySellSection"));
const HomeBannerSliderSection = lazy(() => import("./HomeBannerSliderSection"));
const HomeFeaturedListingsSection = lazy(() => import("./HomeFeaturedListingsSection"));
const HomeCareFeaturedListingsSection = lazy(() =>
  import("./HomeFeaturedListingsSection").then((module) => ({ default: module.HomeCareFeaturedListingsSection }))
);
const HomePlansSection = lazy(() => import("./HomePlansSection"));
const HomeFeaturedAreasSection = lazy(() => import("./HomeFeaturedAreasSection"));
const HomeListBusinessSection = lazy(() => import("./HomeListBusinessSection"));
const HomeFooterSection = lazy(() => import("./HomeFooterSection"));
const HomeAdsSection = lazy(() => import("./HomeAdsSection"));

function ViewportDeferredSection({
  children,
  minHeight = 260,
  rootMargin = "800px 0px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const host = hostRef.current;
    if (!host) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={hostRef} style={shouldRender ? undefined : { minHeight }}>
      {shouldRender ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}

declare global {
  interface Window {
    $?: any;
    jQuery?: any;
  }
}

export default function HomePage() {
  return (
    <div className="chao-home-page">
      <section>
        <div className="str ind2-home">
          <CustomerHeader />
          <HomeHeroSection />
        </div>
      </section>

      <ViewportDeferredSection minHeight={160} rootMargin="1200px 0px">
        <HomePromoCards />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeArtistToursSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeCareFeaturedListingsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeRoommatesSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeEventsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomePopularServicesSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeCareServicesSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeJobsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeAstrologySection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeTechnologySection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeLawyersSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeTravelCarsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeBuySellSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeBannerSliderSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeFeaturedListingsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomePlansSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeFeaturedAreasSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection minHeight={160}>
        <HomeAdsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeListBusinessSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection minHeight={360}>
        <HomeFooterSection />
      </ViewportDeferredSection>
    </div>
  );
}
