import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { communityApi, enterCommunity } from "../api/communityApi";
import { startRazorpayPayment } from "../../../shared/payments/razorpayCheckout";
import toast from "react-hot-toast";

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

function orderRoleLabel(order: Data, currentUserId?: number) {
  const status = visibleOrderStatus(order);
  const buyerId = Number(order.buyerUserId);
  const recipientId = Number(order.recipientUserId);
  const settlementRecipientId = Number(order.settlementRecipientUserId || 0);
  const isBuyer = buyerId === currentUserId;
  const isRecipient = recipientId === currentUserId;
  const paymentStatus = String(order.paymentStatus || "");
  const creatorPaymentFlow = paymentStatus === "PENDING_CREATOR_PAYMENT" || paymentStatus === "COMPLETED";
  if (creatorPaymentFlow && status === "RESERVED" && (isBuyer || isRecipient)) {
    return isRecipient
      ? `Reserved by ${String(order.buyer || "a community member")} · Waiting for your payment`
      : "You reserved this gift · Waiting for the registry creator to pay";
  }
  if (creatorPaymentFlow && status !== "RESERVED" && isRecipient && settlementRecipientId === currentUserId) return "You paid · You can fulfil this gift";
  if (paymentStatus === "COMPLETED" && settlementRecipientId === currentUserId) return "Creator paid · You can fulfil this gift";
  if (paymentStatus === "COMPLETED" && isRecipient) return "Creator paid · Waiting for fulfilment";

  if (isBuyer && isRecipient) {
    return status === "RESERVED"
      ? "Payment required · You reserved this gift"
      : "You paid · You are sending this gift";
  }
  if (isBuyer) {
    return status === "RESERVED"
      ? "Payment required · You reserved this gift"
      : `You paid · You are fulfilling this gift for ${String(order.recipient || "the registry owner")}`;
  }
  if (isRecipient) {
    return status === "RESERVED"
      ? `Reserved by ${String(order.buyer || "a community member")} · Waiting for payment`
      : `Gift paid by ${String(order.buyer || "a community member")} · They are fulfilling it`;
  }
  return "Gift order";
}

function parseServerUtc(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return new Date(normalized);
}

