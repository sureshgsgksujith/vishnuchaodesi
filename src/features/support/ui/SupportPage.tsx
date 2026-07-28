import { Link } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import "./supportPage.css";

export type SupportPageKind = "about" | "contact" | "terms" | "privacy" | "advertise" | "copyright";

type PageSection = { title: string; paragraphs?: string[]; items?: string[] };
type SupportPageProps = { kind: SupportPageKind };

const pageContent: Record<SupportPageKind, {
  eyebrow: string;
  title: string;
  introduction: string;
  icon: string;
  sections: PageSection[];
}> = {
  about: {
    eyebrow: "About ChaoDesi",
    title: "Connect. Discover. Thrive.",
    introduction: "ChaoDesi is a community-focused platform that helps people find local businesses, services, classifieds, jobs, events, and useful opportunities in one place.",
    icon: "🤝",
    sections: [
      { title: "What we do", paragraphs: ["We bring local discovery tools together so residents can explore nearby providers and businesses, while organizations and professionals can present their services to the communities they serve."] },
      { title: "Our mission", paragraphs: ["Our mission is to make local discovery simpler, more relevant, and more accessible through verified information, location-aware search, and direct ways to connect."] },
      { title: "What you can discover", items: ["Yellow Pages business listings", "Local service providers", "Classified advertisements", "Jobs, events, community groups, and Chao TV", "Plans and promotional tools for businesses"] },
      { title: "Powered by Symplore Inc.", paragraphs: ["ChaoDesi is a product of Symplore Inc., building intelligent digital platforms that strengthen connections between people, businesses, and communities."] },
    ],
  },
  contact: {
    eyebrow: "Help & Support",
    title: "Contact ChaoDesi",
    introduction: "Contact our team for account assistance, listing questions, advertising enquiries, technical support, or general feedback.",
    icon: "🎧",
    sections: [
      { title: "Customer support", items: ["Email: info@chaodesi.com", "Phone: +1 248 430 4014", "Hours: Monday–Friday, 9:00 AM–5:00 PM Eastern Time"] },
      { title: "Office address", paragraphs: ["39555 Orchard Hill Place, Suite 203, Novi, MI 48375, United States."] },
      { title: "Before contacting us", items: ["Include your registered email address when asking about an account.", "Include the listing or posting reference number when available.", "Never send passwords, OTP codes, or payment credentials by email."] },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    introduction: "These terms govern access to and use of ChaoDesi. By creating an account, publishing content, or using the platform, you agree to use it responsibly and lawfully.",
    icon: "⚖",
    sections: [
      { title: "Account responsibilities", items: ["Provide accurate registration information and keep it current.", "Protect your login credentials and report suspected unauthorized access.", "Use your account only for lawful personal or business activity."] },
      { title: "Listings and user content", items: ["You must have the right to publish all submitted text, images, prices, and contact information.", "Content must not be misleading, unlawful, fraudulent, discriminatory, or infringe another party’s rights.", "ChaoDesi may review, reject, suspend, or remove content that violates platform rules."] },
      { title: "Transactions and third parties", paragraphs: ["ChaoDesi helps users discover and contact third-party businesses and providers. Unless expressly stated otherwise, agreements, payments, service delivery, warranties, and disputes remain between the customer and the third party."] },
      { title: "Platform availability", paragraphs: ["We work to keep ChaoDesi reliable and secure, but uninterrupted availability is not guaranteed. Features may be changed or suspended to improve the service or meet legal and security requirements."] },
      { title: "Contact", paragraphs: ["Questions about these terms can be sent to info@chaodesi.com."] },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    introduction: "This policy explains the types of information ChaoDesi uses to operate accounts, listings, location-aware discovery, communications, and platform security.",
    icon: "🛡",
    sections: [
      { title: "Information we collect", items: ["Account and profile details such as name, email address, and phone number", "Business, listing, classified, event, and service-posting information", "Location selections and approximate location when permission is granted", "Enquiries, reviews, support messages, and communication preferences", "Technical information used for security, diagnostics, and performance"] },
      { title: "How information is used", items: ["Provide and personalize ChaoDesi features", "Display relevant local results and public posting information", "Process enquiries and platform notifications", "Prevent abuse, investigate errors, and protect accounts", "Comply with applicable legal obligations"] },
      { title: "Sharing and visibility", paragraphs: ["Information intentionally added to a public listing may be visible to visitors. Service providers may help us host, maintain, secure, and communicate through the platform, but are not authorized to use information for unrelated purposes."] },
      { title: "Your choices", paragraphs: ["You may update profile and posting information through your account. For privacy questions or requests concerning your information, contact info@chaodesi.com."] },
      { title: "Security and retention", paragraphs: ["We use reasonable technical and organizational safeguards. Information is retained only as needed for platform operations, security, dispute handling, and legal requirements."] },
    ],
  },
  advertise: {
    eyebrow: "Grow with ChaoDesi",
    title: "Advertise With Us",
    introduction: "Reach people who are actively looking for businesses, services, events, products, and opportunities in their local area.",
    icon: "📣",
    sections: [
      { title: "Ways to promote", items: ["Create and enhance a Yellow Pages business listing", "Publish a local service provider profile", "Post classified advertisements, jobs, events, products, or offers", "Use available featured placement and subscription options"] },
      { title: "Why advertise on ChaoDesi", items: ["Location-aware discovery", "Category-specific visibility", "Direct customer enquiries", "A dashboard for managing postings and activity"] },
      { title: "Start advertising", paragraphs: ["Create an account and choose the posting type that fits your goal. For campaign or partnership questions, contact info@chaodesi.com."] },
    ],
  },
  copyright: {
    eyebrow: "Legal",
    title: "Copyright Policy",
    introduction: "ChaoDesi respects intellectual-property rights and expects users to publish only content they own or are authorized to use.",
    icon: "©",
    sections: [
      { title: "Protected content", paragraphs: ["The ChaoDesi name, branding, interface, original text, graphics, software, and platform materials are protected by applicable intellectual-property laws unless otherwise identified."] },
      { title: "User-submitted content", items: ["Do not upload copied photographs, logos, descriptions, videos, or documents without permission.", "The person publishing content is responsible for confirming usage rights.", "Content may be removed when a credible infringement concern is received."] },
      { title: "Report an infringement", items: ["Identify the protected work and the ChaoDesi page containing the disputed material.", "Provide your name, contact details, and a statement explaining your rights.", "Email info@chaodesi.com with the subject “Copyright Notice.”"] },
      { title: "Good-faith review", paragraphs: ["We may request additional information, restrict access to disputed material during review, and notify the user who submitted it."] },
    ],
  },
};

export default function SupportPage({ kind }: SupportPageProps) {
  const content = pageContent[kind];

  return (
    <>
      <CustomerHeader />
      <main className="support-page">
        <section className="support-page__hero">
          <div className="support-page__container">
            <div className="support-page__hero-icon" aria-hidden="true"><span>{content.icon}</span></div>
            <div><span>{content.eyebrow}</span><h1>{content.title}</h1><p>{content.introduction}</p></div>
          </div>
        </section>
        <div className="support-page__container support-page__body">
          <article className="support-page__content">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{renderContactItem(item)}</li>)}</ul> : null}
              </section>
            ))}
          </article>
          <aside className="support-page__aside">
            <i className="material-icons">contact_support</i>
            <h2>Need more help?</h2>
            <p>Our support team can help with accounts, postings, advertising, and policy questions.</p>
            <a href="mailto:info@chaodesi.com">Email support</a>
            <a className="is-secondary" href="tel:+12484304014">+1 248 430 4014</a>
          </aside>
        </div>
        {kind === "advertise" ? (
          <section className="support-page__cta">
            <h2>Ready to reach your community?</h2>
            <p>Create your ChaoDesi posting and manage it from one dashboard.</p>
            <Link to="/post-your-ads">Start advertising</Link>
          </section>
        ) : null}
      </main>
      <HomeFooterSection />
    </>
  );
}

function renderContactItem(item: string) {
  if (item.startsWith("Email: ")) return <><strong>Email:</strong> <a href="mailto:info@chaodesi.com">info@chaodesi.com</a></>;
  if (item.startsWith("Phone: ")) return <><strong>Phone:</strong> <a href="tel:+12484304014">+1 248 430 4014</a></>;
  return item;
}
