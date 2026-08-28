import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { communityApi, type CommunityGroup } from "../api/communityApi";
import "./groupDetail.css";

const memberTabs = ["Home", "Feed", "Chat", "Events", "Members", "About"] as const;
const adminTabs = ["Manage", "Requests", "Moderation", "Analytics", "Settings"] as const;
const secondaryActions = ["Invite", "Share", "Message Admin", "Mute", "Report"] as const;

type MembershipState = "none" | "pending" | "active";

export default function GroupDetailPage() {
  const { slug = "community-group" } = useParams();
  const [params, setParams] = useSearchParams();
  const [showActions, setShowActions] = useState(false);
  // These values will be supplied by the group-detail API. Management access
  // must never be inferred from a URL, claim label, or hidden frontend control.
  const [membership, setMembership] = useState<MembershipState>("none");
  const [group, setGroup] = useState<CommunityGroup>();
  const [error, setError] = useState("");
  const canManage = group?.currentUserRole === "OWNER" || group?.currentUserRole === "ADMIN";
  const groupName = useMemo(() => group?.name || slug.split("-").filter(Boolean).map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ") || "Community Group", [group, slug]);
  useEffect(() => { communityApi.groupBySlug(slug).then(value => { setGroup(value); setMembership(value.currentUserRole ? "active" : "none"); }).catch(() => setError("This group is unavailable or private.")); }, [slug]);
  const visibleTabs = canManage ? [...memberTabs, ...adminTabs] : memberTabs;
  const requestedTab = params.get("tab") || "Home";
  const activeTab = visibleTabs.find(tab => tab.toLowerCase() === requestedTab.toLowerCase()) || "Home";

  function selectTab(tab: string) {
    setParams(tab === "Home" ? {} : { tab: tab.toLowerCase() });
  }

  const primaryAction = membership === "active" ? "Leave" : membership === "pending" ? "Request pending" : "Request to Join";
  async function changeMembership() { if (!group || membership === "pending") return; if (membership === "active") { await communityApi.leaveGroup(group.id); setMembership("none"); } else { const result = await communityApi.joinGroup(group.id) as { status?: string }; setMembership(result.status === "PENDING" ? "pending" : "active"); } }

  return <>
    <UserHomeHeader hideAddAction />
    <main className="group-detail-page">
      {error ? <p className="community-error">{error}</p> : null}
      <nav className="group-breadcrumb" aria-label="Breadcrumb"><Link to="/community">Groups &amp; Communities</Link><span>›</span><span>{groupName}</span></nav>
      <section className="group-cover" aria-label={`${groupName} cover`}><div className="group-cover-pattern" /></section>
      <section className="group-identity">
        <div className="group-avatar"><span className="material-icons">groups</span></div>
        <div className="group-title"><span className="group-visibility"><span className="material-icons">public</span> Public group</span><h1>{groupName}</h1><p>Group details will appear when this community is published.</p><small><strong>0</strong> members · Community</small></div>
        <div className="group-actions">
          <button className="group-primary-action" disabled={!group || membership === "pending" || group.currentUserRole === "OWNER"} onClick={changeMembership}>{primaryAction}</button>
          <button className="group-icon-action" aria-label="Share group" disabled><span className="material-icons">ios_share</span></button>
          <div className="group-more-wrap"><button className="group-icon-action" aria-label="More group actions" onClick={() => setShowActions(value => !value)}><span className="material-icons">more_horiz</span></button>{showActions ? <div className="group-action-menu">{secondaryActions.map(action => <button key={action} disabled><span className="material-icons">{actionIcon(action)}</span>{action}</button>)}</div> : null}</div>
        </div>
      </section>

      <nav className="group-tabs" aria-label="Group sections">
        {visibleTabs.map(tab => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => selectTab(tab)}>{tab}{tab === "Requests" ? <span>0</span> : null}</button>)}
      </nav>

      <section className="group-tab-content">
        <div className="group-empty-state"><span className="material-icons">{tabIcon(activeTab)}</span><h2>{activeTab}</h2><p>{emptyMessage(activeTab)}</p>{activeTab === "Home" ? <Link to="/community">Discover other communities</Link> : null}</div>
        <aside><h3>About this group</h3><p>Community description, rules, location and member details will appear here.</p><dl><div><dt><span className="material-icons">location_on</span>Location</dt><dd>Not provided</dd></div><div><dt><span className="material-icons">translate</span>Language</dt><dd>Not provided</dd></div></dl><button disabled><span className="material-icons">flag</span> Report group</button></aside>
      </section>
    </main>
    <HomeFooterSection />
  </>;
}

function actionIcon(action: typeof secondaryActions[number]) { return action === "Invite" ? "person_add" : action === "Share" ? "share" : action === "Message Admin" ? "mail" : action === "Mute" ? "notifications_off" : "flag"; }
function tabIcon(tab: string) { if (tab === "Feed") return "dynamic_feed"; if (tab === "Chat") return "forum"; if (tab === "Events") return "event"; if (tab === "Members") return "groups"; if (adminTabs.includes(tab as typeof adminTabs[number])) return "admin_panel_settings"; return "info"; }
function emptyMessage(tab: string) { if (tab === "Feed") return "Posts shared with this group will appear here."; if (tab === "Chat") return "Join the group to participate in group chat."; if (tab === "Events") return "This group has no upcoming events."; if (tab === "Members") return "Member discovery will be available after the group launches."; if (adminTabs.includes(tab as typeof adminTabs[number])) return "Only authorized group owners and administrators can use these tools."; return "This group is not available yet."; }
