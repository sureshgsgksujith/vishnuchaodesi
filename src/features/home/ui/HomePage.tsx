import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import CustomerHeader from "./CustomerHeader";
import HomeHeroSection from "./HomeHeroSection";
import "../styles/home.css";

const HomePromoCards = lazy(() => import("./HomePromoCards"));
const HomeChaoTvSection = lazy(() => import("./HomeChaoTvSection"));
const HomeArtistToursSection = lazy(() => import("./HomeArtistToursSection"));
const HomeRoommatesSection = lazy(() => import("./HomeRoommatesSection"));
const HomeEventsSection = lazy(() => import("./HomeEventsSection"));
const HomePopularServicesSection = lazy(() => import("./HomePopularServicesSection"));
const HomeJobsSection = lazy(() => import("./HomeJobsSection"));
const HomeAstrologySection = lazy(() => import("./HomeAstrologySection"));
const HomeLawyersSection = lazy(() => import("./HomeLawyersSection"));
const HomeTravelCarsSection = lazy(() => import("./HomeTravelCarsSection"));
const HomeBannerSliderSection = lazy(() => import("./HomeBannerSliderSection"));
const HomeFeaturedListingsSection = lazy(() => import("./HomeFeaturedListingsSection"));
const HomeCareFeaturedListingsSection = lazy(() =>
  import("./HomeFeaturedListingsSection").then((module) => ({ default: module.HomeCareFeaturedListingsSection }))
);
const HomePlansSection = lazy(() => import("./HomePlansSection"));
const HomeFooterSection = lazy(() => import("./HomeFooterSection"));
const HomeAdsSection = lazy(() => import("./HomeAdsSection"));
const HomeAboutSymploreSection = lazy(() => import("./HomeAboutSymploreSection"));

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
        <HomeFeaturedListingsSection />
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
        <HomeJobsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeAstrologySection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeLawyersSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeTravelCarsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomeBannerSliderSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection>
        <HomePlansSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection minHeight={160}>
        <HomeAdsSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection minHeight={620}>
        <HomeAboutSymploreSection />
      </ViewportDeferredSection>
      <div
        aria-hidden="true"
        className="home-about-chao-tv-spacer"
        style={{ display: "block", width: "100%", height: 72, minHeight: 72, background: "#fff" }}
      />
      <ViewportDeferredSection minHeight={360}>
        <HomeChaoTvSection />
      </ViewportDeferredSection>
      <ViewportDeferredSection minHeight={360}>
        <HomeFooterSection />
      </ViewportDeferredSection>
    </div>
  );
}
