import { apiClient } from "../api/client";

type RazorpayResult = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (result: { error?: { description?: string } }) => void) => void };
const razorpayWindow = () => window as unknown as { Razorpay?: RazorpayConstructor };

let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (razorpayWindow().Razorpay) return Promise.resolve();
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
  return checkoutScript;
}

export async function startRazorpayPayment(input: { amount: number; currency: string; receipt?: string; name?: string; description: string }) {
  const receipt = input.receipt?.trim() || `CHAO-${Date.now()}`;
  const order = (await apiClient.post<{ orderId: string; checkoutKey: string; amountMinor: number; currency: string }>("/payments/razorpay/orders", { ...input, receipt })).data;
  await loadCheckout();
  const Razorpay = razorpayWindow().Razorpay;
  if (!Razorpay) throw new Error("Razorpay Checkout is unavailable.");
  const result = await new Promise<RazorpayResult>((resolve, reject) => {
    const checkout = new Razorpay({ key: order.checkoutKey, amount: order.amountMinor, currency: order.currency, order_id: order.orderId, name: input.name || "Chao Desi", description: input.description, theme: { color: "#146fba" }, modal: { ondismiss: () => reject(new Error("Payment window closed.")) }, handler: resolve });
    checkout.on("payment.failed", (failure) => reject(new Error(failure.error?.description || "Payment failed.")));
    checkout.open();
  });
  return (await apiClient.post<{ paymentToken: string; paymentReference: string; amount: number; currency: string }>("/payments/razorpay/verify", { orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature })).data;
}
