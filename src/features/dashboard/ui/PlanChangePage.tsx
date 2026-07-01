import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import DashboardSupportWidget from "../components/DashboardSupportWidget";
import { useCurrentCountry } from "../../../shared/hooks/useCurrentCountry";
import { formatCurrencyAmount } from "../../../shared/utils/currency";

export default function PlanChangePage() {
  const fullName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("customer_name") ||
    "Rn53";
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const currentCountry = useCurrentCountry();
  const premiumPlusPrice = formatCurrencyAmount(20, currentCountry);

  const handlePlanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSupportOpen(false);
  };

  return (
    <>
      <UserHomeHeader />

      <section className="login-reg">
        <div className="container">
          <div className="row">
            <div className="login-main add-list posr">
              <div className="log-bor">&nbsp;</div>
              <div className="log log-1">
                <div className="login login-new">
                  <h4>Change My Plan</h4>
                  <p>
                    Hi {fullName},
                    <br />
                    Your Current Plan <b>Premium Plus</b>
                    <br />
                    {" "}Expiration date 17, Aug 2032
                  </p>
                  <form onSubmit={handlePlanSubmit}>
                    <div className="form-group">
                      <div className="form-group">
                        <select
                          name="user_plan"
                          required
                          id="user_plan"
                          className="form-control"
                          value={selectedPlan}
                          onChange={(event) => setSelectedPlan(event.target.value)}
                        >
                          <option value="">Choose your plan</option>
                          <option value="4">Premium Plus - {premiumPlusPrice}/year</option>
                        </select>
                        <Link
                          to="/pricing-details"
                          className="frmtip"
                          target="_blank"
                        >
                          Plan details
                        </Link>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Change
                    </button>
                  </form>
                  <div className="col-md-12">
                    <Link to="/dashboard" className="skip">
                      Go to user dashboard &gt;&gt;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardSupportWidget
        isOpen={isSupportOpen}
        onOpen={() => setIsSupportOpen(true)}
        onClose={() => setIsSupportOpen(false)}
        onSubmit={handleSupportSubmit}
      />

      <DashboardFooter
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenMobileMenu={() =>
          window.dispatchEvent(new Event("chaodesi:open-mobile-menu"))
        }
      />
    </>
  );
}
