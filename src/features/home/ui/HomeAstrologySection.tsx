export default function HomeAstrologySection() {
  return (
    <section className="chao-astro">
      <div className="container">
        <div className="astro-title text-center">
          <h2>Astrology</h2>
          <p>Consult with Certified, Experienced and Trusted Astrology Professionals</p>
        </div>

        <p className="astro-desc text-center">
          Join over 100,000 satisfied users who have found answers through our online astrology consultations.
          Connect with expert astrologers and get personalized insights, remedies, and live readings.
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
                <li>Immediate online prediction</li>
                <li>Simple remedies</li>
                <li>Personalized solutions</li>
              </ul>
            </div>

            <div className="astro-tags">
              <h5>Most Popular Astrology Categories</h5>
              <div className="tags">
                <span>Career</span>
                <span>Money</span>
                <span>Love</span>
                <span>Marriage</span>
                <span>Numerology</span>
              </div>
            </div>

            <div className="astro-buttons">
              <a href="#" className="btn-outline">Talk to Astrologer</a>
              <a href="#" className="btn-outline">Order a Report</a>
              <a href="#" className="btn-outline">Ask a Question</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}