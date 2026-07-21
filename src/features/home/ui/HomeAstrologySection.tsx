import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAstrologyReports, type AstrologyReport } from "../../astrology/api/astrologyApi";

type AstroLink = {
  label: string;
  to: string;
};

const astroBenefits = [
  "Get clear next-step guidance",
  "Review practical remedies",
  "Choose a personal report or live session",
];

const astrologyActions: AstroLink[] = [
  { label: "Talk to Astrologer", to: "/astrology/talk-to-astrologer" },
  { label: "Order a Report", to: "/astrology/astrology-reports" },
  { label: "Ask a Question", to: "/astrology/ask-a-question" },
];

export default function HomeAstrologySection() {
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;
    getAstrologyReports()
      .then((items) => {
        if (!isActive) return;
        setReports(items);
        setLoadError("");
      })
      .catch(() => {
        if (isActive) setLoadError("Astrology reports are temporarily unavailable.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const astrologyCategories: AstroLink[] = [
    { label: "Astrologers", to: "/astrology/astrologers" },
    ...reports.slice(0, 5).map((report) => ({ label: report.category || report.title, to: `/astrology/${report.slug}` })),
  ];

  return (
    <section className="chao-astro">
      <div className="container">
        <div className="astro-title text-center">
          <h2>Astrology</h2>
          <p>Connect with experienced astrology professionals for personal guidance</p>
        </div>

        <p className="astro-desc text-center">
          Explore live consultations, focused reports, and question-based guidance for career, wealth,
          relationships, marriage, and name insights.
        </p>

        <div className="row align-items-center astro-content">
          <div className="col-md-5">
            <div className="astro-image">
              <img src="/template-17/images/home/astro.png" alt="Astrology Services" />
            </div>
          </div>

          <div className="col-md-7">
            <div className="astro-features">
              <h4>Make the most out of Astro</h4>
              <ul>
                {astroBenefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            </div>

            <div className="astro-tags">
              <h5>Most Popular Astrology Categories</h5>
              <div className="tags">
                {isLoading ? <span>Loading live reports...</span> : null}
                {loadError ? <span>{loadError}</span> : null}
                {astrologyCategories.map((category) => (
                  <Link to={category.to} key={category.to}>
                    {category.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="astro-buttons">
              {astrologyActions.map((action) => (
                <Link className="btn-outline" to={action.to} key={action.to}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
