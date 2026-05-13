import { useEffect, useState } from "react";
import HomeHeader from "./HomeHeader";
import UserHomeHeader from "./UserHomeHeader";
import HomeHeroSection from "./HomeHeroSection";
import HomePromoCards from "./HomePromoCards";
import HomeArtistToursSection from "./HomeArtistToursSection";
import HomeRoommatesSection from "./HomeRoommatesSection";
import HomeEventsSection from "./HomeEventsSection";
import HomePopularServicesSection from "./HomePopularServicesSection";
import HomeCareServicesSection from "./HomeCareServicesSection";
import HomeJobsSection from "./HomeJobsSection";
import HomeAstrologySection from "./HomeAstrologySection";
import HomeTechnologySection from "./HomeTechnologySection";
import HomeLawyersSection from "./HomeLawyersSection";
import HomeTravelCarsSection from "./HomeTravelCarsSection";
import HomeBuySellSection from "./HomeBuySellSection";
import HomeBannerSliderSection from "./HomeBannerSliderSection";
import HomeFeaturedListingsSection from "./HomeFeaturedListingsSection";
import HomePlansSection from "./HomePlansSection";
import HomeFeaturedAreasSection from "./HomeFeaturedAreasSection";
import HomeListBusinessSection from "./HomeListBusinessSection";
import HomeFooterSection from "./HomeFooterSection";
import HomeAdsSection from "./HomeAdsSection";
import "../styles/home.css";

declare global {
  interface Window {
    $?: any;
    jQuery?: any;
  }
}

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="chao-home-page">
      <section>
        <div className="str ind2-home">
          {isLoggedIn ? <UserHomeHeader /> : <HomeHeader />}
          <HomeHeroSection />
        </div>
      </section>

      <HomePromoCards />
      <HomeArtistToursSection />
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
    </div>
  );
}
