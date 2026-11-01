import { useEffect, useState } from "react";
import { getProviderOnboarding } from "../api/servicesMarketplaceApi";
import type { ProviderProfile } from "../api/servicesMarketplaceApi";
import "./providerOnboarding.css";

export default function ProviderOnboarding() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => { void getProviderOnboarding().then(setProfile).catch(() => setProfile(null)).finally(() => setBusy(false)); }, []);

  if (busy) return <div className="services-state">Loading provider profile…</div>;
  if (!profile) return <main className="provider-onboarding"><header><span>CHAO SERVICES PARTNER</span><h1>Provider account not onboarded</h1><p>Chao Services provider accounts are created only by the administration team. Contact your Chao Services administrator to receive your login credentials.</p></header><div className="services-alert"><b>Admin action required:</b> An administrator must create and approve your provider profile before this workspace becomes available.</div></main>;

  return <main className="provider-onboarding"><header><div className="provider-heading"><div><span>CHAO SERVICES PARTNER</span><h1>{profile.displayName}</h1><p>Your Chao Services profile is managed by the administration team.</p></div><b className="provider-status-badge">{profile.status.replace(/_/g, " ")}</b></div><div className="provider-approved-summary"><span>✓ Provider account {profile.status.toLowerCase().replace(/_/g, " ")}</span><small>{profile.status === "APPROVED" ? "Your profile is active and ready to receive eligible service requests." : "Contact the Chao Services administrator if you need assistance."}</small></div></header>
    {profile.decisionReason ? <div className="services-alert"><b>Admin note:</b> {profile.decisionReason}</div> : null}
    <section className="provider-form is-readonly"><div className="provider-form-heading"><div><span>PROFILE DETAILS</span><h2>Professional information</h2></div><small>Admin-managed provider profile</small></div><label>Professional type<input value={profile.providerType.replace(/_/g, " ")} readOnly /></label><label>Display name<input value={profile.displayName} readOnly /></label><label>Business name<input value={profile.businessName || "—"} readOnly /></label><label>Email<input value={profile.email} readOnly /></label><label>Phone<input value={profile.phone} readOnly /></label><label>Address<input value={profile.addressLine || "—"} readOnly /></label><label>City/locality<input value={profile.locality || "—"} readOnly /></label><label>State/province<input value={profile.administrativeArea || "—"} readOnly /></label><label>Postal code<input value={profile.postalCode || "—"} readOnly /></label><label>Country code<input value={profile.countryCode || "—"} readOnly /></label><label className="provider-wide">Profile summary<textarea value={profile.profileSummary || "—"} readOnly /></label></section>
    {profile.history.length ? <section className="provider-history"><h2>Status history</h2>{profile.history.map((x, i) => <div key={`${x.createdAtUtc}-${i}`}><b>{x.toStatus.replace(/_/g, " ")}</b><span>{new Date(x.createdAtUtc).toLocaleString()}</span>{x.reason ? <p>{x.reason}</p> : null}</div>)}</section> : null}</main>;
}
