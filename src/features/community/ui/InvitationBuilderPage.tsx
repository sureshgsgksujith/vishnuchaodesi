import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { communityApi } from "../api/communityApi";
import "./invitationBuilder.css";

type InvitationFunction = { id: number; name: string; date: string; time: string; venue: string; mapUrl: string; dressCode: string };
const templates = ["Elegant", "Floral", "Traditional", "Modern", "Celebration"];
const themes = ["Saffron", "Rose", "Emerald", "Royal Blue", "Midnight"];
const rsvpOptions = ["Number attending", "Plus-one", "Adults and children", "Meal preference", "Accommodation", "Transportation", "Special notes"];

export default function InvitationBuilderPage() {
  const [invitationType, setInvitationType] = useState("WEDDING");
  const [template, setTemplate] = useState("Elegant");
  const [theme, setTheme] = useState("Saffron");
  const [title, setTitle] = useState("You’re invited");
  const [hosts, setHosts] = useState("");
  const [message, setMessage] = useState("Join us as we celebrate this special occasion.");
  const [cover, setCover] = useState("");
  const [functions, setFunctions] = useState<InvitationFunction[]>([{ id: 1, name: "Main celebration", date: "", time: "", venue: "", mapUrl: "", dressCode: "" }]);
  const [guests, setGuests] = useState("");
  const [questions, setQuestions] = useState<string[]>(["Number attending"]);
  const [giftOption, setGiftOption] = useState("No gifts");
  const [reminder, setReminder] = useState("1 day before");
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [publishError, setPublishError] = useState("");
  const guestCount = useMemo(() => guests.split(/\r?\n/).filter(line => line.trim()).length, [guests]);

  function updateFunction(id: number, field: keyof InvitationFunction, value: string) { setFunctions(items => items.map(item => item.id === id ? { ...item, [field]: value } : item)); }
  function addFunction() { setFunctions(items => [...items, { id: Date.now(), name: `Function ${items.length + 1}`, date: "", time: "", venue: "", mapUrl: "", dressCode: "" }]); }
  function removeFunction(id: number) { setFunctions(items => items.length === 1 ? items : items.filter(item => item.id !== id)); }
  function chooseCover(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) setCover(URL.createObjectURL(file)); }
  function toggleQuestion(value: string) { setQuestions(items => items.includes(value) ? items.filter(item => item !== value) : [...items, value]); }
  async function publishInvitation() {
    setPublishError(""); setPublishing(true);
    try {
      const mappedFunctions = functions.map(item => {
        const start = new Date(`${item.date}T${item.time || "12:00"}:00`);
        if (!item.date || Number.isNaN(start.valueOf())) throw new Error("Add a valid date and time for every function.");
        return { name: item.name, startAtUtc: start.toISOString(), endAtUtc: new Date(start.getTime() + 10800000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", venueName: item.venue, address: item.venue, mapUrl: item.mapUrl || undefined, dressCode: item.dressCode || undefined };
      });
      const result = await communityApi.createInvitation({ invitationType, title, message, hostDetails: hosts, templateCode: template.toUpperCase().replace(/\s+/g,"_"), themeCode: theme.toUpperCase().replace(/\s+/g,"_"), visibility: "PRIVATE", functions: mappedFunctions });
      await communityApi.publishInvitation(result.id);
      setPublishedUrl(`${window.location.origin}/community/invitations/${result.publicToken}`);
    } catch (error) { setPublishError(error instanceof Error ? error.message : "Unable to publish invitation."); }
    finally { setPublishing(false); }
  }

  return <>
    <UserHomeHeader hideAddAction />
    <main className="invite-builder">
      <header className="invite-builder-head"><div><Link to="/community/invitations">← Invitations</Link><h1>Create an invitation</h1><p>Build a beautiful invitation for one event or a celebration with multiple functions.</p></div><div><button className="invite-preview-button" onClick={() => setPreview(true)}>Preview</button><button className="invite-publish-button" disabled={publishing} onClick={publishInvitation}>{publishing ? "Publishing…" : "Publish"}</button></div></header>
      {publishError ? <p className="invite-note">{publishError}</p> : null}{publishedUrl ? <p className="invite-note">Published: <a href={publishedUrl}>{publishedUrl}</a></p> : null}
      <div className="invite-builder-layout">
        <div className="invite-form-stack">
          <BuilderSection number="1" title="Design"><div className="invite-field-row"><label>Template<select value={template} onChange={e => setTemplate(e.target.value)}>{templates.map(value => <option key={value}>{value}</option>)}</select></label><label>Theme<select value={theme} onChange={e => setTheme(e.target.value)}>{themes.map(value => <option key={value}>{value}</option>)}</select></label></div><label className="invite-upload">Cover image<input type="file" accept="image/*" onChange={chooseCover} /><span>{cover ? "Cover selected" : "Choose an image"}</span></label></BuilderSection>
          <BuilderSection number="2" title="Invitation and hosts"><label>Invitation type<select value={invitationType} onChange={e => setInvitationType(e.target.value)}>{["BIRTHDAY","WEDDING","ENGAGEMENT","ANNIVERSARY","HOUSEWARMING","BABY_SHOWER","GRADUATION","CUSTOM"].map(value => <option key={value}>{value}</option>)}</select></label><label>Invitation title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} /></label><label>Host details<textarea value={hosts} onChange={e => setHosts(e.target.value)} placeholder="Hosted by the Sharma and Patel families" /></label><label>Personal message<textarea value={message} onChange={e => setMessage(e.target.value)} /></label></BuilderSection>
          <BuilderSection number="3" title="Functions, venues and maps"><div className="invite-function-list">{functions.map((item, index) => <article key={item.id}><header><strong>Function {index + 1}</strong><button onClick={() => removeFunction(item.id)} disabled={functions.length === 1}>Remove</button></header><label>Function name<input value={item.name} onChange={e => updateFunction(item.id, "name", e.target.value)} /></label><div className="invite-field-row"><label>Date<input type="date" value={item.date} onChange={e => updateFunction(item.id, "date", e.target.value)} /></label><label>Time<input type="time" value={item.time} onChange={e => updateFunction(item.id, "time", e.target.value)} /></label></div><label>Venue<input value={item.venue} onChange={e => updateFunction(item.id, "venue", e.target.value)} placeholder="Venue name and address" /></label><div className="invite-field-row"><label>Map URL<input type="url" value={item.mapUrl} onChange={e => updateFunction(item.id, "mapUrl", e.target.value)} placeholder="https://maps…" /></label><label>Dress code<input value={item.dressCode} onChange={e => updateFunction(item.id, "dressCode", e.target.value)} /></label></div></article>)}</div><button className="invite-add-button" onClick={addFunction}>+ Add another function</button></BuilderSection>
          <BuilderSection number="4" title="Guests and RSVP"><label>Guest list <small>One guest or household per line</small><textarea rows={6} value={guests} onChange={e => setGuests(e.target.value)} placeholder={'Priya Rao — priya@example.com\nThe Mehta Family — +1 555 0100'} /></label><div className="invite-count">{guestCount} guest records</div><fieldset><legend>RSVP questions</legend><div className="invite-check-grid">{rsvpOptions.map(value => <label key={value}><input type="checkbox" checked={questions.includes(value)} onChange={() => toggleQuestion(value)} />{value}</label>)}</div></fieldset></BuilderSection>
          <BuilderSection number="5" title="Gifts and reminders"><div className="invite-field-row"><label>Gift preference<select value={giftOption} onChange={e => setGiftOption(e.target.value)}><option>No gifts</option><option>Gift registry</option><option>Direct gifts</option><option>Group gift</option><option>Charity contribution</option></select></label><label>Reminder schedule<select value={reminder} onChange={e => setReminder(e.target.value)}><option>None</option><option>1 day before</option><option>3 days before</option><option>1 week before</option><option>Custom schedule</option></select></label></div></BuilderSection>
          <BuilderSection number="6" title="Publish and share"><p className="invite-note">Publishing creates a private invitation and shareable URL. Delivery channels are enabled only when their providers are configured.</p><div className="invite-share-channels">{[["apps","In-app",true],["link","Shareable URL",true],["email","Email",false],["sms","SMS",false],["chat","WhatsApp",false]].map(([icon,label,ready]) => <button key={String(label)} disabled><span className="material-icons">{icon}</span>{label}<small>{ready ? "After publish" : "Not configured"}</small></button>)}</div></BuilderSection>
        </div>
        <aside className={`invite-live-card theme-${theme.toLowerCase().replace(/\s+/g,"-")}`}><small>{template} template</small>{cover ? <img src={cover} alt="Invitation cover preview" /> : <div className="invite-cover-placeholder"><span className="material-icons">celebration</span></div>}<h2>{title || "Invitation title"}</h2><p>{hosts || "Host details"}</p><blockquote>{message}</blockquote>{functions.map(item => <div className="invite-function-summary" key={item.id}><strong>{item.name}</strong><span>{[item.date,item.time].filter(Boolean).join(" · ") || "Date and time"}</span><span>{item.venue || "Venue"}</span>{item.dressCode ? <em>Dress code: {item.dressCode}</em> : null}</div>)}<button disabled>RSVP</button></aside>
      </div>
      {preview ? <div className="invite-preview-modal" role="dialog" aria-modal="true" aria-label="Invitation preview"><button className="invite-preview-close" onClick={() => setPreview(false)} aria-label="Close preview">×</button><div className="invite-preview-sheet"><small>{template} · {theme}</small>{cover ? <img src={cover} alt="" /> : null}<h1>{title}</h1><h3>{hosts}</h3><p>{message}</p>{functions.map(item => <section key={item.id}><h2>{item.name}</h2><p>{item.date} {item.time}</p><p>{item.venue}</p>{item.mapUrl ? <a href={item.mapUrl} target="_blank" rel="noreferrer">View map</a> : null}<p>{item.dressCode}</p></section>)}<p>Gift preference: {giftOption}</p><p>Reminder: {reminder}</p></div></div> : null}
    </main>
    <HomeFooterSection />
  </>;
}

function BuilderSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="invite-builder-section"><header><span>{number}</span><h2>{title}</h2></header>{children}</section>; }
