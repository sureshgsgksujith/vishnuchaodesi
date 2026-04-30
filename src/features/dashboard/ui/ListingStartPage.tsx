import { Link } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";

export default function ListingStartPage() {
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
