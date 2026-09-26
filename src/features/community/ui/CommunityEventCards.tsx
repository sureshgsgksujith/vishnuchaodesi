import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import {
  communityApi,
  type CommunityEvent,
  type CommunityEventRegistrationItem,
  type CommunityRegistration,
  type CommunityTicket,
} from "../api/communityApi";

type Props = {
  events: CommunityEvent[];
  register?: boolean;
  onChanged?: () => void | Promise<void>;
};

const localDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const messageOf = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

export default function CommunityEventCards({
  events,
  register,
  onChanged,
}: Props) {
  const [active, setActive] = useState<CommunityEvent>();
  const [manage, setManage] = useState<CommunityEvent>();
  const [tickets, setTickets] = useState<CommunityTicket[]>([]);
  const [attendees, setAttendees] = useState<CommunityEventRegistrationItem[]>(
    [],
  );
  const [registration, setRegistration] = useState<CommunityRegistration>();
  const [ticketQrs, setTicketQrs] = useState<Record<string, string>>({});
  const [issuedTicketName, setIssuedTicketName] = useState("General admission");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [pendingPayment, setPendingPayment] = useState<{
    body: Record<string, unknown>;
    ticket: CommunityTicket;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const modalCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalCardRef.current?.scrollTo({ top: 0 });
  }, [active, pendingPayment, registration]);

  useEffect(() => {
    let current = true;
    const tokens = registration?.checkInTokens ?? [];
    if (!tokens.length) {
      setTicketQrs({});
      return () => {
        current = false;
      };
    }
    void Promise.all(
      tokens.map(
        async (token) =>
          [
            token,
            await QRCode.toDataURL(token, {
              width: 320,
              margin: 1,
              errorCorrectionLevel: "H",
            }),
          ] as const,
      ),
    ).then((entries) => {
      if (current) setTicketQrs(Object.fromEntries(entries));
    });
    return () => {
      current = false;
    };
  }, [registration]);

  async function open(event: CommunityEvent) {
    setActive(event);
    setRegistration(undefined);
    setPendingPayment(undefined);
    setError("");
    try {
      const loadedTickets = await communityApi.eventTickets(event.id);
      setTickets(loadedTickets);
      if (event.myRegistrationId) {
        setRegistration(await communityApi.myEventRegistration(event.id));
        setIssuedTicketName(loadedTickets[0]?.name || "General admission");
      }
    } catch {
      setTickets([]);
    }
  }

  async function openManager(event: CommunityEvent) {
    setManage(event);
    setError("");
    setBusy(true);
    try {
      setAttendees((await communityApi.eventRegistrations(event.id)).items);
    } catch (e) {
      setError(messageOf(e, "Attendees could not be loaded."));
    } finally {
      setBusy(false);
    }
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!active) return;
    const form = new FormData(formEvent.currentTarget);
    setError("");
    const ticketId = Number(form.get("ticketTypeId")) || undefined;
    const ticket = tickets.find((item) => item.id === ticketId);
    const body: Record<string, unknown> = {
      ticketTypeId: ticketId,
      promoCode: String(form.get("promoCode") || "") || undefined,
      attendees: [
        {
          name: form.get("name"),
          email: form.get("email") || undefined,
          phone: form.get("phone") || undefined,
        },
      ],
    };
    setIssuedTicketName(ticket?.name || "General admission");
    if (ticket && ticket.price > 0) {
      setPendingPayment({ body, ticket });
      return;
    }
    setBusy(true);
    try {
      await communityApi.registerEventDetails(active.id, body);
      setRegistration(await communityApi.myEventRegistration(active.id));
      await onChanged?.();
    } catch (e) {
      setError(messageOf(e, "Registration could not be completed."));
    } finally {
      setBusy(false);
    }
  }

  function downloadTicket(token: string, index: number) {
    if (!active || !registration || !ticketQrs[token]) return;
    const location =
      [
        active.venueName,
        active.address,
        active.city,
        active.state,
        active.country,
        active.postalCode,
      ]
        .filter(Boolean)
        .join(", ") || "Online event";
    const amount = registration.totalAmount.toLocaleString(undefined, {
      style: "currency",
      currency: registration.currency,
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><rect width="900" height="520" rx="32" fill="#f7f9ff"/><rect width="900" height="110" rx="32" fill="#3158d8"/><rect y="78" width="900" height="32" fill="#3158d8"/><text x="44" y="48" font-family="Arial" font-size="18" font-weight="700" fill="#dfe7ff">CHAODESI EVENT TICKET</text><text x="44" y="86" font-family="Arial" font-size="30" font-weight="700" fill="white">${xml(active.title)}</text><text x="44" y="164" font-family="Arial" font-size="22" font-weight="700" fill="#0b2858">${xml(issuedTicketName)}</text><text x="44" y="205" font-family="Arial" font-size="18" fill="#52698f">${xml(new Date(active.startAtUtc).toLocaleString())}</text><text x="44" y="242" font-family="Arial" font-size="18" fill="#52698f">${xml(location)}</text><text x="44" y="310" font-family="Arial" font-size="17" fill="#52698f">Registration #${registration.id} · Ticket ${index + 1}</text><text x="44" y="344" font-family="Arial" font-size="17" fill="#52698f">Paid: ${xml(amount)} · ${xml(registration.status.replace(/_/g, " "))}</text><text x="44" y="418" font-family="Arial" font-size="17" font-weight="700" fill="#3158d8">Show this QR code at the entry gate</text><image href="${ticketQrs[token]}" x="585" y="135" width="255" height="255"/><text x="712" y="420" text-anchor="middle" font-family="Arial" font-size="15" fill="#52698f">SECURE ENTRY QR</text><text x="44" y="478" font-family="Arial" font-size="14" fill="#8795ad">Each QR code is valid for one attendee and can be checked in once.</text></svg>`;
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `event-${active.id}-ticket-${index + 1}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printTickets() {
    if (!active || !registration) return;
    const popup = window.open("", "_blank", "width=900,height=720");
    if (!popup) {
      setError("Allow pop-ups to print or save the ticket as PDF.");
      return;
    }
    const location =
      [
        active.venueName,
        active.address,
        active.city,
        active.state,
        active.country,
        active.postalCode,
      ]
        .filter(Boolean)
        .join(", ") || "Online event";
    const cards = registration.checkInTokens
      .map(
        (token, index) =>
          `<section><h1>${xml(active.title)}</h1><h2>${xml(issuedTicketName)} · Ticket ${index + 1}</h2><p>${xml(new Date(active.startAtUtc).toLocaleString())}</p><p>${xml(location)}</p><img src="${ticketQrs[token]}"/><strong>Registration #${registration.id}</strong><small>Show this QR at the entry gate. Valid for one check-in.</small></section>`,
      )
      .join("");
    popup.document.write(
      `<title>${xml(active.title)} tickets</title><style>body{font-family:Arial;background:#eef2fb;margin:0;padding:24px}section{box-sizing:border-box;max-width:760px;margin:0 auto 24px;padding:32px;border:2px solid #3158d8;border-radius:22px;background:white;page-break-after:always}h1{color:#0b2858;margin:0 0 12px}h2{color:#3158d8}p{color:#52698f}img{display:block;width:260px;height:260px;margin:22px auto}strong,small{display:block;text-align:center}small{margin-top:10px;color:#677794}@media print{body{background:white;padding:0}section{border:2px solid #3158d8}}</style>${cards}`,
    );
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
  }

  async function checkIn(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!manage) return;
    const token = String(
      new FormData(formEvent.currentTarget).get("token") || "",
    ).trim();
    if (!token) return;
    setBusy(true);
    setCheckInMessage("");
    try {
      await communityApi.eventCheckIn(manage.id, token);
      setCheckInMessage("Ticket verified. Attendee checked in successfully.");
      formEvent.currentTarget.reset();
    } catch (e) {
      setCheckInMessage(messageOf(e, "Ticket could not be checked in."));
    } finally {
      setBusy(false);
    }
  }

  function registrationTicket(
    event: CommunityEvent,
    result: CommunityRegistration,
  ) {
    const location =
      [event.venueName, event.city, event.state, event.country]
        .filter(Boolean)
        .join(", ") || "Online event";
    return (
      <div className="event-registration-success">
        <div className="event-ticket-confirmed">
          <span className="event-ticket-checkmark">✓</span>
          <div>
            <small>PAYMENT SUCCESSFUL · REGISTRATION CONFIRMED</small>
            <h3>
              {result.checkInTokens.length === 1
                ? "Your ticket is ready"
                : `Your ${result.checkInTokens.length} tickets are ready`}
            </h3>
            <p>
              Registration #{result.id} ·{" "}
              {result.totalAmount.toLocaleString(undefined, {
                style: "currency",
                currency: result.currency,
              })}
            </p>
          </div>
        </div>
        <div className="event-ticket-list">
          {result.checkInTokens.map((token, index) => (
            <article className="event-digital-ticket" key={token}>
              <div>
                <small>CHAODESI EVENT TICKET</small>
                <h3>{event.title}</h3>
                <p>
                  {issuedTicketName} · Attendee {index + 1}
                </p>
                <p>
                  <span className="material-icons">schedule</span>
                  {new Date(event.startAtUtc).toLocaleString()}
                </p>
                <p>
                  <span className="material-icons">location_on</span>
                  {location}
                </p>
                <b>Registration #{result.id}</b>
              </div>
              <div className="event-ticket-qr">
                {ticketQrs[token] ? (
                  <img
                    src={ticketQrs[token]}
                    alt={`Entry QR for ticket ${index + 1}`}
                  />
                ) : (
                  <span>Creating QR…</span>
                )}
                <small>SCAN AT ENTRY</small>
              </div>
              <button
                type="button"
                disabled={!ticketQrs[token]}
                onClick={() => downloadTicket(token, index)}
              >
                <span className="material-icons">download</span>Download ticket
              </button>
            </article>
          ))}
        </div>
        {error ? <p className="community-error">{error}</p> : null}
        <div className="event-ticket-buttons">
          <button
            type="button"
            onClick={() => {
              setRegistration(undefined);
              setTicketQrs({});
              setError("");
            }}
          >
            <span className="material-icons">add</span>Buy another ticket
          </button>
          <button
            type="button"
            onClick={printTickets}
            disabled={
              !result.checkInTokens.length ||
              Object.keys(ticketQrs).length !== result.checkInTokens.length
            }
          >
            <span className="material-icons">print</span>Print / save PDF
          </button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              await communityApi.cancelEventRegistration(event.id, result.id);
              setRegistration({ ...result, status: "CANCELLED" });
              await onChanged?.();
            }}
            disabled={result.status === "CANCELLED"}
          >
            Cancel registration
          </button>
        </div>
      </div>
    );
  }

  async function pay(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!active || !pendingPayment) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true);
    setError("");
    try {
      const declined = form.get("decline") === "on";
      await communityApi.registerEventDetails(active.id, {
        ...pendingPayment.body,
        paymentToken: declined ? "pm_dummy_declined" : "pm_dummy_success",
      });
      setRegistration(await communityApi.myEventRegistration(active.id));
      setPendingPayment(undefined);
      await onChanged?.();
    } catch (e) {
      setError(messageOf(e, "Payment could not be completed."));
    } finally {
      setBusy(false);
    }
  }

  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!manage) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true);
    setError("");
    try {
      await communityApi.updateEvent(manage.id, {
        title: form.get("title"),
        description: form.get("description") || undefined,
        eventMode: form.get("eventMode"),
        venueName: form.get("venueName") || undefined,
        address: form.get("address") || undefined,
        city: form.get("city") || undefined,
        state: form.get("state") || undefined,
        country: form.get("country") || undefined,
        postalCode: form.get("postalCode") || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        startAtUtc: new Date(String(form.get("startAtUtc"))).toISOString(),
        endAtUtc: new Date(String(form.get("endAtUtc"))).toISOString(),
        registrationDeadlineUtc: form.get("registrationDeadlineUtc")
          ? new Date(String(form.get("registrationDeadlineUtc"))).toISOString()
          : undefined,
        capacity: Number(form.get("capacity")) || undefined,
      });
      setManage(undefined);
      await onChanged?.();
    } catch (e) {
      setError(messageOf(e, "Event could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function removeRegistration(item: CommunityEventRegistrationItem) {
    if (
      !manage ||
      !window.confirm(`Remove ${item.displayName} from this event?`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (item.totalAmount > 0)
        await communityApi.refundEventRegistration(manage.id, item.id);
      await communityApi.cancelEventRegistration(manage.id, item.id);
      setAttendees((current) =>
        current.map((x) =>
          x.id === item.id ? { ...x, registrationStatus: "CANCELLED" } : x,
        ),
      );
      await onChanged?.();
    } catch (e) {
      setError(messageOf(e, "Customer could not be removed."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(event: CommunityEvent) {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`))
      return;
    setBusy(true);
    setError("");
    try {
      await communityApi.deleteEvent(event.id);
      await onChanged?.();
    } catch (e) {
      window.alert(messageOf(e, "Event could not be deleted."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="community-event-grid">
        {events.map((event) => {
          const date = new Date(event.startAtUtc);
          const location = [
            event.venueName,
            event.city,
            event.state,
            event.country,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <article key={event.id}>
              <div className="community-event-art">
                <div>
                  <b>
                    {date.toLocaleDateString(undefined, { day: "2-digit" })}
                  </b>
                  <span>
                    {date.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                </div>
                <div className="community-event-art-meta">
                  <span className="event-price-badge">
                    {event.isPaid ? "PAID" : "FREE"}
                  </span>
                  <span className="event-type-mark" aria-hidden="true">
                    {event.eventMode === "VIRTUAL" ? "▶" : "★"}
                  </span>
                </div>
              </div>
              <div className="community-event-body">
                <span>{event.eventMode.replace(/_/g, " ")}</span>
                <h3>{event.title}</h3>
                <p>
                  <span className="material-icons">schedule</span>
                  {date.toLocaleString()}
                </p>
                <p>
                  <span className="material-icons">location_on</span>
                  {location || "Online event"}
                </p>
                <p>
                  <span className="material-icons">groups</span>
                  {event.confirmedCount}
                  {event.capacity ? ` / ${event.capacity}` : ""} confirmed
                </p>
                {event.canManage ? (
                  <div className="community-event-actions">
                    <button onClick={() => void openManager(event)}>
                      Edit &amp; manage
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => void deleteEvent(event)}
                    >
                      Delete
                    </button>
                  </div>
            ) : register ? (
              <button onClick={() => void open(event)}>{event.myRegistrationId ? "View ticket" : "RSVP now"}</button>
                ) : (
                  <Link to="/community/events">
                    View event <b>→</b>
                  </Link>
                )}
              </div>
            </article>
          );
        })}
        {!events.length ? (
          <div className="invitation-empty">
            <span className="material-icons">event_busy</span>
            <h3>No upcoming events</h3>
            <p>Check back soon for new community activities.</p>
          </div>
        ) : null}
      </div>

      {active ? (
        <div
          className="community-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActive(undefined);
          }}
        >
          <div ref={modalCardRef} className="community-modal-card event-rsvp-modal">
            <header>
              <div>
                <span className="material-icons">event_available</span>
                <div>
                  <small>EVENT REGISTRATION</small>
                  <h2>{active.title}</h2>
                </div>
              </div>
              <button onClick={() => setActive(undefined)} aria-label="Close">
                ×
              </button>
            </header>
            {registration ? (
              registrationTicket(active, registration)
            ) : pendingPayment ? (
              <form className="event-payment-form" onSubmit={pay}>
                <div className="event-payment-brand">
                  <strong>
                    {pendingPayment.ticket.currency === "INR"
                      ? "razorpay"
                      : "stripe"}
                  </strong>
                  <span>TEST CHECKOUT</span>
                </div>
                <div className="event-payment-total">
                  <span>{pendingPayment.ticket.name}</span>
                  <b>
                    {pendingPayment.ticket.price.toLocaleString(undefined, {
                      style: "currency",
                      currency: pendingPayment.ticket.currency,
                    })}
                  </b>
                </div>
                <label>
                  Cardholder name
                  <input
                    name="cardholder"
                    required
                    defaultValue="Test Customer"
                  />
                </label>
                <label>
                  Card number
                  <input
                    name="cardNumber"
                    inputMode="numeric"
                    required
                    defaultValue="4242 4242 4242 4242"
                  />
                </label>
                <div>
                  <label>
                    Expiry
                    <input name="expiry" required defaultValue="12/30" />
                  </label>
                  <label>
                    CVC
                    <input name="cvc" required defaultValue="123" />
                  </label>
                </div>
                <label className="event-payment-decline">
                  <input type="checkbox" name="decline" /> Simulate a declined
                  payment
                </label>
                <p className="event-payment-note">
                  Test mode only. No card data is stored and no money is
                  charged.
                </p>
                {error ? <p className="community-error">{error}</p> : null}
                <div className="event-payment-actions">
                  <button
                    type="button"
                    onClick={() => setPendingPayment(undefined)}
                  >
                    Back
                  </button>
                  <button disabled={busy}>
                    {busy
                      ? "Processing…"
                      : `Pay ${pendingPayment.ticket.price.toLocaleString(undefined, { style: "currency", currency: pendingPayment.ticket.currency })}`}
                  </button>
                </div>
              </form>
            ) : (
              <form className="event-rsvp-form" onSubmit={submit}>
                <label>
                  Attendee name
                  <input name="name" required autoFocus />
                </label>
                <label>
                  Email
                  <input name="email" type="email" />
                </label>
                <label>
                  Phone
                  <input name="phone" />
                </label>
                {tickets.length ? (
                  <label>
                    Ticket
                    <select name="ticketTypeId" required>
                      {tickets.map((ticket) => (
                        <option value={ticket.id} key={ticket.id}>
                          {ticket.name} —{" "}
                          {ticket.price.toLocaleString(undefined, {
                            style: "currency",
                            currency: ticket.currency,
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="event-free-entry">
                    <span className="material-icons">confirmation_number</span>
                    Free general admission
                  </p>
                )}
                <label>
                  Promo code
                  <input name="promoCode" placeholder="Optional" />
                </label>
                {error ? <p className="community-error">{error}</p> : null}
                <button disabled={busy}>
                  {busy
                    ? "Continuing…"
                    : tickets.some((ticket) => ticket.price > 0)
                      ? "Continue to payment"
                      : "Confirm free RSVP"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {manage ? (
        <div
          className="community-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setManage(undefined);
          }}
        >
          <div className="community-modal-card event-manage-modal">
            <header>
              <div>
                <span className="material-icons">event_note</span>
                <div>
                  <small>ORGANIZER CONTROLS</small>
                  <h2>Edit event</h2>
                </div>
              </div>
              <button onClick={() => setManage(undefined)} aria-label="Close">
                ×
              </button>
            </header>
            <form className="event-manage-form" onSubmit={saveEvent}>
              <label>
                Event title
                <input name="title" defaultValue={manage.title} required />
              </label>
              <label>
                Mode
                <select name="eventMode" defaultValue={manage.eventMode}>
                  <option value="IN_PERSON">In person</option>
                  <option value="VIRTUAL">Virtual</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </label>
              <label className="wide">
                Description
                <textarea
                  name="description"
                  defaultValue={manage.description}
                  rows={3}
                />
              </label>
              <label>
                Venue
                <input name="venueName" defaultValue={manage.venueName} />
              </label>
              <label>
                Street address
                <input name="address" defaultValue={manage.address} />
              </label>
              <label>
                City
                <input name="city" defaultValue={manage.city} />
              </label>
              <label>
                State / province
                <input name="state" defaultValue={manage.state} />
              </label>
              <label>
                Country
                <input name="country" defaultValue={manage.country} />
              </label>
              <label>
                Postal code
                <input name="postalCode" defaultValue={manage.postalCode} />
              </label>
              <label>
                Starts
                <input
                  type="datetime-local"
                  name="startAtUtc"
                  defaultValue={localDateTime(manage.startAtUtc)}
                  required
                />
              </label>
              <label>
                Ends
                <input
                  type="datetime-local"
                  name="endAtUtc"
                  defaultValue={localDateTime(manage.endAtUtc)}
                  required
                />
              </label>
              <label>
                Registration closes
                <input
                  type="datetime-local"
                  name="registrationDeadlineUtc"
                  defaultValue={localDateTime(manage.registrationDeadlineUtc)}
                />
              </label>
              <label>
                Maximum attendees
                <input
                  type="number"
                  min={Math.max(1, manage.confirmedCount)}
                  name="capacity"
                  defaultValue={manage.capacity}
                  placeholder="No limit"
                />
              </label>
              {error ? <p className="community-error wide">{error}</p> : null}
              <button className="wide" disabled={busy}>
                {busy ? "Saving…" : "Save event changes"}
              </button>
            </form>
            <section className="event-attendee-manager">
              <div>
                <h3>Registered people</h3>
                <span>
                  {attendees
                    .filter((x) => x.registrationStatus !== "CANCELLED")
                    .reduce((sum, x) => sum + x.attendeeCount, 0)}{" "}
                  attending
                </span>
              </div>
              {attendees.length ? (
                attendees.map((item) => (
                  <div className="event-attendee-row" key={item.id}>
                    <div>
                      <b>{item.displayName}</b>
                      <span>
                        {item.attendeeCount} attendee
                        {item.attendeeCount === 1 ? "" : "s"} ·{" "}
                        {item.registrationStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    {item.registrationStatus !== "CANCELLED" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeRegistration(item)}
                      >
                        {item.totalAmount > 0 ? "Refund & remove" : "Remove"}
                      </button>
                    ) : (
                      <em>Removed</em>
                    )}
                  </div>
                ))
              ) : (
                <p className="event-empty-attendees">No registrations yet.</p>
              )}
            </section>
            <section className="event-gate-checkin">
              <div><span className="material-icons">qr_code_scanner</span><div><h3>Entry gate check-in</h3><p>Scan the attendee QR with a scanner that types into this field, or paste the ticket token.</p></div></div>
              <form onSubmit={checkIn}><input name="token" autoComplete="off" placeholder="Scan or paste secure ticket token" aria-label="Ticket QR token" /><button disabled={busy}>{busy ? "Checking…" : "Verify & check in"}</button></form>
              {checkInMessage ? <p className="event-checkin-result">{checkInMessage}</p> : null}
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
