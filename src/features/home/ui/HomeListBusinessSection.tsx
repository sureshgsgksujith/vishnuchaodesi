import { Link } from "react-router-dom";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";

export default function HomeListBusinessSection() {
  const addBusinessPath = isCustomerAuthenticated() ? "/dashboard/listings/new" : "/pricing-details";

  return (
    <section>
      <div className="full-bot-book">
        <div className="container">
          <div className="row">
            <div className="bot-book">
              <div className="col-md-12 bb-text">
                <h4>List your business for FREE</h4>
                <p>
                  There are many variations of passages of Lorem Ipsum available, but the majority have suffered
                  alteration in some form, by injected humour.
                </p>
                <Link to={addBusinessPath}>
                  Add my business
                  <i className="material-icons">arrow_forward</i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
