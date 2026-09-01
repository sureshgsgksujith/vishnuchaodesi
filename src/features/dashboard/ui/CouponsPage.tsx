import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getCoupons, type Coupon } from "../../coupons/api/couponsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCoupons("", 1, 50)
      .then((result) => active && setCoupons(result.items || []))
      .catch(() => active && setCoupons([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-listings-main">
      <div className="ud-cen dashboard-listings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Coupons</span>

        <div className="ud-cen-s2 dashboard-listings-panel">
          <div className="dashboard-listings-toolbar">
            <div className="dashboard-listings-title-block">
              <h2>Coupons &amp; Deals</h2>
              <span>{coupons.length} active offers published by ChaoDesi</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table bordered dashboard-listings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Coupon</th>
                  <th>Category</th>
                  <th>Expires</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Loading coupons...</td></tr>
                ) : coupons.length ? coupons.map((coupon, index) => (
                  <tr key={coupon.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="dashboard-listing-title-cell">
                        <img
                          src={resolveListingImageUrl(coupon.imageUrl)}
                          alt={coupon.title}
                          onError={setFallbackListingImage}
                        />
                        <div>
                          <strong>{coupon.title}</strong>
                          <span className="dashboard-listing-module-badge is-coupons">Coupons</span>
                          <span>{coupon.businessName || "ChaoDesi"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dashboard-listing-module-pill is-coupons">Coupons</span>
                      <em className="dashboard-listing-category-path">
                        {coupon.category || "Community deals"}
                      </em>
                    </td>
                    <td>{formatDate(coupon.endDate)}</td>
                    <td><strong>{coupon.discountText || "Offer"}</strong></td>
                    <td>
                      <span className="db-list-ststus dashboard-listing-approved">
                        {coupon.status || "Active"}
                      </span>
                    </td>
                    <td>
                      <Link to="/coupons" className="db-list-edit" target="_blank" rel="noreferrer">
                        View
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}>No active coupons found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
