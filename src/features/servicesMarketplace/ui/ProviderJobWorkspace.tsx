import { useEffect, useState } from "react";
import {
  contactJobCustomer,
  getProviderJob,
  getProviderJobs,
  updateProviderJobStatus,
  type ProviderJobDetail,
  type ProviderJobSummary,
} from "../api/servicesMarketplaceApi";
import ProviderJobProofs from "./ProviderJobProofs";
import { ProviderAdditionalWork } from "./AdditionalWorkPanel";
import { ProviderCompletion } from "./CompletionPanel";

const queueKey = "chaodesi_provider_job_actions_v1";
type QueuedAction = { jobId: string; action: string; eventId: string };

export default function ProviderJobWorkspace() {
  const [view, setView] = useState<"upcoming" | "today" | "history">("today");
  const [jobs, setJobs] = useState<ProviderJobSummary[]>([]);
  const [job, setJob] = useState<ProviderJobDetail | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setJobs(await getProviderJobs(view));
    } catch {
      setMessage("Jobs could not be refreshed. Previously loaded details remain available.");
    }
  }
  useEffect(() => { void load(); }, [view]);

  async function act(action: string, eventId = crypto.randomUUID()) {
    if (!job) return;
    try {
      await updateProviderJobStatus(job, action, eventId);
      saveQueue(readQueue().filter((x) => x.eventId !== eventId));
      setJob(await getProviderJob(job.id));
      setMessage("Job status updated.");
    } catch (error) {
      if ((error as { response?: unknown }).response) {
        setMessage("The action was not allowed. Refresh the job and try again.");
        return;
      }
      const queue = readQueue();
      if (!queue.some((x) => x.eventId === eventId))
        saveQueue([...queue, { jobId: job.id, action, eventId }]);
      setMessage("Network unavailable. The action is saved on this device; retry after reconnecting.");
    }
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

  return (
    <section className="services-section">
      <h2>Job workspace</h2>
      <div>
        {(["today", "upcoming", "history"] as const).map((x) => (
          <button key={x} aria-pressed={view === x} onClick={() => setView(x)}>{x}</button>
        ))}
        <button onClick={() => void retry()}>Retry saved actions ({readQueue().length})</button>
      </div>
      <div className="services-grid">
        {jobs.map((x) => (
          <article key={x.id}>
            <small>{x.referenceNumber}</small><h3>{x.serviceName}</h3>
            <p>{new Date(x.requestedStartAtUtc).toLocaleString()} · {x.status.replace(/_/g, " ")}</p>
            <button onClick={() => void getProviderJob(x.id).then(setJob)}>Open job</button>
          </article>
        ))}
      </div>
      {job ? (
        <article>
          <h3>{job.serviceName}</h3>
          <p>{job.address ? `${job.address.line1}, ${job.address.locality}, ${job.address.administrativeArea} ${job.address.postalCode}` : "Address unavailable"}</p>
          {job.navigationUrl ? <a href={job.navigationUrl} target="_blank" rel="noreferrer">Open navigation</a> : null}
          <p>{job.customerNotes || "No customer instructions."}</p>
          {job.packageSnapshot ? <pre>{JSON.stringify(job.packageSnapshot, null, 2)}</pre> : null}
          <pre>{JSON.stringify(job.addOns, null, 2)}</pre>
          {job.checklistPreview.length ? <ul>{job.checklistPreview.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
          <div>
            {job.status === "ACCEPTED" ? <button onClick={() => void act("START_TRAVEL")}>Start travel</button> : null}
            {job.status === "EN_ROUTE" ? <button onClick={() => void act("ARRIVED")}>Mark arrived</button> : null}
            <button onClick={() => void contactJobCustomer(job.id).then((x) => setMessage(x.message))}>Contact customer</button>
          </div>
          <ProviderJobProofs bookingId={job.id} />
          <ProviderAdditionalWork bookingId={job.id} status={job.status} />
          <ProviderCompletion bookingId={job.id} status={job.status} rowVersion={job.rowVersion} />
        </article>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

function readQueue(): QueuedAction[] {
  try { return JSON.parse(localStorage.getItem(queueKey) || "[]") as QueuedAction[]; }
  catch { return []; }
}
function saveQueue(items: QueuedAction[]) { localStorage.setItem(queueKey, JSON.stringify(items)); }
