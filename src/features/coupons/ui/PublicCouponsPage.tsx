import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getCoupons, type Coupon } from "../api/couponsApi";
import "./coupons.css";

const PAGE_SIZE = 9;
const categories = ["", "Community", "Food & Dining", "Local Services"];

export default function PublicCouponsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [items, setItems] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    getCoupons(search, page, PAGE_SIZE, category)
      .then((result) => { setItems(result.items); setTotal(result.totalCount); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, page, category]);

  function updateParams(next: { search?: string; category?: string; page?: number }) {
    const values: Record<string, string> = {};
    const nextSearch = next.search ?? search;
    const nextCategory = next.category ?? category;
    const nextPage = next.page ?? 1;
    if (nextSearch) values.search = nextSearch;
    if (nextCategory) values.category = nextCategory;
    if (nextPage > 1) values.page = String(nextPage);
    setParams(values);
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return <><CustomerHeader /><main className="cp-page">
    <section className="cp-hero"><div className="cp-hero-copy"><span>Exclusive community savings</span><h1>Discover deals near you</h1><p>Use verified ChaoDesi offers from local businesses and community services.</p><div className="cp-hero-points"><b><span className="material-icons">verified</span>Current offers</b><b><span className="material-icons">content_copy</span>Easy code copying</b><b><span className="material-icons">event_available</span>Clear expiry dates</b></div></div><div className="cp-hero-ticket"><small>Featured savings</small><strong>Save more</strong><span>Shop local</span></div></section>
    <section className="cp-content">
      <div className="cp-discovery">
        <form onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("search") || "").trim(); updateParams({ search: value, page: 1 }); }}><span className="material-icons">search</span><input name="search" defaultValue={search} placeholder="Search deals, businesses, or coupon codes" /><button>Find deals</button></form>
        <div className="cp-categories">{categories.map((name) => <button key={name || "all"} className={category === name ? "active" : ""} onClick={() => updateParams({ category: name, page: 1 })}>{name || "All deals"}</button>)}</div>
      </div>
      <div className="cp-results-head"><div><span>Available offers</span><h2>{category || "All coupons & deals"}</h2></div><b>{total} {total === 1 ? "deal" : "deals"}</b></div>
      {loading && <div className="cp-loading"><i /><i /><i /></div>}
      {!loading && !items.length && <div className="cp-state"><span className="material-icons">local_offer</span><h2>No active coupons found</h2><p>Try another search or category.</p></div>}
      {!loading && <div className="cp-grid">{items.map((coupon) => <article key={coupon.id}>
        <div className="cp-card-top">{coupon.imageUrl ? <img src={resolveUrl(coupon.imageUrl)} alt="" /> : <div className="cp-brand-mark"><span className="material-icons">local_offer</span></div>}<div><span>{coupon.category}</span><h3>{coupon.businessName || "ChaoDesi"}</h3></div><b>{coupon.discountText}</b></div>
        <div className="cp-card-body"><h2>{coupon.title}</h2><p>{coupon.description}</p><div className="cp-expiry"><span className="material-icons">schedule</span><div><small>Offer expires</small><strong>{new Date(coupon.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></div><em>{daysRemaining(coupon.endDate)}</em></div></div>
        <div className="cp-code"><div><small>Coupon code</small><b>{coupon.code}</b></div><button onClick={() => copy(coupon.code)}><span className="material-icons">{copied === coupon.code ? "check" : "content_copy"}</span>{copied === coupon.code ? "Copied" : "Copy"}</button></div>
        {coupon.terms && <details><summary>View terms & conditions <span className="material-icons">expand_more</span></summary><p>{coupon.terms}</p></details>}
      </article>)}</div>}
      {totalPages > 1 && <nav className="cp-pages"><button disabled={page === 1} onClick={() => updateParams({ page: page - 1 })}>← Previous</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} className={number === page ? "active" : ""} onClick={() => updateParams({ page: number })}>{number}</button>)}<button disabled={page === totalPages} onClick={() => updateParams({ page: page + 1 })}>Next →</button></nav>}
    </section>
  </main><HomeFooterSection /></>;
}

function daysRemaining(value: string) { const days = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)); return days === 0 ? "Ends today" : `${days} days left`; }
function resolveUrl(value: string) { if (!value.startsWith("/uploads/")) return value; const api = import.meta.env.VITE_API_BASE_URL || "https://api.chaodesi.com/api"; return `${api.replace(/\/api\/?$/i, "")}${value}`; }
