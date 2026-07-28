import "../styles/homeAboutSymplore.css";
import chaoDesiOrangeLogo from "../../../images/logo-web-orange.png";
import symploreLogo from "../../../images/symplore-logo.png";

export default function HomeAboutSymploreSection() {
  return (
    <section
      className="cd-about"
      id="about-chaodesi"
      aria-label="About Symplore Inc."
      itemScope
      itemType="https://schema.org/Corporation"
    >
      <div className="cd-about__bg" aria-hidden="true">
        <span className="cd-about__orb cd-about__orb--one" />
        <span className="cd-about__orb cd-about__orb--two" />
        <span className="cd-about__orb cd-about__orb--three" />
      </div>

      <div className="container cd-about__container">
        <header className="cd-about__brand">
          <img
            src={chaoDesiOrangeLogo}
            alt="ChaoDesi – Connect. Discover. Thrive."
            className="cd-about__logo"
            width="320"
            height="88"
            loading="lazy"
            itemProp="logo"
          />
          <span className="cd-about__powered-badge">
            <LightningIcon />
            Powered by Symplore Inc.
          </span>
        </header>

        <article className="cd-about__highlight">
          <a
            className="cd-about__symplore-mark"
            href="https://symploreus.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Symplore Inc. website"
          >
            <img src={symploreLogo} alt="Symplore Inc." width="180" height="50" loading="lazy" />
          </a>
          <div>
            <h3 itemProp="legalName">Symplore Inc.</h3>
            <p className="cd-about__highlight-subtitle">Building Smarter Communities with Artificial Intelligence</p>
            <p>
              Symplore Inc. develops next-generation AI-powered digital platforms that redefine how people discover,
              connect, and engage with their local communities. Through ChaoDesi, users experience intelligent
              recommendations, advanced business discovery, AI-powered search, verified local listings, community
              networking, event exploration, classifieds, and personalized content—all within a secure, scalable,
              modern digital ecosystem designed for the future.
            </p>
          </div>
        </article>

        <meta itemProp="brand" content="ChaoDesi" />
        <meta itemProp="slogan" content="Connecting Communities. Empowering Businesses." />
        <meta itemProp="foundingDate" content="2026" />
      </div>
    </section>
  );
}

function LightningIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>;
}
