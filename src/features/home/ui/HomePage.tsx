import { lazy, Suspense } from "react";
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

      <Suspense fallback={null}>
        <HomePromoCards />
        <HomeArtistToursSection />
        <HomeCareFeaturedListingsSection />
        <HomeRoommatesSection />
        <HomeEventsSection />
        <HomePopularServicesSection />
        <HomeCareServicesSection />
        <HomeJobsSection />
        <HomeAstrologySection />
        <HomeTechnologySection />
        <HomeLawyersSection />
        <HomeTravelCarsSection />
        <HomeBuySellSection />
        <HomeBannerSliderSection />
        <HomeFeaturedListingsSection />
        <HomePlansSection />
        <HomeFeaturedAreasSection />
        <HomeAdsSection />
        <HomeListBusinessSection />
        <HomeFooterSection />
      </Suspense>
    </div>
  );
}
