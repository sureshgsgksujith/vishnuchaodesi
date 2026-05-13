import { useCurrentCountry } from "../../../shared/hooks/useCurrentCountry";
import { formatCurrencyAmount } from "../../../shared/utils/currency";

export default function HomePlansSection() {
  const currentCountry = useCurrentCountry();

  return (
    <section className="pri">
      <div className="container">
        <div className="row">
          <div className="plac-det-tit-inn">
            <h2>Choose your plan</h2>
          </div>

          <div>
            <ul>
              <li>
                <div className="pri-box">
                  <div className="c2">
                    <h4>FreePLAN</h4>
                    <p>For getting started</p>
                  </div>

                  <div className="c3">
                    <h2>
                      <span></span>
                      FREE
                    </h2>
                    <p>Single user</p>
                  </div>

                  <div className="c5">
                    <a href="/login" className="cta1">Get Start</a>
                    <a href="/pricing-details" className="cta2" target="_blank" rel="noreferrer">
                      Know more
                    </a>
                  </div>
                </div>
              </li>

              <li>
                <div className="pri-box">
                  <div className="c2">
                    <h4>StandardPLAN</h4>
                    <p>Perfect for small teams</p>
                  </div>

                  <div className="c3">
                    <h2>
                      <span></span>
                      {formatCurrencyAmount(9, currentCountry)}
                    </h2>
                    <p>Startup business</p>
                  </div>

                  <div className="c5">
                    <a href="/login" className="cta1">Get Start</a>
                    <a href="/pricing-details" className="cta2" target="_blank" rel="noreferrer">
                      Know more
                    </a>
                  </div>
                </div>
              </li>

              <li>
                <div className="pri-box">
                  <div className="c2">
                    <h4>PremiumPLAN</h4>
                    <p>Best value for large teams</p>
                  </div>

                  <div className="c3">
                    <h2>
                      <span></span>
                      {formatCurrencyAmount(19, currentCountry)}
                    </h2>
                    <p>Medium business</p>
                  </div>

                  <div className="c5">
                    <a href="/login" className="cta1">Get Start</a>
                    <a href="/pricing-details" className="cta2" target="_blank" rel="noreferrer">
                      Know more
                    </a>
                  </div>
                </div>
              </li>

              <li>
                <div className="pri-box">
                  <div className="c2">
                    <h4>Premium PlusPLAN</h4>
                    <p>Made for enterprises</p>
                  </div>

                  <div className="c3">
                    <h2>
                      <span></span>
                      {formatCurrencyAmount(20, currentCountry)}
                    </h2>
                    <p>Made for enterprises</p>
                  </div>

                  <div className="c5">
                    <a href="/login" className="cta1">Get Start</a>
                    <a href="/pricing-details" className="cta2" target="_blank" rel="noreferrer">
                      Know more
                    </a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
