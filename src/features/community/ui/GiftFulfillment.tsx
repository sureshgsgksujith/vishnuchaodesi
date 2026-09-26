import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { communityApi, enterCommunity } from "../api/communityApi";

type Data = Record<string, unknown>;

const nextLabel: Record<string, string> = {
  RESERVED: "Confirm purchase",
  PURCHASED: "Add shipping",
  SHIPPED: "Mark delivered",
  DELIVERED: "Confirm received",
};

function visibleOrderStatus(order: Data) {
  if (
    String(order.status) === "CANCELLED" &&
    String(order.cancellationReason || "").toLowerCase().includes("expired")
  ) {
    return "EXPIRED";
  }
  if (
    String(order.status) === "RESERVED" &&
    order.reservedUntilUtc &&
    parseServerUtc(String(order.reservedUntilUtc)).getTime() <= Date.now()
  ) {
    return "EXPIRED";
  }
  return String(order.status);
}

function parseServerUtc(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return new Date(normalized);
}

async function openReceipt(id: number, setMessage: (value: string) => void) {
  try {
    const r = await communityApi.giftOrderReceipt(id);
    const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
    const money = (value: unknown) => `${escape(r.currency)} ${Number(value || 0).toFixed(2)}`;
    const popup = window.open("", "_blank", "width=760,height=850");
    if (!popup) { setMessage("Allow pop-ups to view the receipt."); return; }
    const settlement = r.showSettlement ? `<div class="note"><b>Fulfiller settlement</b><div class="row"><span>Admin commission (${escape(r.platformCommissionRate)}%)</span><b>-${money(r.platformCommissionAmount)}</b></div><div class="row"><span>Net payable after delivery</span><b>${money(r.fulfillerPayoutAmount)}</b></div><div class="row"><span>Settlement status</span><b>${escape(r.payoutStatus)}</b></div></div>` : "";
    popup.document.write(`<!doctype html><title>${escape(r.receiptNumber)}</title><style>body{font:16px Arial;color:#102758;max-width:680px;margin:40px auto;padding:24px}h1{color:#3159d9}.row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid #dde5f4}.total{font-size:22px;font-weight:800}.note{background:#eef3ff;padding:14px;border-radius:10px;margin-top:20px}.note>b{display:block;margin-bottom:6px;color:#2147bd}button{margin-top:24px;padding:12px 20px;background:#3159d9;color:#fff;border:0;border-radius:8px}</style><h1>${r.showSettlement ? "Gift fulfilment receipt" : "Gift payment receipt"}</h1><p>${escape(r.receiptNumber)}</p><div class="row"><span>Gift</span><b>${escape(r.itemName)}</b></div><div class="row"><span>Paid by</span><b>${escape(r.payer)}</b></div><div class="row"><span>Fulfilled by</span><b>${escape(r.fulfiller)}</b></div><div class="row"><span>Deliver to</span><b>${escape(r.recipient)}</b></div><div class="row"><span>Item subtotal</span><b>${money(r.itemSubtotal)}</b></div><div class="row"><span>Delivery fee</span><b>${money(r.deliveryFee)}</b></div><div class="row total"><span>Total paid</span><b>${money(r.total)}</b></div><div class="row"><span>Payment reference</span><b>${escape(r.paymentReference || "Pending")}</b></div><div class="row"><span>Order status</span><b>${escape(r.status)}</b></div>${settlement}<button onclick="window.print()">Print / save PDF</button>`);
    popup.document.close();
  } catch { setMessage("Unable to load this receipt."); }
}

