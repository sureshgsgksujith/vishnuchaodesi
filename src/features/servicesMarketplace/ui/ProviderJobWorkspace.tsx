import { useEffect, useState } from "react";
import { contactJobCustomer, getProviderJob, getProviderJobs, updateProviderJobStatus, type ProviderJobDetail, type ProviderJobSummary } from "../api/servicesMarketplaceApi";
import ProviderJobProofs from "./ProviderJobProofs";
import { ProviderAdditionalWork } from "./AdditionalWorkPanel";
import { ProviderCompletion } from "./CompletionPanel";
import "./providerJobs.css";
import "./providerActionOverrides.css";

const queueKey = "chaodesi_provider_job_actions_v1";
type QueuedAction = { jobId: string; action: string; eventId: string };
type JobView = "active" | "upcoming" | "today" | "history";

export default function ProviderJobWorkspace() {
  const [view, setView] = useState<JobView>("active");
  const [jobs, setJobs] = useState<ProviderJobSummary[]>([]);
  const [job, setJob] = useState<ProviderJobDetail | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmTravel, setConfirmTravel] = useState(false);
  const [confirmStartWork, setConfirmStartWork] = useState(false);
  const [startOtp, setStartOtp] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  async function load() {
    setLoading(true);
    try { setJobs(await getProviderJobs(view)); }
    catch { setMessage("Jobs could not be refreshed. Previously loaded details remain available."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [view]);
  async function openJob(id: string) {
    setOpeningId(id); setMessage("");
    try { setJob(await getProviderJob(id)); }
    catch { setMessage("Job details could not be loaded. Please try again."); }
    finally { setOpeningId(null); }
  }
  async function act(action: string, eventId = crypto.randomUUID(), startOtpCode?: string) {
    if (!job) return false;
    setActionError("");
    setActing(true);
    try {
      await updateProviderJobStatus(job, action, eventId, startOtpCode);
      saveQueue(readQueue().filter((x) => x.eventId !== eventId));
      setJob(await getProviderJob(job.id));
      await load();
      setMessage("Job status updated.");
      return true;
    } catch (error) {
      if ((error as { response?: { data?: { message?: string } } }).response) {
        const detail = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        const errorMessage = detail || "The action was not allowed. Refresh the job and try again.";
        setMessage(errorMessage); setActionError(errorMessage); return false;
      }
      const queue = readQueue();
      if (!queue.some((x) => x.eventId === eventId)) saveQueue([...queue, { jobId: job.id, action, eventId }]);
      setMessage("Network unavailable. The action is saved on this device; retry after reconnecting.");
      setActionError("The server could not be reached. The status has not changed yet; reconnect and try again.");
      return false;
    } finally { setActing(false); }
  }
  async function retry() {
    for (const item of readQueue()) {
      try {
        const detail = await getProviderJob(item.jobId);
        await updateProviderJobStatus(detail, item.action, item.eventId);
        saveQueue(readQueue().filter((x) => x.eventId !== item.eventId));
      } catch { break; }
    }
    await load();
  }

  return <section className="services-section provider-jobs-page">
    <header className="provider-jobs-head"><div><small>Assigned work</small><h2>Active jobs</h2><p>Manage appointments, travel, arrival, work progress and completion.</p></div><button type="button" className="provider-refresh-button" onClick={() => void load()} disabled={loading}><span className="material-icons">refresh</span>{loading ? "Refreshing..." : "Refresh jobs"}</button></header>
    <nav className="provider-job-filters" aria-label="Job filters">
      {(["active", "today", "upcoming", "history"] as const).map((item) => <button className={view === item ? "is-active" : ""} key={item} aria-pressed={view === item} onClick={() => setView(item)}><span className="material-icons">{item === "active" ? "work" : item === "today" ? "today" : item === "upcoming" ? "event_upcoming" : "history"}</span>{item === "active" ? "All active" : item[0].toUpperCase() + item.slice(1)}</button>)}
      {readQueue().length ? <button className="is-retry" onClick={() => void retry()}><span className="material-icons">sync_problem</span>Retry saved ({readQueue().length})</button> : null}
    </nav>
    {loading ? <div className="provider-jobs-state"><span className="provider-loading-spinner" /><strong>Loading your jobs...</strong></div> : jobs.length ? <div className="services-grid provider-jobs-grid">{jobs.map((item) => <article className="provider-job-card" key={item.id}>
      <header><small>{item.referenceNumber}</small><span className={`provider-job-status is-${item.status.toLowerCase().replace(/_/g, "-")}`}>{item.status.replace(/_/g, " ")}</span></header>
      <div className="provider-job-card-icon"><span className="material-icons">home_repair_service</span></div><h3>{item.serviceName}</h3>
      <div className="provider-job-time"><span className="material-icons">event</span><div><small>Appointment</small><strong>{new Date(item.requestedStartAtUtc).toLocaleString()}</strong></div></div>
      <button className="provider-open-job" disabled={openingId === item.id} onClick={() => void openJob(item.id)}>{openingId === item.id ? "Opening..." : "View and manage job"}<span className="material-icons">arrow_forward</span></button>
    </article>)}</div> : <div className="provider-jobs-state"><span className="material-icons">work_outline</span><h3>No {view === "active" ? "active" : view} jobs</h3><p>Assigned and accepted bookings will appear here automatically.</p></div>}
    {message ? <p className="provider-job-message" role="status">{message}</p> : null}
    {job ? <div className="provider-job-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setJob(null); }}><article className="provider-job-modal" role="dialog" aria-modal="true" aria-labelledby="provider-job-title">
      <header className="provider-job-modal-head"><div><small>{job.referenceNumber}</small><h3 id="provider-job-title">{job.serviceName}</h3></div><button type="button" aria-label="Close job details" onClick={() => { setConfirmTravel(false); setJob(null); }}>×</button></header>
      <div className="provider-job-summary"><span className={`provider-job-status is-${job.status.toLowerCase().replace(/_/g, "-")}`}>{job.status.replace(/_/g, " ")}</span><div><small>Appointment</small><strong>{new Date(job.requestedStartAtUtc).toLocaleString()}</strong></div></div>
      <section className="provider-job-detail-section"><h4><span className="material-icons">location_on</span>Service address</h4><p>{job.address ? `${job.address.line1}${job.address.line2 ? `, ${job.address.line2}` : ""}, ${job.address.locality}, ${job.address.administrativeArea} ${job.address.postalCode}` : "Address unavailable"}</p>{job.navigationUrl ? <a href={job.navigationUrl} target="_blank" rel="noreferrer"><span className="material-icons">directions</span>Open navigation</a> : null}</section>
      <section className="provider-job-detail-section"><h4><span className="material-icons">notes</span>Customer instructions</h4><p>{job.customerNotes || "No additional customer instructions."}</p></section>
      {job.checklistPreview.length ? <section className="provider-job-detail-section"><h4><span className="material-icons">checklist</span>Preparation checklist</h4><ul>{job.checklistPreview.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}
      <div className="provider-job-primary-actions">{job.status === "ACCEPTED" ? <button onClick={() => { setActionError(""); setConfirmTravel(true); }}><span className="material-icons">directions_car</span>Start travel</button> : null}{job.status === "EN_ROUTE" ? <button onClick={() => void act("ARRIVED")}>Mark arrived</button> : null}{job.status === "ARRIVED" ? <button className="provider-start-work-button" onClick={() => { setActionError(""); setStartOtp(""); setConfirmStartWork(true); }}>Start work</button> : null}<button className="is-secondary" onClick={() => void contactJobCustomer(job.id).then((result) => setMessage(result.message))}><span className="material-icons">chat</span>Contact customer</button></div>
      <div className="provider-job-work-panels"><ProviderJobProofs bookingId={job.id} /><ProviderAdditionalWork bookingId={job.id} status={job.status} /><ProviderCompletion bookingId={job.id} status={job.status} rowVersion={job.rowVersion} /></div>
      {confirmTravel ? <div className="provider-action-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !acting) setConfirmTravel(false); }}><section className="provider-action-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-travel-title"><div className="provider-action-confirm-icon"><span className="material-icons">directions_car</span></div><h3 id="confirm-travel-title">Start travelling to this customer?</h3><p>This will update the booking to <strong>Professional on the way</strong> and notify the customer that you have started travelling.</p><div className="provider-action-confirm-job"><span>{job.serviceName}</span><small>{new Date(job.requestedStartAtUtc).toLocaleString()}</small></div>{actionError ? <p className="provider-action-confirm-error" role="alert">{actionError}</p> : null}<footer><button type="button" className="is-cancel" disabled={acting} onClick={() => setConfirmTravel(false)}>Not yet</button><button type="button" className="is-confirm" disabled={acting} onClick={() => void act("START_TRAVEL").then((updated) => { if (updated) setConfirmTravel(false); })}>{acting ? "Updating..." : "Confirm start travel"}</button></footer></section></div> : null}
      {confirmStartWork ? <div className="provider-action-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !acting) setConfirmStartWork(false); }}><form className="provider-action-confirm" role="dialog" aria-modal="true" aria-labelledby="verify-start-title" onSubmit={(event) => { event.preventDefault(); if (!/^\d{6}$/.test(startOtp)) { setActionError("Enter the complete 6-digit OTP shown on the customer's booking."); return; } void act("START_WORK", crypto.randomUUID(), startOtp).then((updated) => { if (updated) { setConfirmStartWork(false); setStartOtp(""); } }); }}><div className="provider-action-confirm-icon"><span className="material-icons">pin</span></div><h3 id="verify-start-title">Verify customer OTP</h3><p>Ask the customer for the 6-digit code shown in their booking details. Successful verification securely starts the job.</p><label className="provider-start-otp-label">Customer service OTP<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={startOtp} onChange={(event) => { setStartOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setActionError(""); }} placeholder="000000" aria-describedby="provider-start-otp-help" /></label><small id="provider-start-otp-help" className="provider-start-otp-help">You have five attempts before a temporary security lock.</small>{actionError ? <p className="provider-action-confirm-error" role="alert">{actionError}</p> : null}<footer><button type="button" className="is-cancel" disabled={acting} onClick={() => setConfirmStartWork(false)}>Cancel</button><button type="submit" className="is-confirm" disabled={acting || startOtp.length !== 6}>{acting ? "Verifying..." : "Verify & start work"}</button></footer></form></div> : null}
    </article></div> : null}
  </section>;
}

function readQueue(): QueuedAction[] { try { return JSON.parse(localStorage.getItem(queueKey) || "[]") as QueuedAction[]; } catch { return []; } }
function saveQueue(items: QueuedAction[]) { localStorage.setItem(queueKey, JSON.stringify(items)); }
