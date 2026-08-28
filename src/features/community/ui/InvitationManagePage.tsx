import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { communityApi, type CommunityInvitationDetail } from "../api/communityApi";
import "./communityPortal.css";

export default function InvitationManagePage() {
  const id = Number(useParams().id);
  const [invitation, setInvitation] = useState<CommunityInvitationDetail>();
  const [guests, setGuests] = useState<Record<string, unknown>[]>([]);
  const [guestToken, setGuestToken] = useState("");
  const [message, setMessage] = useState("");
  async function load() { const [detail, list] = await Promise.all([communityApi.invitation(id), communityApi.invitationGuests(id)]); setInvitation(detail); setGuests(list.items); }
  useEffect(() => { if (id) void load(); }, [id]);
  async function addGuest(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await communityApi.addInvitationGuest(id, { name: form.get("name"), email: form.get("email") || undefined, phone: form.get("phone") || undefined, householdName: form.get("householdName") || undefined, householdSize: Number(form.get("householdSize")), allowedPlusOnes: Number(form.get("plusOnes")), functionIds: invitation?.functions.map(item => item.id) || [] }); setGuestToken(result.guestToken); event.currentTarget.reset(); await load(); }
  async function remind(guestId?: number) { await communityApi.scheduleInvitationReminder(id, { guestId, channel: "IN_APP", scheduledAtUtc: new Date(Date.now() + 60000).toISOString() }); setMessage("Reminder scheduled."); }
  return <><UserHomeHeader hideAddAction/><main className="community-portal"><header><div><span>Invitation operations</span><h1>{invitation?.title || "Invitation"}</h1></div><Link to="/community/invitations">Back</Link></header><section className="community-workspace"><h2>Functions</h2><div className="community-cards">{invitation?.functions.map(item=><article key={item.id}><h3>{item.name}</h3><p>{new Date(item.startAtUtc).toLocaleString()} · {item.venueName || "Venue pending"}</p></article>)}</div><h2>Guest list</h2><form className="community-form" onSubmit={addGuest}><input name="name" required placeholder="Guest name"/><input name="email" type="email" placeholder="Email"/><input name="phone" placeholder="Phone"/><input name="householdName" placeholder="Household name"/><input name="householdSize" type="number" min="1" defaultValue="1"/><input name="plusOnes" type="number" min="0" defaultValue="0"/><button>Add guest</button></form>{guestToken&&<p className="community-state">Guest token (share securely): <code>{guestToken}</code></p>}<div className="community-cards">{guests.map((guest,index)=><article key={String(guest.id ?? index)}><h3>{String(guest.name)}</h3><p>{String(guest.rsvpStatus)} · {String(guest.attendingCount)} attending</p><button onClick={()=>remind(Number(guest.id))}>Schedule reminder</button></article>)}</div><button className="community-primary" onClick={()=>remind()}>Remind all guests</button>{message&&<p>{message}</p>}</section></main><HomeFooterSection/></>;
}
