import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getMyPlanUsage, type PlanUsage } from "../../pricing/api/pricingApi";

export default function ListingStartPage() {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    let isActive = true;
    getMyPlanUsage()
      .then((data) => {
        if (isActive) {
          setUsage(data);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingUsage(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const needsPlanAction = usage ? usage.requiresPlanSelection || usage.isPlanExpired || !usage.canCreateListing : false;

  return (
    <>
      <UserHomeHeader />
      <section className="login-reg">
        <div className="container">
          <div className="row">
            <div className="login-main add-list">
              <div className="log-bor">&nbsp;</div>
              <span className="steps">Create new</span>
              <div className="log">
                <div className="login">
                  <h4>Add New Listing</h4>
                  {isLoadingUsage ? <div className="alert alert-info">Checking your plan...</div> : null}
                  {!isLoadingUsage && usage && needsPlanAction ? (
                    <div className="alert alert-info">
                      {usage.message || `Your ${usage.plan.name} requires a plan update before publishing.`}
                    </div>
                  ) : null}
                  <div className="row cre-dup">
                    <div className="col-md-6">
                      <Link to="/dashboard/listings/new">Create listing from scratch</Link>
                    </div>
                    <div className="col-md-6">
                      <span className="cre-dup-btn">Create duplicate listing</span>
                    </div>
                  </div>
                  <form className="cre-dup-form cre-dup-form-show">
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <select className="chosen-select form-control" defaultValue="">
                            <option value="" disabled>Listing Name</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <input type="text" className="form-control" placeholder="New Listing Name*" />
                        </div>
                      </div>
                    </div>
                    <Link to="/dashboard/listings/new?mode=duplicate" className="btn btn-primary">Create Now</Link>
                  </form>
                  <div className="col-md-12">
                    <Link to="/dashboard" className="skip">Go to user dashboard &gt;&gt;</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}
