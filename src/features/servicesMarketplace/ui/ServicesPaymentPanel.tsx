import { useEffect, useRef, useState } from "react";
import { createServicesPayment, verifyServicesRazorpayPayment, type ServicesPayment } from "../api/servicesMarketplaceApi";

type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (result: RazorpaySuccess) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};
type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void };

declare global { interface Window { Razorpay?: RazorpayConstructor } }

let checkoutLoader: Promise<void> | undefined;
function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  checkoutLoader ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
  return checkoutLoader;
}

export default function ServicesPaymentPanel({ bookingId, amount, currency, autoStart = false, onSuccess }: { bookingId: string; amount: number; currency: string; autoStart?: boolean; onSuccess?: (payment: ServicesPayment) => void }) {
  const [payment, setPayment] = useState<ServicesPayment | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void pay();
  }, [autoStart]);

  async function pay() {
    setBusy(true); setMessage("");
    try {
      const initiated = await createServicesPayment(bookingId, crypto.randomUUID());
      setPayment(initiated);
      if (!initiated.requiresAction) { setMessage(`Payment ${initiated.status.toLowerCase()}.`); return; }
      if (!initiated.checkoutKey || !initiated.paymentIntentReference) throw new Error("Razorpay checkout details were not returned by the server.");
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable.");
      const checkout = new window.Razorpay({
        key: initiated.checkoutKey,
        amount: Math.round(initiated.amount * 100),
        currency: initiated.currencyCode,
        name: "Chao Desi",
        description: "Urban Services booking",
        order_id: initiated.paymentIntentReference,
        theme: { color: "#146fba" },
        modal: { ondismiss: () => { setBusy(false); setMessage("Payment window closed. You can try again."); } },
        handler: async (result) => {
          try {
            const verified = await verifyServicesRazorpayPayment(bookingId, initiated.publicId, { orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature });
            setPayment(verified); setMessage("Payment succeeded. Your booking is confirmed."); onSuccess?.(verified);
          } catch { setMessage("Razorpay returned the payment, but server verification failed. Please do not pay again; contact support."); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", (response) => { setBusy(false); setMessage(response.error?.description || "Payment failed. You can retry safely."); });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment failed. You can retry safely.");
    } finally {
      if (!window.Razorpay) setBusy(false);
    }
  }

  return <section className="services-payment-panel">
    <h4>Payment</h4><p>{currency} {amount.toFixed(2)}</p>
    <button type="button" disabled={busy} onClick={() => void pay()}>{busy ? "Opening Razorpay…" : "Pay securely with Razorpay"}</button>
    {payment && !payment.requiresAction ? <p>{payment.status} · {payment.providerReference || payment.paymentIntentReference}</p> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
