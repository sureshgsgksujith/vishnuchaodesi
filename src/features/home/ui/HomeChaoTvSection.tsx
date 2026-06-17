import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicListings, type ListingSummary } from "../../dashboard/api/listingsApi";
import { getChaoTvHref, getChaoTvThumbnail, isExternalVideoUrl } from "../../chaoTv/chaoTvUtils";

export default function HomeChaoTvSection() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const orderedItems = useMemo(
    () =>
      [...items].sort(
        (first, second) =>
          new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
      ),
    [items]
  );

  useEffect(() => {
    let isActive = true;

    getPublicListings({ category: "chao-tv", page: 1, pageSize: 12 })
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
  }, []);

  useEffect(() => {
    if (orderedItems.length <= 3) {
      return;
    }

    const timer = window.setInterval(() => {
      const track = scrollRef.current;
      if (!track) {
        return;
      }

      const nextLeft = track.scrollLeft + Math.max(320, track.clientWidth / 3);
      const isAtEnd = nextLeft + track.clientWidth >= track.scrollWidth - 8;

      if (isAtEnd) {
        track.scrollTo({ left: 0, behavior: "auto" });
        return;
      }

      track.scrollTo({ left: nextLeft, behavior: "smooth" });
    }, 3500);

    return () => window.clearInterval(timer);
  }, [orderedItems.length]);

  function scroll(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  }

  return (
    <section className="home-chao-tv">
      <div className="container">
        <div className="home-chao-tv-head">
          <div className="home-chao-tv-icon">
            <img src="/template-17/images/icon/calendar.png" alt="" />
          </div>
          <div>
            <h2>Chao TV</h2>
            <p>Discover popular news and events</p>
          </div>
          {totalCount > 3 ? <Link to="/chao-tv">Show more</Link> : null}
        </div>

        <div className="home-chao-tv-shell">
          <button type="button" className="home-chao-tv-arrow is-left" onClick={() => scroll("left")} aria-label="Previous videos">
            <i className="material-icons">chevron_left</i>
          </button>
          <div className="home-chao-tv-track" ref={scrollRef}>
            {isLoading ? <div className="home-chao-tv-empty">Loading Chao TV...</div> : null}
            {!isLoading && !items.length ? (
              <div className="home-chao-tv-empty">No Chao TV videos published yet.</div>
            ) : null}
            {orderedItems.map((item) => (
              <ChaoTvCard item={item} key={item.id} />
            ))}
          </div>
          <button type="button" className="home-chao-tv-arrow is-right" onClick={() => scroll("right")} aria-label="Next videos">
            <i className="material-icons">chevron_right</i>
          </button>
        </div>
      </div>
    </section>
  );
}

function ChaoTvCard({ item }: { item: ListingSummary }) {
  const href = getChaoTvHref(item);
  const content = (
    <>
      <img src={getChaoTvThumbnail(item)} alt={item.title} loading="lazy" />
      <span className="home-chao-tv-shade" />
      <span className="home-chao-tv-play"><i className="material-icons">play_arrow</i></span>
      <strong>{item.title}</strong>
    </>
  );

  return isExternalVideoUrl(href) ? (
    <a className="home-chao-tv-card" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className="home-chao-tv-card" to={href}>
      {content}
    </Link>
  );
}
