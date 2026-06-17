import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerHeader from "../home/ui/CustomerHeader";
import HomeFooterSection from "../home/ui/HomeFooterSection";
import { getPublicListings, type ListingSummary } from "../dashboard/api/listingsApi";
import { getChaoTvHref, getChaoTvThumbnail, isExternalVideoUrl } from "./chaoTvUtils";
import "../home/styles/home.css";

const PAGE_SIZE = 12;

export default function ChaoTvPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const section = searchParams.get("section") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    getPublicListings({
      category: "chao-tv",
      subCategory: section || undefined,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (isActive) {
          setItems(result.items || []);
          setTotalCount(result.totalCount || 0);
        }
      })
      .catch(() => {
        if (isActive) {
          setItems([]);
          setTotalCount(0);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [page, search, section]);

  function updateQuery(updates: Record<string, string | number | null>) {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  }

  return (
    <>
      <CustomerHeader />
      <main className="chao-tv-page">
        <section className="chao-tv-page-head">
          <div className="container">
            <div className="home-chao-tv-head">
              <div className="home-chao-tv-icon">
                <img src="/template-17/images/icon/calendar.png" alt="" />
              </div>
              <div>
                <h1>Chao TV</h1>
                <p>Discover popular news and events</p>
              </div>
            </div>

            <div className="chao-tv-filters">
              <input
                type="search"
                value={search}
                placeholder="Search Chao TV"
                onChange={(event) => updateQuery({ search: event.target.value, page: 1 })}
              />
              <select value={section} onChange={(event) => updateQuery({ section: event.target.value, page: 1 })}>
                <option value="">All sections</option>
                <option value="Popular">Popular</option>
                <option value="News">News</option>
                <option value="Events">Events</option>
                <option value="Business">Business</option>
                <option value="Community">Community</option>
              </select>
            </div>
          </div>
        </section>

        <section className="chao-tv-page-body">
          <div className="container">
            {isLoading ? <div className="home-chao-tv-empty">Loading Chao TV...</div> : null}
            {!isLoading && !items.length ? <div className="home-chao-tv-empty">No Chao TV videos found.</div> : null}
            <div className="chao-tv-grid">
              {items.map((item) => (
                <ChaoTvPageCard item={item} key={item.id} />
              ))}
            </div>

            <div className="chao-tv-pagination">
              <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: page - 1 })}>Previous</button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: page + 1 })}>Next</button>
            </div>
          </div>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function ChaoTvPageCard({ item }: { item: ListingSummary }) {
  const href = getChaoTvHref(item);
  const content = (
    <>
      <div className="chao-tv-page-card-media">
        <img src={getChaoTvThumbnail(item)} alt={item.title} loading="lazy" />
        <span><i className="material-icons">play_arrow</i></span>
      </div>
      <div className="chao-tv-page-card-body">
        <small>{item.subCategory || "Popular"}</small>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
    </>
  );

  return isExternalVideoUrl(href) ? (
    <a className="chao-tv-page-card" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className="chao-tv-page-card" to={href}>
      {content}
    </Link>
  );
}