export default function GiftFulfillment() {
  const navigate = useNavigate();
  const [registries, setRegistries] = useState<Data[]>([]);
  const [orders, setOrders] = useState<Data[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [orderAction, setOrderAction] = useState<{
    order: Data;
    type: "purchase" | "ship" | "delivered" | "received" | "cancel" | "dispute";
  }>();

  const load = () =>
    Promise.all([
      communityApi.discoverGiftRegistries(),
      communityApi.giftOrders(),
    ])
      .then(([registryData, orderData]) => {
        setRegistries(registryData);
        setOrders(orderData);
      })
      .catch(() => setMessage("Unable to load gift fulfilment."));

  useEffect(() => {
    void load();
    void enterCommunity().then((user) => setCurrentUserId(user.id));
    const refresh = () => void load();
    window.addEventListener("gift-orders-changed", refresh);
    return () => window.removeEventListener("gift-orders-changed", refresh);
  }, []);

  async function submitOrderAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderAction) return;
    const form = new FormData(event.currentTarget),
      id = Number(orderAction.order.id);
    setSubmitting(true);
    setMessage("");
    try {
      if (orderAction.type === "purchase")
        await communityApi.purchaseGiftOrder(
          id,
          form.get("simulateDecline")
            ? "pm_dummy_declined"
            : "pm_dummy_success",
        );
      else if (orderAction.type === "ship")
        await communityApi.shipGiftOrder(
          id,
          String(form.get("carrier")),
          String(form.get("trackingNumber")),
          String(form.get("trackingUrl") || "") || undefined,
        );
      else if (
        orderAction.type === "delivered" ||
        orderAction.type === "received"
      )
        await communityApi.giftOrderAction(id, orderAction.type);
      else
        await communityApi.giftOrderReason(
          id,
          orderAction.type,
          String(form.get("reason")),
        );
      setOrderAction(undefined);
      await load();
    } catch {
      setMessage(
        orderAction.type === "purchase"
          ? "Payment was declined. Your gift is still reserved; please try again."
          : "Unable to update gift order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="gift-fulfillment">
      <header className="gift-fulfillment-hero">
        <div className="gift-hero-icon">
          <span className="material-icons">local_shipping</span>
        </div>
        <div>
          <small>SHOP &amp; TRACK</small>
          <h2>Gift fulfilment</h2>
          <p>
            Choose a thoughtful gift and follow its journey from reservation to
            delivery.
          </p>
        </div>
        <div className="gift-flow">
          <span>Reserve</span>
          <i>→</i>
          <span>Purchase</span>
          <i>→</i>
          <span>Deliver</span>
        </div>
      </header>
      {message && <p className="community-error">{message}</p>}

      <div className="gift-section-heading">
        <div>
          <h3>Public registries</h3>
          <p>Gift ideas shared by your community</p>
        </div>
        <span className="gift-count">{registries.length} registries</span>
      </div>
      {registries.length ? (
        <div className="gift-registry-grid gift-market-grid">
          {registries.map((r) => (
            <article key={String(r.id)}>
              <div className="gift-market-art">
                <span className="material-icons">redeem</span>
                <small>PUBLIC</small>
              </div>
              <div className="gift-market-body">
                <h3>{String(r.title)}</h3>
                <p className="gift-owner">
                  <span className="material-icons">person</span>Created by{" "}
                  {String(r.owner || "Community member")}
                </p>
                <div className="gift-market-meta">
                  <span className="material-icons">card_giftcard</span>
                  <strong>{String(r.itemCount)}</strong> available ideas
                </div>
                <button
                  className="gift-open"
                  onClick={() => navigate(`/community/gifts/${String(r.id)}`)}
                >
                  View gift ideas <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="gift-empty">
          <span className="material-icons">featured_seasonal_and_gifts</span>
          <h4>No public gift ideas yet</h4>
          <p>
            Public registries will appear here when community members add them.
          </p>
        </div>
      )}

      <div className="gift-section-heading gift-orders-heading">
        <div>
          <h3>Purchases &amp; deliveries</h3>
          <p>Track gifts you are sending and gifts being sent to you</p>
        </div>
        <span className="gift-count">{orders.length} orders</span>
      </div>
      {orders.length ? (
        <div className="gift-order-list">
          {orders.map((o) => (
            <article key={String(o.id)}>
              <div className="gift-order-icon">
                {o.imageUrl ? (
                  <img
                    src={giftImageUrl(String(o.imageUrl))}
                    alt={String(o.itemName || "Gift")}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      event.currentTarget.nextElementSibling?.removeAttribute(
                        "hidden",
                      );
                    }}
                  />
                ) : null}
                <span className="material-icons" hidden={Boolean(o.imageUrl)}>
                  inventory_2
                </span>
              </div>
              <div className="gift-order-info">
                <span
                  className={`gift-status gift-status-${visibleOrderStatus(o).toLowerCase()}`}
                >
                  {visibleOrderStatus(o)}
                </span>
                <strong>{String(o.itemName)}</strong>
                <small className="gift-order-meta">
                  Order #{String(o.id)}
                  {Number(o.quantity) > 1
                    ? ` · ${String(o.quantity)} items`
                    : ""}
                  {o.amount
                    ? ` · ${displayCurrency(o)} ${Number(o.amount).toFixed(2)}`
                    : ""}
                </small>
                <small className="gift-order-role">
                  {Number(o.recipientUserId) === currentUserId
                    ? visibleOrderStatus(o) === "RESERVED"
                      ? `Payment required · Reserved by ${String(o.buyer || "a fulfiller")}`
                      : `You paid · Fulfilled by ${String(o.buyer || "a community member")}`
                    : visibleOrderStatus(o) === "RESERVED"
                      ? `You are fulfilling · Waiting for ${String(o.recipient || "the registry owner")} to pay`
                      : `You are fulfilling · Paid by ${String(o.recipient || "the registry owner")}`}
                </small>
                {o.shippingAddress && visibleOrderStatus(o) !== "EXPIRED" ? (
                  <small className="gift-delivery-address">
                    <span className="material-icons">location_on</span>
                    <span>
                      <b>Complete delivery address</b>
                      <span>{String(o.shippingAddress)}</span>
                    </span>
                  </small>
                ) : Number(o.buyerUserId) === currentUserId &&
                  ["RESERVED", "PURCHASED", "SHIPPED", "DELIVERED"].includes(
                    visibleOrderStatus(o),
                  ) ? (
                  <small className="gift-delivery-address">
                    <span className="material-icons">location_off</span>
                    Delivery address was not provided for this registry.
                  </small>
                ) : null}
                {visibleOrderStatus(o) === "EXPIRED" ? (
                  <small className="gift-expired-note">Reservation expired. This gift is available to reserve again.</small>
                ) : o.trackingNumber ? (
                  <div className="gift-shipment-details">
                    <span className="material-icons">local_shipping</span>
                    <dl>
                      <div><dt>Courier name</dt><dd>{String(o.carrier || "Not provided")}</dd></div>
                      <div><dt>Tracking ID</dt><dd>{String(o.trackingNumber)}</dd></div>
                    </dl>
                    {o.trackingUrl ? <a href={String(o.trackingUrl)} target="_blank" rel="noreferrer">Track shipment <span className="material-icons">open_in_new</span></a> : null}
                  </div>
                ) : (
                  <small>Tracking will appear after the gift ships</small>
                )}
                {visibleOrderStatus(o) === "RESERVED" && o.reservedUntilUtc ? (
                  <ReservationCountdown
                    until={String(o.reservedUntilUtc)}
                    onExpire={() => void load()}
                  />
                ) : null}
              </div>
              <div className="gift-order-actions">
                {Number(o.buyerUserId) === currentUserId &&
                visibleOrderStatus(o) === "EXPIRED" ? (
                  <button
                    onClick={() =>
                      navigate(`/community/gifts/${String(o.registryId)}`)
                    }
                  >
                    <span className="material-icons">refresh</span>
                    Reserve again
                  </button>
                ) : null}
                {((Number(o.recipientUserId) === currentUserId &&
                  visibleOrderStatus(o) === "RESERVED") ||
                  (Number(o.buyerUserId) === currentUserId &&
                    ["PURCHASED", "SHIPPED"].includes(visibleOrderStatus(o))) ||
                  (Number(o.recipientUserId) === currentUserId &&
                    visibleOrderStatus(o) === "DELIVERED")) && (
                  <button
                    onClick={() =>
                      setOrderAction({
                        order: o,
                        type:
                          visibleOrderStatus(o) === "RESERVED"
                            ? "purchase"
                            : visibleOrderStatus(o) === "PURCHASED"
                              ? "ship"
                              : visibleOrderStatus(o) === "SHIPPED"
                                ? "delivered"
                                : "received",
                      })
                    }
                  >
                    {nextLabel[visibleOrderStatus(o)]}
                  </button>
                )}
                {[
                  "RESERVED",
                  "PURCHASED",
                  "SHIPPED",
                  "DELIVERED",
                  "RECEIVED",
                ].includes(visibleOrderStatus(o)) ? (
                  <button
                    className="gift-secondary gift-issue-action"
                    onClick={() =>
                      setOrderAction({
                        order: o,
                        type: ["SHIPPED", "DELIVERED", "RECEIVED"].includes(
                          visibleOrderStatus(o),
                        )
                          ? "dispute"
                          : "cancel",
                      })
                    }
                  >
                    <span className="material-icons">
                      {["SHIPPED", "DELIVERED", "RECEIVED"].includes(
                        visibleOrderStatus(o),
                      )
                        ? "report_problem"
                        : "close"}
                    </span>
                    {["SHIPPED", "DELIVERED", "RECEIVED"].includes(
                      visibleOrderStatus(o),
                    )
                      ? "Report issue"
                      : "Cancel"}
                  </button>
                ) : null}
                <button
                  className="gift-secondary gift-message-action"
                  onClick={async () => {
                    try {
                      const otherUserId =
                        Number(o.buyerUserId) === currentUserId
                          ? Number(o.recipientUserId)
                          : Number(o.buyerUserId);
                      await communityApi.startDirect(otherUserId);
                      navigate("/community/messages");
                    } catch {
                      setMessage(
                        "Unable to start this conversation. The customer may need to approve your message request.",
                      );
                    }
                  }}
                >
                  <span className="material-icons">chat</span>
                  {Number(o.buyerUserId) === currentUserId
                    ? "Message recipient"
                    : "Message sender"}
                </button>
                {!["RESERVED", "EXPIRED"].includes(visibleOrderStatus(o)) ? (
                  <button
                    className="gift-secondary gift-receipt-action"
                    onClick={() => void openReceipt(Number(o.id), setMessage)}
                  >
                    <span className="material-icons">receipt_long</span>
                    Receipt
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="gift-empty gift-empty-compact">
          <span className="material-icons">local_shipping</span>
          <div>
            <h4>No deliveries to track</h4>
            <p>Reserve a gift and its delivery progress will appear here.</p>
          </div>
        </div>
      )}
      {orderAction ? (
        <div
          className="gift-action-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOrderAction(undefined);
          }}
        >
          <div className="gift-action-card">
            <header>
              <div>
                <span className="material-icons">local_shipping</span>
                <div>
                  <small>GIFT ORDER</small>
                  <h2>
                    {nextLabel[String(orderAction.order.status)] ||
                      (orderAction.type === "dispute"
                        ? "Report issue"
                        : "Cancel gift")}
                  </h2>
                </div>
              </div>
              <button type="button" onClick={() => setOrderAction(undefined)}>
                ×
              </button>
            </header>
            <form onSubmit={submitOrderAction}>
              {orderAction.type === "purchase" ? (
                <div className="gift-checkout">
                  <div className="gift-checkout-brand">
                    <strong>
                      {isIndiaOrder(orderAction.order) ? "razorpay" : "stripe"}
                    </strong>
                    <span>DUMMY CHECKOUT</span>
                  </div>
                  <div className="gift-checkout-total">
                    <span>Total</span>
                    <strong>
                      {displayCurrency(orderAction.order)}{" "}
                      {Number(orderAction.order.amount || 0).toFixed(2)}
                    </strong>
                  </div>
                  <p className="gift-checkout-recipient">
                    <b>You are paying for this gift.</b> It will be delivered to{" "}
                    {Number(orderAction.order.recipientUserId) === currentUserId
                      ? "your friend's delivery address"
                      : String(orderAction.order.recipient || "the registry owner")}.
                  </p>
                  <label>
                    Cardholder name
                    <input defaultValue="Test Customer" required autoFocus />
                  </label>
                  <label>
                    Card number
                    <input
                      inputMode="numeric"
                      defaultValue="4242 4242 4242 4242"
                      required
                    />
                  </label>
                  <div className="gift-checkout-row">
                    <label>
                      Expiry
                      <input defaultValue="12/30" required />
                    </label>
                    <label>
                      CVC
                      <input defaultValue="123" required />
                    </label>
                  </div>
                  <label className="gift-checkout-decline">
                    <input name="simulateDecline" type="checkbox" />
                    Simulate a declined payment
                  </label>
                  <p>
                    Development simulation only. No card information is stored
                    or sent to {isIndiaOrder(orderAction.order) ? "Razorpay" : "Stripe"}.
                  </p>
                </div>
              ) : null}
              {orderAction.type === "ship" ? (
                <>
                  <label>
                    Carrier name
                    <input name="carrier" required autoFocus />
                  </label>
                  <label>
                    Tracking number
                    <input name="trackingNumber" required />
                  </label>
                  <label>
                    Tracking URL <small>Optional</small>
                    <input name="trackingUrl" type="url" />
                  </label>
                </>
              ) : null}
              {orderAction.type === "cancel" ||
              orderAction.type === "dispute" ? (
                <label>
                  {orderAction.type === "dispute"
                    ? "Issue details"
                    : "Cancellation reason"}
                  <textarea name="reason" required autoFocus />
                </label>
              ) : null}
              {orderAction.type === "delivered" ? (
                <p>Confirm that the carrier delivered this gift.</p>
              ) : null}
              {orderAction.type === "received" ? (
                <p>Confirm that you received this gift.</p>
              ) : null}
              <footer>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setOrderAction(undefined)}
                >
                  Cancel
                </button>
                <button disabled={submitting}>
                  {orderAction.type === "dispute"
                    ? "Submit issue"
                    : orderAction.type === "cancel"
                      ? "Cancel gift"
                      : orderAction.type === "purchase"
                        ? submitting
                          ? "Processing…"
                          : "Pay & confirm purchase"
                        : "Confirm"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function giftImageUrl(value: string) {
  if (!value.startsWith("/uploads/")) return value;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5145/api";
  return `${apiBase.replace(/\/api\/?$/i, "")}${value}`;
}

function isIndiaOrder(order: Data) {
  const country = String(order.deliveryCountry || "").trim().toUpperCase();
  const address = String(order.shippingAddress || "").trim().toUpperCase();
  return country === "IN" || country === "INDIA" || address.endsWith(", INDIA") || String(order.currency).toUpperCase() === "INR";
}

function displayCurrency(order: Data) {
  const country = String(order.deliveryCountry || "").trim().toUpperCase();
  const address = String(order.shippingAddress || "").trim().toUpperCase();
  if (country === "IN" || country === "INDIA" || address.endsWith(", INDIA")) return "INR";
  if (country === "CA" || country === "CANADA") return "CAD";
  return String(order.currency || "USD");
}

function ReservationCountdown({
  until,
  onExpire,
}: {
  until: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, parseServerUtc(until).getTime() - Date.now()),
  );
  useEffect(() => {
    let notified = false;
    const update = () => {
      const value = Math.max(0, parseServerUtc(until).getTime() - Date.now());
      setRemaining(value);
      if (value === 0 && !notified) {
        notified = true;
        onExpire();
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    <small
      className={`gift-reservation-timer ${remaining < 5 * 60 * 1000 ? "ending" : ""}`}
    >
      <span className="material-icons">timer</span>
      {remaining > 0
        ? `Reservation expires in ${minutes}:${String(seconds).padStart(2, "0")}`
        : "Reservation expired — updating availability…"}
    </small>
  );
}
