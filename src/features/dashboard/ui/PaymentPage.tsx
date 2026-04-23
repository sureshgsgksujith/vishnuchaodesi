import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";

type PaymentGateway = {
  id: string;
  label: string;
  helpText: string;
  question: string;
};

type BillingFormState = {
  country: string;
  state: string;
  city: string;
  address: string;
  zipCode: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
};

const paymentGateways: PaymentGateway[] = [
  {
    id: "paymentpaypal",
    label: "PayPal payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a PayPal account.",
    question: "What is PayPal?",
  },
  {
    id: "paymentstripe",
    label: "Stripe payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a Stripe account.",
    question: "What is Stripe?",
  },
  {
    id: "payment_razor_pay",
    label: "RazorPay payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a RazorPay account.",
    question: "What is RazorPay?",
  },
  {
    id: "payment_paytm",
    label: "PayTm payment gateway",
    helpText:
      "You can pay with your credit card if you don’t have a PayTm account.",
    question: "What is PayTm?",
  },
];

const initialBillingState: BillingFormState = {
  country: "India",
  state: "Kerala",
  city: "Illunois city",
  address: "7th",
  zipCode: "600069",
  contactName: "hhjjj",
  contactMobile: "",
  contactEmail: "ff@gmail.com",
};

export default function PaymentPage() {
  const fullName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("customer_name") ||
    "Rn53";
  const [selectedGateway, setSelectedGateway] = useState(paymentGateways[0].id);
  const [billingForm, setBillingForm] =
    useState<BillingFormState>(initialBillingState);

  const handleBillingChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setBillingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs">
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Payment</span>

        <div className="ud-cen-s2">
          <h2>Payment Status</h2>
          <Link to="/dashboard/plan-change" className="db-tit-btn">
            Change My Plan
          </Link>

          <div className="ud-payment">
            <div className="pay-rhs">
              <ul>
                <li>
                  <b>Name :</b> {fullName}
                </li>
                <li>
                  <b>Plan name :</b> Premium Plus
                </li>
                <li>
                  <b>Start date :</b> 17, Aug 2022
                </li>
                <li>
                  <b>Expiry date :</b> 17, Aug 2032
                </li>
                <li>
                  <b>duration :</b> 10 year
                </li>
                <li>
                  <b>Remaining Days :</b> 3533
                </li>
                <li>
                  <span className="ud-stat-pay-btn">Checkout amount: $20</span>
                </li>
                <li>
                  <span className="ud-stat-pay-btn">
                    Payment Status: PENDING
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="ud-pay-op">
            <h4>Select your payment option</h4>
            <ul>
              {paymentGateways.map((gateway) => {
                const isSelected = gateway.id === selectedGateway;

                return (
                  <li key={gateway.id}>
                    <div className="pay-full">
                      <div className="rbbox">
                        <input
                          type="radio"
                          id={gateway.id}
                          name="payment"
                          checked={isSelected}
                          onChange={() => setSelectedGateway(gateway.id)}
                        />
                        <label htmlFor={gateway.id}>{gateway.label}</label>
                        <div
                          className="pay-note"
                          style={{ display: isSelected ? "block" : "none" }}
                        >
                          <span>
                            <i className="material-icons">star</i>{" "}
                            {gateway.helpText}
                          </span>
                          <span>
                            <i className="material-icons">star</i>
                            {gateway.question}
                          </span>

                          <form onSubmit={handleSubmit}>
                            <h4>Billing details</h4>
                            <ul>
                              <li>
                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        readOnly
                                        className="form-control"
                                        value={fullName}
                                        placeholder="Full name *"
                                        required
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="country"
                                        className="form-control"
                                        value={billingForm.country}
                                        placeholder="Country"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="state"
                                        className="form-control"
                                        value={billingForm.state}
                                        placeholder="State"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="city"
                                        className="form-control"
                                        value={billingForm.city}
                                        placeholder="City *"
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-12">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="address"
                                        className="form-control"
                                        value={billingForm.address}
                                        placeholder="Village & Street name"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        name="zipCode"
                                        className="form-control"
                                        value={billingForm.zipCode}
                                        placeholder="Postcode/ZIP"
                                        inputMode="numeric"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="contactName"
                                        value={billingForm.contactName}
                                        placeholder="Contact person *"
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="row">
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="contactMobile"
                                        value={billingForm.contactMobile}
                                        placeholder="Contact phone number"
                                        inputMode="numeric"
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="form-group">
                                      <input
                                        type="email"
                                        className="form-control"
                                        name="contactEmail"
                                        value={billingForm.contactEmail}
                                        placeholder="Contact Email Id "
                                        required
                                        onChange={handleBillingChange}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </li>
                            </ul>

                            <button type="submit" className="db-pro-bot-btn">
                              Start Payment
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="ud-notes">
            <p>
              <b>Notes:</b> Hi, Before start "Ads Payment" you must know the
              pricing details and positions and all. You just click the
              "Pricing and other details" button in this same page and you know
              the all details. If your payment done means your invoice
              automatically received your "Payment invoice" page and you never
              stop your Ads till the end date.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
