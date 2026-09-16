import "./PaymentProcessingOverlay.css";

export default function PaymentProcessingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="payment-processing-overlay" role="status" aria-live="assertive" aria-label="Payment processing">
      <div className="payment-processing-card">
        <span className="payment-processing-spinner" aria-hidden="true" />
        <strong>Processing your payment</strong>
        <p>Please wait. Do not refresh, close this page, or click Back.</p>
      </div>
    </div>
  );
}