function giftEarningsByCurrency(orders: Data[], include: (order: Data) => boolean) {
  const totals: Record<string, number> = {};
  orders.filter(include).forEach((order) => {
    const currency = String(order.currency || "INR");
    const payout = Number(order.storePayoutAmount || 0) + Number(order.deliveryPartnerPayoutAmount || 0);
    totals[currency] = (totals[currency] || 0) + payout;
  });
  return Object.entries(totals).map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`).join(" · ") || "INR 0.00";
}

function maskLinkedAccount(value: unknown) {
  const account = String(value || "");
  return account.length > 8 ? `${account.slice(0, 5)}•••${account.slice(-3)}` : account;
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
  const [creatorSummaries, setCreatorSummaries] = useState<Data[]>([]);
  const [priceRequests, setPriceRequests] = useState<Data[]>([]);
  const [orders, setOrders] = useState<Data[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [payoutAccount, setPayoutAccount] = useState<Data>();
  const [payoutAccountInput, setPayoutAccountInput] = useState("");
  const [editingPayoutAccount, setEditingPayoutAccount] = useState(false);
  const [orderAction, setOrderAction] = useState<{
    order: Data;
    type: "purchase" | "price" | "ship" | "delivered" | "received" | "cancel" | "dispute";
  }>();

  const load = () =>
    Promise.all([
      communityApi.discoverGiftRegistries(),
      communityApi.giftOrders(),
      communityApi.getPayoutAccount(),
      communityApi.giftRegistries(),
    ])
      .then(async ([registryData, orderData, payoutData, ownedData]) => {
        setRegistries(registryData);
        setOrders(orderData);
        setPayoutAccount(payoutData);
        const ownedItems = Array.isArray(ownedData.items) ? ownedData.items : [];
        const summaries = await Promise.all(
          ownedItems.map(async (item) => {
            try {
              return await communityApi.giftRegistryPaymentSummary(Number(item.id));
            } catch {
              return undefined;
            }
          }),
        );
        setCreatorSummaries(summaries.filter(Boolean) as Data[]);
        const requests = await Promise.all(
          ownedItems.map(async (item) => {
            try {
              return await communityApi.giftPriceChangeRequests(Number(item.id));
            } catch {
              return [];
            }
          }),
        );
        setPriceRequests(requests.flat());
      })
      .catch(() => setMessage("Unable to load gift fulfilment."));

  useEffect(() => {
    void load();
    void enterCommunity().then((user) => setCurrentUserId(user.id));
    const refresh = () => void load();
    window.addEventListener("gift-orders-changed", refresh);
    return () => window.removeEventListener("gift-orders-changed", refresh);
  }, []);

  const sellerOrders = currentUserId === undefined
    ? []
    : orders.filter((order) => Number(order.settlementRecipientUserId || order.buyerUserId) === currentUserId);
  const paidEarnings = giftEarningsByCurrency(
    sellerOrders,
    (order) => String(order.payoutStatus || "").toUpperCase() === "COMPLETED" && String(order.settlementStatus || "").toUpperCase() === "COMPLETED",
  );
  const pendingEarnings = giftEarningsByCurrency(
    sellerOrders,
    (order) => String(order.payoutStatus || "").toUpperCase() !== "COMPLETED" && ["PURCHASED", "SHIPPED", "DELIVERED", "RECEIVED"].includes(visibleOrderStatus(order)),
  );

  async function submitOrderAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderAction) return;
    const form = new FormData(event.currentTarget),
      id = Number(orderAction.order.id);
    setSubmitting(true);
    setMessage("");
    try {
      if (orderAction.type === "purchase") {
        const verified = await startRazorpayPayment({ amount: Number(orderAction.order.amount || 0), currency: displayCurrency(orderAction.order), description: `Gift order #${id}` });
        await communityApi.purchaseGiftOrder(
          id,
          verified.paymentToken,
        );
      } else if (orderAction.type === "price") {
        await communityApi.requestGiftPriceChange(
          id,
          Number(form.get("extraAmount")),
          String(form.get("reason")),
        );
        toast.success("Price request sent to the registry creator.");
      } else if (orderAction.type === "ship")
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

  async function savePayoutAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payoutAccountInput.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      const result = await communityApi.setPayoutAccount(payoutAccountInput.trim());
      setPayoutAccount(result);
      setPayoutAccountInput("");
      setEditingPayoutAccount(false);
      toast.success("Payout account submitted. An administrator must verify it before transfer.");
    } catch {
      toast.error("Enter a valid Razorpay Route linked-account ID starting with acc_.");
    } finally {
      setSubmitting(false);
    }
  }

  async function payForRegistry(summary: Data) {
    const registryId = Number(summary.registryId);
    const amount = Number(summary.total || 0);
    if (!registryId || amount <= 0) return;
    setSubmitting(true);
    try {
      const isLocalCheckout = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const paymentToken = isLocalCheckout
        ? "pm_dummy_success"
        : (await startRazorpayPayment({
            amount,
            currency: String(summary.currency || "INR"),
            description: `Gift registry #${registryId} final payment`,
          })).paymentToken;
      await communityApi.payGiftRegistry(registryId, paymentToken);
      toast.success(isLocalCheckout
        ? "Development payment completed. The fulfilment team can now ship the gift."
        : "Final gift payment completed. The fulfilment team can now ship the gift.");
      await load();
    } catch {
      toast.error("Final payment was not completed. No seller settlement was released.");
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
            Reserve a gift, pay for it, and deliver it to the registry owner.
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
      {sellerOrders.length ? (
        <section id="gift-payout" className="gift-payout-dashboard">
          <div className="gift-payout-heading">
            <div>
              <small>SELLER PAYMENTS</small>
              <h3>Gift payout setup &amp; earnings</h3>
              <p>Your fulfilment earnings are paid only after delivery and administrator approval.</p>
            </div>
            <span className={`gift-payout-status ${String(payoutAccount?.status || "NOT_CONFIGURED").toLowerCase()}`}>
              {String(payoutAccount?.status || "NOT_CONFIGURED").replaceAll("_", " ")}
            </span>
          </div>
          <div className="gift-payout-earnings">
            <div><span>Paid earnings</span><strong>{paidEarnings}</strong></div>
            <div><span>Pending earnings</span><strong>{pendingEarnings}</strong></div>
            <div><span>Orders you fulfil</span><strong>{sellerOrders.length}</strong></div>
          </div>
          {payoutAccount?.status !== "VERIFIED" || editingPayoutAccount ? (
            <form className="gift-payout-account" onSubmit={savePayoutAccount}>
              <div>
                <strong>Set up your payout account</strong>
                <p>Complete Razorpay Route onboarding first, including your bank/UPI details. Then enter only the linked-account ID below. An administrator must verify it before transfer.</p>
                <a href="https://razorpay.com/route/" target="_blank" rel="noreferrer">Open Razorpay Route onboarding</a>
              </div>
              <input value={payoutAccountInput} onChange={(event) => setPayoutAccountInput(event.target.value)} placeholder="acc_... linked account ID" aria-label="Razorpay linked account ID" />
              <span className="gift-payout-form-actions">
                <button disabled={submitting}>Submit for verification</button>
                {payoutAccount?.status === "VERIFIED" ? <button type="button" className="gift-payout-cancel" onClick={() => setEditingPayoutAccount(false)}>Cancel</button> : null}
              </span>
            </form>
          ) : (
            <div className="gift-payout-verified">
              <span>Payout account verified ({maskLinkedAccount(payoutAccount?.linkedAccountId)}). Eligible earnings will be transferred after settlement approval.</span>
              <button type="button" onClick={() => { setPayoutAccountInput(String(payoutAccount?.linkedAccountId || "")); setEditingPayoutAccount(true); }}>Change account</button>
            </div>
          )}
        </section>
      ) : null}

      {creatorSummaries.some((summary) => Number(summary.total || 0) > 0 && String(summary.finalPaymentStatus) !== "PAID") ? (
        <div className="gift-creator-payment-panel">
          <strong>Review and pay for your gift registry</strong>
          <p>Reserved gifts are collected here. You, the registry creator, pay the final total; the reserver is not charged.</p>
          {creatorSummaries.filter((summary) => Number(summary.total || 0) > 0 && String(summary.finalPaymentStatus) !== "PAID").map((summary) => (
            <div className="gift-creator-payment-row" key={String(summary.registryId)}>
              <span>Registry #{String(summary.registryId)} · {String(summary.currency || "INR")} {Number(summary.total).toFixed(2)}</span>
              <button disabled={submitting} onClick={() => void payForRegistry(summary)}>Review &amp; pay securely</button>
            </div>
          ))}
        </div>
      ) : null}

      {priceRequests.some((request) => String(request.status) === "PENDING") ? (
        <div className="gift-creator-payment-panel">
          <strong>Additional amount requests</strong>
          <p>Review any extra amount requested by a fulfiller before making the final registry payment.</p>
          {priceRequests.filter((request) => String(request.status) === "PENDING").map((request) => (
            <div className="gift-creator-payment-row" key={String(request.id)}>
              <span>
                Order #{String(request.giftOrderId)} · Extra {String(request.currency || "INR")} {Number(request.extraAmount || 0).toFixed(2)} · {String(request.reason)}
              </span>
              <span>
                <button disabled={submitting} onClick={async () => { try { await communityApi.approveGiftPriceChange(Number(request.id)); await load(); toast.success("Additional amount approved."); } catch { toast.error("Unable to approve this request."); } }}>Approve</button>
                <button disabled={submitting} onClick={async () => { try { await communityApi.rejectGiftPriceChange(Number(request.id)); await load(); toast.success("Additional amount rejected."); } catch { toast.error("Unable to reject this request."); } }}>Reject</button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

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
                  {orderRoleLabel(o, currentUserId)}
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
                {((Number(o.buyerUserId) === currentUserId &&
                  visibleOrderStatus(o) === "RESERVED" &&
                  String(o.paymentStatus || "") !== "PENDING_CREATOR_PAYMENT") ||
                  (Number(o.settlementRecipientUserId || o.buyerUserId) === currentUserId &&
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
                {Number(o.buyerUserId) === currentUserId &&
                visibleOrderStatus(o) === "RESERVED" &&
                String(o.paymentStatus || "") === "PENDING_CREATOR_PAYMENT" ? (
                  <button
                    className="gift-secondary"
                    onClick={() => setOrderAction({ order: o, type: "price" })}
                  >
                    Request price change
                  </button>
                ) : null}
                {Number(o.buyerUserId) === currentUserId &&
                ["DELIVERED", "RECEIVED"].includes(visibleOrderStatus(o)) &&
                o.payoutStatus !== "COMPLETED" && !o.settlementRecipientUserId ? (
                  <button
                    className="gift-secondary"
                    onClick={async () => {
                      try {
                        await communityApi.retryGiftPayout(Number(o.id));
                        await load();
                        toast.success("Gift payout completed successfully.");
                      } catch {
                        toast.error("Payout is not complete yet. Verify your linked account and retry.");
                      }
                    }}
                  >
                    Retry payout
                  </button>
                ) : null}
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
                        : orderAction.type === "price"
                          ? "Request additional amount"
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
                      Razorpay
                    </strong>
                    <span>SECURE CHECKOUT</span>
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
                  <p className="gift-checkout-provider-note">
                    Razorpay secure checkout will open next. Enter your payment
                    details only in the Razorpay window.
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
              {orderAction.type === "price" ? (
                <>
                  <label>
                    Additional amount
                    <input name="extraAmount" type="number" min="0.01" step="0.01" required autoFocus />
                  </label>
                  <label>
                    Reason
                    <textarea name="reason" required />
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
                    : orderAction.type === "price"
                      ? "Send request"
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
