import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import "../styles/allServices.css";

export default function AllServicesDetailedPage() {
  const [searchParams] = useSearchParams();
  const service = cleanServiceName(searchParams.get("service")) || "Metal Fabricators";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState("");

  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Your enquiry has been prepared. Dynamic submission will be connected later.");
  }

  return (
    <>
      <CustomerHeader />
      <main className="service-detail-page">
        <section className="service-detail-hero">
          <div className="all-services-container">
            <nav className="all-services-crumb" aria-label="breadcrumb">
              <Link to="/home">Home</Link>
              <span>/</span>
              <Link to="/all-services">All Services</Link>
              <span>/</span>
              <b>{service}</b>
            </nav>
            <div className="service-detail-grid">
              <div>
                <span className="service-detail-eyebrow"><i className="material-icons">verified_user</i> Trusted local experts</span>
                <h1>{service} Services</h1>
                <p>
                  Tell us more about your requirement so Chao Desi can connect you to the right {service} near you.
                  Compare responses, choose a trusted provider and move forward with confidence.
                </p>
                <div className="service-detail-steps">
                  <Step number="1" title="Submit your requirement" text="Pick the service and share basic contact details." />
                  <Step number="2" title="Get quotes from experts" text="Receive responses from matching local providers." />
                  <Step number="3" title="Choose your provider" text="Compare, talk, and hire the right expert." />
                </div>
              </div>

              <aside className="service-detail-card">
                <h3>What {service} are you looking for?</h3>
                <label className="service-detail-search">
                  <i className="material-icons">search</i>
                  <input value={service} readOnly />
                </label>
                <div className="service-detail-check-list">
                  <label><input type="checkbox" defaultChecked /> <span>{service}</span></label>
                  <label><input type="checkbox" /> Residential service</label>
                  <label><input type="checkbox" /> Commercial service</label>
                  <label><input type="checkbox" /> Urgent requirement</label>
                </div>
                <button type="button" onClick={() => setIsModalOpen(true)}>Get Started</button>
              </aside>
            </div>
          </div>
        </section>

        <section className="service-detail-content">
          <div className="all-services-container">
            <div className="service-detail-info-grid">
              <div className="service-detail-info-box">
                <h2>Find The Right {service}</h2>
                <p>
                  Chao Desi helps you submit one requirement and connect with service providers who understand your local needs.
                  This page keeps the request flow simple and ready for dynamic integration.
                </p>
                <ul>
                  <li><i className="material-icons">check_circle</i> Share your need once and get matched with relevant local providers.</li>
                  <li><i className="material-icons">check_circle</i> Use the enquiry form to collect name, city, email and phone details.</li>
                  <li><i className="material-icons">check_circle</i> Works for every service selected from the All Services page.</li>
                </ul>
              </div>
              <div className="service-detail-info-box">
                <h3>Popular Service Needs</h3>
                <ul>
                  <li><i className="material-icons">build</i> New installation or project work</li>
                  <li><i className="material-icons">schedule</i> Quick estimate or consultation</li>
                  <li><i className="material-icons">business</i> Residential and commercial requests</li>
                  <li><i className="material-icons">near_me</i> Local providers near your city</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {isModalOpen ? (
        <div className="service-detail-modal-backdrop" role="dialog" aria-modal="true">
          <form className="service-detail-modal" onSubmit={submitQuote}>
            <button type="button" aria-label="Close" className="service-detail-modal-close" onClick={() => setIsModalOpen(false)}>x</button>
            <h4>Get Matched with the Right Expert for Your Needs</h4>
            <input type="text" placeholder="Name *" required />
            <input type="text" defaultValue="New York, NY" placeholder="City *" required />
            <input type="email" placeholder="Email *" required />
            <div className="service-detail-phone-row">
              <input type="text" defaultValue="+1 US" />
              <input type="text" placeholder="Contact Number *" required />
            </div>
            <button type="submit">Send Enquiry</button>
            <label className="service-detail-consent">
              <input type="checkbox" />
              <span>I agree to be contacted by Chao Desi via call, SMS, or WhatsApp.</span>
            </label>
            {status ? <p className="service-detail-status">{status}</p> : null}
          </form>
        </div>
      ) : null}

      <HomeFooterSection />
    </>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <strong>{number}</strong>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function cleanServiceName(value: string | null) {
  return decodeURIComponent(value || "").replace(/\+/g, " ").trim();
}
