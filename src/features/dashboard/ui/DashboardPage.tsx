import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import {
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../utils/profileStorage";

export default function DashboardPage() {
  const [identity, setIdentity] = useState(getStoredDashboardIdentity());
  const fullName = identity.fullName;
  const profileCardImageStyle = {
    width: 100,
    height: 100,
    objectFit: "cover",
    objectPosition: "center",
    borderRadius: "50%",
    border: "4px solid #fff",
    margin: "0 auto 15px",
    display: "block",
    float: "none",
  } as const;
  const jobProfileHref = "/profile-job-user";
  const jobProfileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${jobProfileHref}`
      : jobProfileHref;

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredDashboardIdentity());

    window.addEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
    return () =>
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        eyebrow: "New Users",
        title: "All Listings",
        count: "04",
        description: "Total no of listings",
        href: "/dashboard/all-listing",
        className: "ud-box-com-25 box-drk grn-box",
      },
      {
        eyebrow: "Enquiries",
        title: "Enquiries",
        count: "03",
        description: "Total no of enquiry",
        href: "/dashboard/enquiry",
        className: "ud-box-com-25 db-box-blu-25",
      },
      {
        eyebrow: "Followings",
        title: "Followings",
        count: "38",
        description: "Total no of followings",
        href: "/dashboard/followings",
        className: "ud-box-com-25 box-drk db-box-gre-25",
      },
    ],
    []
  );

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="cd-cen-intr">
          <div className="cd-cen-intr-inn">
            <h2>
              Welcom back, <b>{fullName}</b>
            </h2>
            <p>
              Stay up to date reports in your listing, products, events and blog
              reports here
            </p>
          </div>
        </div>

        <div className="ud-cen-s1-25 row">
          {summaryCards.map((card) => (
            <div className={card.className} key={card.title}>
              <h4>{card.eyebrow}</h4>
              <h2>{card.title}</h2>
              <span className="bnum">{card.count}</span>
              <p>{card.description}</p>
              <Link to={card.href} className="fclick">
                &nbsp;
              </Link>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="ud-cen-s3 ud-cen-s4 col-md-6">
            <h2>Profile page</h2>
            <div className="ud-payment ud-pro-link row">
              <div className="pay-lhs">
                <div className="lis-pro-badg">
                  <div>
                    <img
                      src={identity.profileImageUrl}
                      alt={fullName}
                      style={profileCardImageStyle}
                    />
                    <h4>{fullName}</h4>
                    <p>Member since02, Jun 2025</p>
                  </div>
                  <Link to="/profile" className="fclick" target="_blank">
                    &nbsp;
                  </Link>
                </div>
              </div>
              <div className="hide-pop-cta">
                <Link
                  to="/profile"
                  target="_blank"
                  className="btn btn-outline-primary"
                >
                  View my profile page
                </Link>
                <Link
                  to="/dashboard/my-profile-edit"
                  className="btn btn-outline-success"
                >
                  Edit profile page
                </Link>
              </div>
            </div>
          </div>

          <div className="ud-cen-s3 ud-cen-s4 col-md-6">
            <h2>Business page</h2>
            <div className="ud-payment ud-pro-link row bus-pg">
              <div className="pay-lhs">
                <div className="lis-pro-badg">
                  <div>
                    <img
                      src="/template-17/images/user/10.png"
                      alt="Website Directory"
                      style={profileCardImageStyle}
                    />
                    <h4>Website Directory</h4>
                    <p>Member since02, Jun 2025</p>
                  </div>
                  <Link to="/company-profile" className="fclick" target="_blank">
                    &nbsp;
                  </Link>
                </div>
              </div>
              <div className="hide-pop-cta">
                <Link
                  to="/company-profile"
                  target="_blank"
                  className="btn btn-outline-primary"
                >
                  View business page
                </Link>
                <Link
                  to="/company-profile-edit"
                  className="btn btn-outline-success"
                >
                  Edit business page
                </Link>
              </div>
            </div>
          </div>

          <div className="ud-cen-s3 ud-cen-s4 col-md-6">
            <h2>Service Expert Profile</h2>
            <div className="ud-payment ud-pro-link row bus-pg">
              <div className="pay-lhs">
                <div className="lis-pro-badg">
                  <div>
                    <img
                      src="/template-17/service-experts/images/services/1.jpg"
                      alt={fullName}
                      style={profileCardImageStyle}
                    />
                    <h4>{fullName}</h4>
                    <p>Member since02, Jun 2025</p>
                  </div>
                  <a
                    href="/template-17/service-experts/service-experts-profile.html"
                    className="fclick"
                    target="_blank"
                    rel="noreferrer"
                  >
                    &nbsp;
                  </a>
                </div>
              </div>
              <div className="hide-pop-cta">
                <a
                  href="/template-17/service-experts/service-experts-profile.html"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-primary"
                >
                  View Expert Profile page
                </a>
                <Link
                  to="/create-service-expert-profile"
                  className="btn btn-outline-success"
                >
                  Edit Your Expert Profile
                </Link>
              </div>
            </div>
          </div>

          <div className="ud-cen-s3 ud-cen-s4 col-md-6">
            <h2>Job Profile</h2>
            <Link to="/create-job-seeker-profile" className="db-tit-btn">
              Edit Your Job Profile
            </Link>
            <div className="ud-payment ud-pro-link bus-pg">
              <div className="pay-lhs">
                <div className="lis-pro-badg">
                  <div>
                    <img
                      src="/template-17/jobs/images/jobs/22000bean.jpg"
                      alt={fullName}
                      loading="lazy"
                      style={profileCardImageStyle}
                    />
                    <h4>{fullName}</h4>
                    <p>Member since17, Aug 2022</p>
                  </div>
                  <Link to={jobProfileHref} className="fclick" target="_blank">
                    &nbsp;
                  </Link>
                </div>
              </div>
              <div className="pay-rhs">
                <ul>
                  <li>
                    <b>Name :</b> {fullName}
                  </li>
                  <li>
                    <b>Page views :</b> <span>00</span>
                  </li>
                  <li className="pro">
                    <input type="text" value={jobProfileUrl} readOnly />
                  </li>
                  <li className="pre">
                    <Link target="_blank" to={jobProfileHref}>
                      View Job Profile page
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
