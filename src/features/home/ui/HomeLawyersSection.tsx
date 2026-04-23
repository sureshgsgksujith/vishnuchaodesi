import { useState } from "react";

type LawTabKey = "tab1" | "tab2" | "tab3" | "tab4" | "tab5" | "tab6";

export default function HomeLawyersSection() {
  const [activeTab, setActiveTab] = useState<LawTabKey>("tab1");

  return (
    <section className="chao-law">
      <div className="container">
        <div className="law-title text-center">
          <h2>Lawyers &amp; Immigration Services</h2>
          <p>Find Trusted Lawyers &amp; Consultants for your Legal Needs</p>
        </div>

        <div className="law-tabs">
          <button
            className={`law-tab ${activeTab === "tab1" ? "active" : ""}`}
            data-tab="tab1"
            onClick={() => setActiveTab("tab1")}
          >
            Administrative
          </button>
          <button
            className={`law-tab ${activeTab === "tab2" ? "active" : ""}`}
            data-tab="tab2"
            onClick={() => setActiveTab("tab2")}
          >
            Civil Rights
          </button>
          <button
            className={`law-tab ${activeTab === "tab3" ? "active" : ""}`}
            data-tab="tab3"
            onClick={() => setActiveTab("tab3")}
          >
            Consumer
          </button>
          <button
            className={`law-tab ${activeTab === "tab4" ? "active" : ""}`}
            data-tab="tab4"
            onClick={() => setActiveTab("tab4")}
          >
            Criminal
          </button>
          <button
            className={`law-tab ${activeTab === "tab5" ? "active" : ""}`}
            data-tab="tab5"
            onClick={() => setActiveTab("tab5")}
          >
            Employment
          </button>
          <button
            className={`law-tab ${activeTab === "tab6" ? "active" : ""}`}
            data-tab="tab6"
            onClick={() => setActiveTab("tab6")}
          >
            Immigration
          </button>
        </div>

        <div className="law-content">
          {activeTab === "tab1" && (
            <div className="law-tab-content active" id="tab1">
              <ul>
                <li>Administrative Hearings</li>
                <li>Administrative Law Judges</li>
                <li>Agency Investigations</li>
                <li>Challenging Regulatory Actions</li>
                <li>Enforcement Actions</li>
              </ul>
            </div>
          )}

          {activeTab === "tab2" && (
            <div className="law-tab-content active" id="tab2">
              <ul>
                <li>Municipal Law</li>
                <li>Civil Defense Litigation</li>
                <li>Civil Attorney</li>
                <li>Native American Law</li>
              </ul>
            </div>
          )}

          {activeTab === "tab3" && (
            <div className="law-tab-content active" id="tab3">
              <ul>
                <li>Consumer Fraud</li>
                <li>Investment Fraud</li>
                <li>Lemon Law</li>
                <li>Securities Fraud</li>
              </ul>
            </div>
          )}

          {activeTab === "tab4" && (
            <div className="law-tab-content active" id="tab4">
              <ul>
                <li>Criminal Appeals</li>
                <li>Domestic Violence</li>
                <li>Drug Crimes</li>
                <li>DUI &amp; DWI</li>
              </ul>
            </div>
          )}

          {activeTab === "tab5" && (
            <div className="law-tab-content active" id="tab5">
              <ul>
                <li>Employment Contracts</li>
                <li>Wrongful Termination</li>
                <li>Employee Benefits</li>
              </ul>
            </div>
          )}

          {activeTab === "tab6" && (
            <div className="law-tab-content active" id="tab6">
              <ul>
                <li>Asylum</li>
                <li>US Citizenship</li>
                <li>OPT / CPT</li>
                <li>H1B</li>
              </ul>
            </div>
          )}
        </div>

        <div className="text-center mt-50">
          <a href="#" className="btn-outline">View More →</a>
        </div>
      </div>
    </section>
  );
}