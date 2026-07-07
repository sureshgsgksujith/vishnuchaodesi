import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getEventTicketApiErrorMessage,
  getMyEventTicketBookings,
  type EventTicketBooking,
} from "../api/eventTicketsApi";
import { getMyProfile, type UserProfileFormValues } from "../api/profileApi";
import { getMyPlanUsage, type PlanUsage } from "../../pricing/api/pricingApi";
import { formatCurrencyAmount } from "../../../shared/utils/currency";
import "../styles/invoice.css";

type InvoiceRecord = {
  id: string;
  type: "Plan" | "Event";
  name: string;
  description: string;
  reference: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  status: string;
  provider: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  eventDate?: string | null;
  eventTime?: string | null;
  lines: Array<{ label: string; quantity: number; amount: number }>;
};

const INVOICE_PAGE_SIZE = 6;

export default function InvoicePage() {
  const [profile, setProfile] = useState<UserProfileFormValues | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [eventBookings, setEventBookings] = useState<EventTicketBooking[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setErrorMessage("");

    Promise.allSettled([
      getMyProfile(),
      getMyPlanUsage(),
      getMyEventTicketBookings(),
    ])
      .then(([profileResult, planResult, bookingsResult]) => {
        if (!isActive) {
          return;
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.profile);
        }

        if (planResult.status === "fulfilled") {
          setPlanUsage(planResult.value);
        }

        if (bookingsResult.status === "fulfilled") {
          setEventBookings(bookingsResult.value || []);
        } else {
          setErrorMessage(getEventTicketApiErrorMessage(bookingsResult.reason));
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
    setPage(1);
  }, [search]);

  const invoices = useMemo(
    () => buildInvoices(profile, planUsage, eventBookings),
    [eventBookings, planUsage, profile],
  );
  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, search),
    [invoices, search],
  );
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / INVOICE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedInvoices = filteredInvoices.slice(
    (currentPage - 1) * INVOICE_PAGE_SIZE,
    currentPage * INVOICE_PAGE_SIZE,
  );
  const totalPaid = useMemo(
    () => invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    [invoices],
  );
  const latestInvoice = invoices[0];

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-invoice-main">
      <div className="ud-cen dashboard-invoice-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Invoices</span>

        {isLoading ? <InvoiceLoadingOverlay /> : null}

        <section className="dashboard-invoice-hero">
          <div>
            <span>Payment Invoices</span>
            <h2>Invoice Center</h2>
            <p>
              Download plan and event ticket payment invoices from your latest
              customer dashboard data.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-invoice-primary"
            onClick={() => latestInvoice && downloadInvoice(latestInvoice, profile)}
            disabled={!latestInvoice}
          >
            Download Latest
          </button>
        </section>

        <section className="dashboard-invoice-summary">
          <SummaryCard label="Invoices" value={String(invoices.length)} tone="blue" />
          <SummaryCard label="Total Paid" value={formatCurrencyAmount(totalPaid)} tone="green" />
          <SummaryCard label="Plan" value={planUsage?.plan?.name || "-"} tone="orange" />
          <SummaryCard label="Latest" value={formatDate(latestInvoice?.paymentDate)} tone="violet" />
        </section>

        <section className="dashboard-invoice-panel">
          <div className="dashboard-invoice-head">
            <div>
              <h3>Payment Invoices</h3>
              <p>{filteredInvoices.length} invoices found</p>
            </div>
            <label className="dashboard-invoice-search">
              <span className="material-icons" aria-hidden="true">search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
              />
            </label>
          </div>

          {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}

          <div className="table-responsive dashboard-invoice-table-wrap">
            <table className="responsive-table bordered dashboard-invoice-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Invoice</th>
                  <th>Reference</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="dashboard-invoice-empty">Loading invoices...</td>
                  </tr>
                ) : pagedInvoices.length > 0 ? (
                  pagedInvoices.map((invoice, index) => (
                    <tr key={invoice.id}>
                      <td>{(currentPage - 1) * INVOICE_PAGE_SIZE + index + 1}</td>
                      <td>
                        <div className="dashboard-invoice-name">
                          <strong>{invoice.name}</strong>
                          <span>{invoice.description}</span>
                          <em>{invoice.type} invoice</em>
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-invoice-ref">{invoice.reference}</span>
                      </td>
                      <td>{formatDate(invoice.paymentDate)}</td>
                      <td>
                        <b>{formatCurrencyAmount(invoice.amount, invoice.currency)}</b>
                        <span>{invoice.provider}</span>
                      </td>
                      <td>
                        <span className={`dashboard-invoice-status ${isPaidStatus(invoice.status) ? "is-paid" : "is-pending"}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="dashboard-invoice-download"
                          onClick={() => downloadInvoice(invoice, profile)}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="dashboard-invoice-empty">No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <InvoicePagination
            page={currentPage}
            totalCount={filteredInvoices.length}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "orange" | "violet";
}) {
  return (
    <article className={`dashboard-invoice-summary-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InvoicePagination({
  page,
  totalCount,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const goToPage = (nextPage: number) =>
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));

  return (
    <div className="dashboard-invoice-pagination">
      <span>{totalCount} invoices</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Previous
        </button>
        <strong>{page} / {totalPages}</strong>
        <button type="button" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function InvoiceLoadingOverlay() {
  return (
    <div className="dashboard-invoice-loader" role="status" aria-live="polite">
      <div className="dashboard-invoice-loader-card">
        <span className="dashboard-invoice-loader-spinner" aria-hidden="true"></span>
        <strong>Loading invoices</strong>
        <p>Getting your plan and payment invoice data.</p>
      </div>
    </div>
  );
}

function buildInvoices(
  profile: UserProfileFormValues | null,
  planUsage: PlanUsage | null,
  bookings: EventTicketBooking[],
): InvoiceRecord[] {
  const plan = planUsage?.plan;
  const records: InvoiceRecord[] = [];
  const fullName = getProfileName(profile);

  if (plan) {
    records.push({
      id: `plan-${plan.code}`,
      type: "Plan",
      name: `${plan.name} Plan`,
      description: "Customer dashboard subscription",
      reference: `PLAN-${plan.code.toUpperCase()}`,
      paymentDate: profile?.createdAt || new Date().toISOString(),
      amount: plan.price || 0,
      currency: plan.currency,
      status: planUsage?.isPlanExpired ? "Expired" : "Active",
      provider: "Plan payment",
      buyerName: fullName,
      buyerEmail: profile?.email || "",
      buyerPhone: profile?.mobileNumber || "",
      lines: [
        {
          label: `${plan.name} plan`,
          quantity: 1,
          amount: plan.price || 0,
        },
      ],
    });
  }

  bookings
    .filter((booking) => isPaidStatus(booking.paymentStatus))
    .forEach((booking) => {
      const eventDateText = formatEventDateTime(booking.eventDate, booking.eventTime);
      const locationText = booking.venue || booking.city || "Event ticket booking";
      records.push({
        id: `event-${booking.id}`,
        type: "Event",
        name: booking.eventTitle,
        description: [eventDateText, locationText].filter(Boolean).join(" | "),
        reference: booking.bookingReference,
        paymentDate: booking.paidAt || booking.createdAt,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: booking.paymentStatus,
        provider: booking.paymentProvider,
        buyerName: booking.buyerName || fullName,
        buyerEmail: booking.buyerEmail || profile?.email || "",
        buyerPhone: booking.buyerPhone || profile?.mobileNumber || "",
        eventDate: booking.eventDate,
        eventTime: booking.eventTime,
        lines: booking.items.length
          ? booking.items.map((item) => ({
              label: item.name,
              quantity: item.quantity,
              amount: item.price * item.quantity,
            }))
          : [
              {
                label: "Event ticket",
                quantity: 1,
                amount: booking.totalAmount,
              },
            ],
      });
    });

  return records.sort(
    (first, second) => getDateTime(second.paymentDate) - getDateTime(first.paymentDate),
  );
}

function filterInvoices(invoices: InvoiceRecord[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return invoices;
  }

  return invoices.filter((invoice) =>
    [
      invoice.name,
      invoice.description,
      invoice.reference,
      invoice.type,
      invoice.status,
      invoice.provider,
      invoice.buyerName,
      invoice.buyerEmail,
      invoice.buyerPhone,
      invoice.eventDate,
      invoice.eventTime,
      formatEventDateTime(invoice.eventDate, invoice.eventTime),
      formatDate(invoice.paymentDate),
      formatCurrencyAmount(invoice.amount, invoice.currency),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function downloadInvoice(invoice: InvoiceRecord, profile: UserProfileFormValues | null) {
  const html = buildInvoiceHtml(invoice, profile);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(invoice.reference || invoice.id)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildInvoiceHtml(invoice: InvoiceRecord, profile: UserProfileFormValues | null) {
  const eventMeta = invoice.type === "Event"
    ? `
        <div class="box">
          <div class="label">Event Date</div>
          <div class="value">${escapeHtml(formatEventDate(invoice.eventDate))}</div>
          <div class="muted">${escapeHtml(invoice.eventTime || "")}</div>
        </div>
      `
    : "";
  const lines = invoice.lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.label)}</td>
          <td>${line.quantity}</td>
          <td>${escapeHtml(formatCurrencyAmount(line.amount, invoice.currency))}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.reference)} Invoice</title>
  <style>
    body { margin: 0; background: #eef5fb; color: #101b32; font-family: Arial, sans-serif; }
    .invoice { max-width: 820px; margin: 32px auto; background: #fff; border: 1px solid #d9e6f6; border-radius: 8px; overflow: hidden; }
    .header { padding: 28px 32px; background: linear-gradient(135deg, #e8f2ff 0%, #ffffff 52%, #fff0df 100%); border-bottom: 1px solid #d9e6f6; }
    .brand { color: #f59e0b; font-size: 28px; font-weight: 900; }
    h1 { margin: 18px 0 6px; font-size: 28px; }
    .muted { color: #607089; font-size: 13px; }
    .section { padding: 24px 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .box { border: 1px solid #e2ebf6; border-radius: 8px; padding: 14px; }
    .label { color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .value { margin-top: 5px; font-size: 15px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    th, td { border-bottom: 1px solid #e2ebf6; padding: 12px; text-align: left; font-size: 13px; }
    th { background: #f7fbff; color: #334155; text-transform: uppercase; font-size: 11px; }
    .total { text-align: right; padding-top: 18px; font-size: 24px; font-weight: 900; }
    .footer { color: #607089; font-size: 12px; padding: 18px 32px 28px; }
  </style>
</head>
<body>
  <main class="invoice">
    <div class="header">
      <div class="brand">Chao Desi</div>
      <h1>${escapeHtml(invoice.type)} Invoice</h1>
      <div class="muted">Reference: ${escapeHtml(invoice.reference)}</div>
    </div>
    <section class="section">
      <div class="grid">
        <div class="box">
          <div class="label">Bill To</div>
          <div class="value">${escapeHtml(invoice.buyerName || getProfileName(profile))}</div>
          <div class="muted">${escapeHtml(invoice.buyerEmail || profile?.email || "")}</div>
          <div class="muted">${escapeHtml(invoice.buyerPhone || profile?.mobileNumber || "")}</div>
        </div>
        <div class="box">
          <div class="label">Payment</div>
          <div class="value">${escapeHtml(formatDate(invoice.paymentDate))}</div>
          <div class="muted">${escapeHtml(invoice.status)} via ${escapeHtml(invoice.provider)}</div>
        </div>
        ${eventMeta}
      </div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>
      <div class="total">Total: ${escapeHtml(formatCurrencyAmount(invoice.amount, invoice.currency))}</div>
    </section>
    <div class="footer">Generated from the Chao Desi customer dashboard.</div>
  </main>
</body>
</html>`;
}

function getProfileName(profile: UserProfileFormValues | null) {
  return (
    profile?.fullName ||
    localStorage.getItem("fullName") ||
    localStorage.getItem("customer_name") ||
    "Customer"
  );
}

function isPaidStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return ["paid", "active", "completed", "success", "succeeded"].includes(normalized);
}

function getDateTime(value?: string | null) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatEventDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatEventDateTime(date?: string | null, time?: string | null) {
  const dateText = formatEventDate(date);
  const parts = [dateText === "-" ? "" : dateText, time || ""].filter(Boolean);

  return parts.length ? `Event date: ${parts.join(" ")}` : "";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "invoice";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
