import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyAllServicePostings,
  setMyAllServicePostingActive,
  deleteMyAllServicePosting,
  updateMyAllServicePostingAvailability,
  type AllServicePosting,
} from "../api/allServicePostingsApi";
import {
  getMyRequirementEnquiries,
  type RequirementEnquiry,
} from "../../listing/api/requirementsApi";
import { resolveListingImageUrl, setFallbackListingImage } from "../utils/listingImages";
import "../styles/listings.css";
import "../styles/service-expert-leads.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ServiceExpertLeadsPage() {
  const [postings, setPostings] = useState<AllServicePosting[]>([]);
  const [enquiries, setEnquiries] = useState<RequirementEnquiry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingPosting, setEditingPosting] = useState<AllServicePosting | null>(null);
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editMode, setEditMode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage("");
    Promise.all([getMyAllServicePostings(), getMyRequirementEnquiries()])
      .then(([serviceItems, leadItems]) => {
        if (!active) return;
        setPostings(serviceItems || []);
        setEnquiries(leadItems || []);
      })
      .catch(() => {
        if (active) setErrorMessage("Unable to load service expert details right now.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const serviceLeads = useMemo(() => {
    const ownedNames = postings.flatMap((posting) => [posting.businessName, posting.serviceName].filter(Boolean).map(normalize));
    const needle = normalize(search);
    return enquiries.filter((lead) => {
      const leadText = normalize([
        lead.leadType, lead.listingTitle, lead.listingCategoryName, lead.listingDetailCategory,
        lead.categoryName, lead.customerName, lead.customerEmail, lead.customerPhone, lead.message,
      ].filter(Boolean).join(" "));
      const isServiceLead = normalize(lead.leadType).includes("service") || ownedNames.some((name) =>
        name.length > 2 && (normalize(lead.listingTitle).includes(name) || normalize(lead.listingDetailCategory).includes(name)));
      return isServiceLead && (!needle || leadText.includes(needle));
    });
  }, [enquiries, postings, search]);

  const openAvailability = (posting: AllServicePosting) => {
    setEditingPosting(posting);
    setEditDays(posting.openDays?.length ? posting.openDays : DAYS.slice(0, 5));
    setEditMode(posting.workingMode || "business");
    setSaveMessage("");
  };

  const saveAvailability = async () => {
    if (!editingPosting || editDays.length === 0) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      const updated = await updateMyAllServicePostingAvailability(editingPosting.id, {
        openDays: editDays,
        workingMode: editMode,
      });
      setPostings((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditingPosting(null);
      setSaveMessage("Availability updated successfully.");
    } catch (error) {
      setSaveMessage(getRequestErrorMessage(error, "Could not update availability. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (posting: AllServicePosting) => {
    setSaveMessage("");
    try {
      const updated = await setMyAllServicePostingActive(posting.id, !posting.isAvailable);
      setPostings((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSaveMessage(updated.isAvailable ? "Service profile is active again." : "Service profile is inactive and hidden from customers.");
    } catch (error) {
      setSaveMessage(getRequestErrorMessage(error, "Could not change the service profile status."));
    }
  };

  const removePosting = async (posting: AllServicePosting) => {
    if (!window.confirm(`Delete ${posting.businessName}? This removes the service profile from your dashboard.`)) return;
    setSaveMessage("");
    try {
      await deleteMyAllServicePosting(posting.id);
      setPostings((items) => items.filter((item) => item.id !== posting.id));
      setSaveMessage("Service profile deleted.");
    } catch (error) {
      setSaveMessage(getRequestErrorMessage(error, "Could not delete the service profile."));
    }
  };

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-listings-main" showBottomCta={false}>
      <div className="ud-cen dashboard-listings-page service-expert-leads-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">SERVICE EXPERT LEADS</span>

        <section className="dashboard-listings-panel">
          <div className="dashboard-listings-toolbar service-expert-leads-header">
            <div className="dashboard-listings-title-block">
              <h2>Service Expert Leads</h2>
              <span>{serviceLeads.length} matching enquiries</span>
            </div>
            <div className="service-expert-leads-help">
              Customer interest requests for your published service profiles.
            </div>
            <div className="service-expert-leads-filter">
              <label>
                <span>Search leads</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, service or message..."
                  type="search"
                />
              </label>
              {search ? <button type="button" className="dashboard-listings-clear" onClick={() => setSearch("")}>Clear</button> : null}
            </div>
          </div>

          {saveMessage ? <div className={`service-expert-feedback${saveMessage.includes("Could") ? " is-error" : ""}`}>{saveMessage}</div> : null}
          {isLoading ? <div className="service-expert-state">Loading service expert details...</div> : null}
          {!isLoading && errorMessage ? <div className="service-expert-state is-error">{errorMessage}</div> : null}

          {!isLoading && !errorMessage ? (
            <>
              <div className="service-expert-availability">
                <div>
                  <h3>Your service availability</h3>
                  <p>Keep the days and working mode current so customers know when to contact you.</p>
                </div>
                {postings.length === 0 ? <span className="service-expert-muted">No service profile published yet.</span> : null}
                <div className="service-expert-profile-list">
                  {postings.map((posting) => (
                    <div className="service-expert-profile" key={posting.id}>
                      <div>
                        <strong>{posting.businessName}</strong>
                        <span>{posting.serviceName} · {posting.openDays?.join(", ") || "By appointment"}</span>
                        <em className={`service-expert-profile-status${posting.isAvailable !== false ? " is-active" : ""}`}>{posting.isAvailable !== false ? "Active" : "Inactive"}</em>
                      </div>
                      <div className="service-expert-profile-actions">
                        <button type="button" className="service-expert-availability-button" onClick={() => openAvailability(posting)}>Update availability</button>
                        <button type="button" className="service-expert-secondary-button" onClick={() => toggleActive(posting)}>{posting.isAvailable !== false ? "Set inactive" : "Set active"}</button>
                        <button type="button" className="service-expert-delete-button" onClick={() => removePosting(posting)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="table-responsive service-expert-table-wrap">
                <table className="table bordered dashboard-listings-table service-expert-leads-table">
                  <thead><tr><th>No</th><th>Lead details</th><th>Enquiry details</th><th>Message</th><th>Rating</th><th>Status</th><th>Manage</th></tr></thead>
                  <tbody>
                    {serviceLeads.map((lead, index) => <LeadRow key={lead.id} lead={lead} index={index} />)}
                  </tbody>
                </table>
              </div>
              {!serviceLeads.length ? <div className="service-expert-state">No service expert enquiries found.</div> : null}
            </>
          ) : null}
        </section>
      </div>

      {editingPosting ? (
        <div className="service-expert-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingPosting(null); }}>
          <div className="service-expert-modal" role="dialog" aria-modal="true" aria-labelledby="availability-title">
            <h2 id="availability-title">Update my availability</h2>
            <p>{editingPosting.businessName} · {editingPosting.serviceName}</p>
            <label><span>Working mode</span><select value={editMode} onChange={(event) => setEditMode(event.target.value)}><option value="business">Business hours</option><option value="open">Open availability</option><option value="appointment">By appointment</option><option value="unavailable">Temporarily unavailable</option></select></label>
            <fieldset><legend>Available days</legend><div className="service-expert-days">{DAYS.map((day) => <label key={day}><input type="checkbox" checked={editDays.includes(day)} onChange={() => setEditDays((items) => items.includes(day) ? items.filter((item) => item !== day) : [...items, day])} /><span>{day}</span></label>)}</div></fieldset>
            {!editDays.length ? <small className="service-expert-validation">Select at least one day.</small> : null}
            <div className="service-expert-modal-actions"><button type="button" className="dashboard-listings-clear" onClick={() => setEditingPosting(null)}>Cancel</button><button type="button" className="service-expert-availability-button" disabled={isSaving || !editDays.length} onClick={saveAvailability}>{isSaving ? "Saving..." : "Save availability"}</button></div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function LeadRow({ lead, index }: { lead: RequirementEnquiry; index: number }) {
  const title = lead.listingTitle || lead.categoryName || "Service enquiry";
  const imageUrl = resolveListingImageUrl(lead.listingImageUrl);
  return <tr>
    <td>{index + 1}</td>
    <td><div className="dashboard-listing-title-cell service-expert-lead-title"><img src={imageUrl} alt="" loading="lazy" onError={setFallbackListingImage} /><div><strong>{lead.customerName || "Customer"}</strong><span>{formatDate(lead.createdAt)} · {lead.customerPhone || "Phone not provided"}</span></div></div></td>
    <td><strong>{title}</strong><span className="service-expert-cell-detail">{[lead.listingCategoryName || lead.categoryName, lead.listingDetailCategory].filter(Boolean).join(" / ") || "Service request"}</span></td>
    <td className="service-expert-message">{lead.message || "No message"}</td><td>—</td><td><span className="dashboard-listing-status is-active">New</span></td>
    <td><div className="service-expert-row-actions"><a href={`tel:${lead.customerPhone}`}>Call</a>{lead.customerEmail ? <a href={`mailto:${lead.customerEmail}`}>Email</a> : null}</div></td>
  </tr>;
}

function normalize(value?: string | null) { return (value || "").trim().toLowerCase(); }
function formatDate(value?: string | null) { if (!value) return "N/A"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date); }

function getRequestErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (response?.status === 404) return "This action is not available on the running API. Restart the backend and try again.";
  if (response?.status === 401) return "Your session expired. Sign in again and retry.";
  return response?.data?.message || fallback;
}
