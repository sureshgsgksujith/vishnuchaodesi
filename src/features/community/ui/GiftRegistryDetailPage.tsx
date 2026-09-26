import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { communityApi } from "../api/communityApi";
import "./communityPortal.css";

type Data = Record<string, unknown>;

export default function GiftRegistryDetailPage() {
  const { registryId } = useParams();
  const navigate = useNavigate();
  const [registry, setRegistry] = useState<Data>();
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<number>();
  const [confirmItem, setConfirmItem] = useState<Data>();
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    title: string;
    message: string;
  }>();

  const load = async () => {
    try {
      setRegistry(await communityApi.giftRegistry(Number(registryId)));
    } catch {
      setFeedback({
        kind: "error",
        title: "Registry unavailable",
        message: "This registry is private, archived, or no longer available.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [registryId]);

  async function reserve(item: Data) {
    const itemId = Number(item.id);
    setReserving(itemId);
    try {
      const result = (await communityApi.reserveGiftItem(itemId)) as Data;
      setConfirmItem(undefined);
      await load();
      setFeedback({
        kind: "success",
        title: "Gift reserved",
        message: `Reserved for 30 minutes. Delivery address: ${String(result.shippingAddress || "Not provided")}`,
      });
    } catch {
      await load();
      setFeedback({
        kind: "error",
        title: "Gift unavailable",
        message:
          "Another customer may have reserved this gift. The latest availability has been loaded.",
      });
    } finally {
      setReserving(undefined);
    }
  }

  return (
    <>
      <UserHomeHeader hideAddAction />
      <main className="gift-registry-detail-page">
        <div className="gift-detail-breadcrumb">
          <Link to="/community/gifts">Gifts</Link>
          <span>›</span>
          <span>{String(registry?.title || "Registry")}</span>
        </div>
        {loading ? (
          <div className="gift-detail-state">Loading gift ideas…</div>
        ) : registry ? (
          <>
            <header className="gift-detail-hero">
              <button
                type="button"
                onClick={() => navigate("/community/gifts")}
              >
                <span className="material-icons">arrow_back</span>Back to gifts
              </button>
              <div>
                <small>PUBLIC GIFT REGISTRY</small>
                <h1>{String(registry.title || "Gift ideas")}</h1>
                <p>
                  {String(
                    registry.description ||
                      "Choose a thoughtful gift for this celebration.",
                  )}
                </p>
              </div>
              <span className="material-icons">redeem</span>
            </header>
            <div
              className="gift-detail-steps"
              aria-label="How gift reservations work"
            >
              <div>
                <span>1</span>
                <p>
                  <strong>Choose a gift</strong>
                  <small>Review the item and merchant</small>
                </p>
              </div>
              <i className="material-icons">arrow_forward</i>
              <div>
                <span>2</span>
                <p>
                  <strong>Reserve securely</strong>
                  <small>It is held for 30 minutes</small>
                </p>
              </div>
              <i className="material-icons">arrow_forward</i>
              <div>
                <span>3</span>
                <p>
                  <strong>Buy and deliver</strong>
                  <small>Purchase from the listed store</small>
                </p>
              </div>
            </div>
            <div className="gift-detail-heading">
              <div>
                <h2>Gift ideas</h2>
                <p>Select an available item to reserve it for 30 minutes.</p>
              </div>
              <strong>{((registry.items as Data[]) || []).length} items</strong>
            </div>
            <div className="gift-detail-grid">
              {((registry.items as Data[]) || []).map((item) => (
                <article key={String(item.id)}>
                  <div className="gift-detail-image">
                    <GiftImage item={item} />
                  </div>
                  <div className="gift-detail-body">
                    <span
                      className={
                        Number(item.availableQuantity) > 0
                          ? "available"
                          : "unavailable"
                      }
                    >
                      {Number(item.availableQuantity) > 0
                        ? `${String(item.availableQuantity)} available`
                        : "Unavailable"}
                    </span>
                    <h3>{String(item.name || "Gift")}</h3>
                    <p>
                      {String(
                        item.description ||
                          "A thoughtful gift for this celebration.",
                      )}
                    </p>
                    {item.desiredAmount ? (
                      <strong>
                        {String(item.currency || "USD")}{" "}
                        {Number(item.desiredAmount).toFixed(2)}
                      </strong>
                    ) : null}
                    {item.externalUrl ? (
                      <a
                        href={String(item.externalUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View at merchant ↗
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={
                        Number(item.availableQuantity) < 1 ||
                        reserving === Number(item.id)
                      }
                      onClick={() => setConfirmItem(item)}
                    >
                      {reserving === Number(item.id)
                        ? "Reserving…"
                        : Number(item.availableQuantity) > 0
                          ? "Reserve this gift"
                          : "Already reserved"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="gift-detail-state">
            <h2>Registry not found</h2>
            <Link to="/community/gifts">Return to gifts</Link>
          </div>
        )}
      </main>
      <HomeFooterSection />
      {confirmItem ? (
        <div
          className="gift-action-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !reserving)
              setConfirmItem(undefined);
          }}
        >
          <div className="gift-reserve-confirm">
            <div className="gift-reserve-confirm-icon">
              <span className="material-icons">card_giftcard</span>
            </div>
            <small>CONFIRM RESERVATION</small>
            <h2>{String(confirmItem.name || "Gift")}</h2>
            <p>
              This gift will be held for you for <strong>30 minutes</strong>.
              Complete the purchase at the merchant before the reservation
              expires.
            </p>
            {confirmItem.desiredAmount ? (
              <div className="gift-confirm-price">
                <span>Estimated price</span>
                <strong>
                  {String(confirmItem.currency || "USD")}{" "}
                  {Number(confirmItem.desiredAmount).toFixed(2)}
                </strong>
              </div>
            ) : null}
            <div className="gift-reserve-confirm-actions">
              <button
                type="button"
                className="secondary"
                disabled={Boolean(reserving)}
                onClick={() => setConfirmItem(undefined)}
              >
                Not now
              </button>
              <button
                type="button"
                disabled={Boolean(reserving)}
                onClick={() => void reserve(confirmItem)}
              >
                {reserving ? "Reserving…" : "Confirm reservation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {feedback ? (
        <div className="gift-action-modal" role="alertdialog" aria-modal="true">
          <div className={`gift-detail-feedback ${feedback.kind}`}>
            <span className="material-icons">
              {feedback.kind === "success" ? "check_circle" : "error"}
            </span>
            <h2>{feedback.title}</h2>
            <p>{feedback.message}</p>
            <div>
              <button
                type="button"
                className="secondary"
                onClick={() => setFeedback(undefined)}
              >
                Stay here
              </button>
              {feedback.kind === "success" ? (
                <button
                  type="button"
                  onClick={() => navigate("/community/gifts")}
                >
                  View my order
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function GiftImage({ item }: { item: Data }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <div className="gift-image-fallback">
        <span className="material-icons">redeem</span>
        <small>Gift image</small>
      </div>
    );
  }
  return (
    <img
      src={giftImageUrl(String(item.imageUrl))}
      alt={String(item.name || "Gift")}
      onError={() => setFailed(true)}
    />
  );
}

function giftImageUrl(value: string) {
  if (!value.startsWith("/uploads/")) return value;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5145/api";
  return `${apiBase.replace(/\/api\/?$/i, "")}${value}`;
}
