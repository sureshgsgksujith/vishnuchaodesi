import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { communityApi, type CommunityConversation, type CommunityEvent, type CommunityGroup, type CommunityGroupMember, type CommunityMessage, type CommunityPost } from "../api/communityApi";
import "./groupDetail.css";

const memberTabs = ["Home", "Feed", "Chat", "Events", "Members", "About"] as const;
const adminTabs = ["Manage", "Requests", "Moderation", "Analytics", "Settings"] as const;
const secondaryActions = ["Invite", "Share", "Message Admin", "Mute", "Report"] as const;
type MembershipState = "none" | "pending" | "active";

export default function GroupDetailPage() {
  const { slug = "community-group" } = useParams();
  const [params, setParams] = useSearchParams();
  const [showActions, setShowActions] = useState(false);
  const [membership, setMembership] = useState<MembershipState>("none");
  const [group, setGroup] = useState<CommunityGroup>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [members, setMembers] = useState<CommunityGroupMember[]>([]);
  const [conversations, setConversations] = useState<CommunityConversation[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [error, setError] = useState("");
  const canManage = group?.currentUserRole === "OWNER" || group?.currentUserRole === "ADMIN";
  const groupName = useMemo(() => group?.name || slug.split("-").filter(Boolean).map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ") || "Community Group", [group, slug]);

  useEffect(() => {
    communityApi.groupBySlug(slug).then(async value => {
      setGroup(value); setMembership(value.currentUserRole ? "active" : "none");
      const [postPage, memberPage, eventPage, conversationPage] = await Promise.all([communityApi.posts(value.id), communityApi.groupMembers(value.id), communityApi.events({ pageSize: 20 }), communityApi.conversations()]);
      setPosts(postPage.items); setMembers(memberPage.items); setEvents(eventPage.items); setConversations(conversationPage.items);
      if (conversationPage.items[0]) setMessages((await communityApi.messages(conversationPage.items[0].id)).items);
    }).catch(() => setError("This group is unavailable or private."));
  }, [slug]);

  const visibleTabs = canManage ? [...memberTabs, ...adminTabs] : memberTabs;
  const requestedTab = params.get("tab") || "Home";
  const activeTab = visibleTabs.find(tab => tab.toLowerCase() === requestedTab.toLowerCase()) || "Home";
  function selectTab(tab: string) { setParams(tab === "Home" ? {} : { tab: tab.toLowerCase() }); }
  const primaryAction = membership === "active" ? "Leave" : membership === "pending" ? "Request pending" : "Request to Join";
  async function changeMembership() { if (!group || membership === "pending") return; if (membership === "active") { await communityApi.leaveGroup(group.id); setMembership("none"); } else { const result = await communityApi.joinGroup(group.id) as { status?: string }; setMembership(result.status === "PENDING" ? "pending" : "active"); } }

  return <><UserHomeHeader hideAddAction /><main className="group-detail-page">
    {error ? <p className="community-error">{error}</p> : null}
    <nav className="group-breadcrumb" aria-label="Breadcrumb"><Link to="/community">Groups &amp; Communities</Link><span>›</span><span>{groupName}</span></nav>
    <section className="group-cover" aria-label={`${groupName} cover`}><div className="group-cover-pattern" /></section>
    <section className="group-identity"><div className="group-avatar"><span className="material-icons">groups</span></div>
      <div className="group-title"><span className="group-visibility"><span className="material-icons">{group?.visibility === "PUBLIC" ? "public" : "lock"}</span>{titleCase(group?.visibility || "Public")} group</span><h1>{groupName}</h1><p>{group?.description || "A welcoming place to connect, share and grow together."}</p><small><strong>{Math.max(group?.memberCount || 0, members.length)}</strong> members · {location(group)}</small></div>
      <div className="group-actions"><button className="group-primary-action" disabled={!group || membership === "pending" || group.currentUserRole === "OWNER"} onClick={changeMembership}>{primaryAction}</button><button className="group-icon-action" aria-label="Share group"><span className="material-icons">ios_share</span></button><div className="group-more-wrap"><button className="group-icon-action" aria-label="More group actions" onClick={() => setShowActions(value => !value)}><span className="material-icons">more_horiz</span></button>{showActions ? <div className="group-action-menu">{secondaryActions.map(action => <button key={action} disabled><span className="material-icons">{actionIcon(action)}</span>{action}</button>)}</div> : null}</div></div>
    </section>
    <nav className="group-tabs" aria-label="Group sections">{visibleTabs.map(tab => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => selectTab(tab)}>{tab}</button>)}</nav>
    <section className="group-tab-content"><div className="group-panel">{renderTab(activeTab, group, posts, events, members, conversations, messages)}</div><aside><h3>About this group</h3><p>{group?.description || "Meet neighbours, exchange ideas and take part in local activities."}</p><dl><div><dt><span className="material-icons">location_on</span>Location</dt><dd>{location(group)}</dd></div><div><dt><span className="material-icons">groups</span>Community</dt><dd>{Math.max(group?.memberCount || 0, members.length)} members</dd></div><div><dt><span className="material-icons">translate</span>Language</dt><dd>English, Telugu &amp; Hindi</dd></div></dl><Link className="group-discover-link" to="/community">Discover communities →</Link></aside></section>
  </main><HomeFooterSection /></>;
}

function actionIcon(action: typeof secondaryActions[number]) { return action === "Invite" ? "person_add" : action === "Share" ? "share" : action === "Message Admin" ? "mail" : action === "Mute" ? "notifications_off" : "flag"; }
function tabIcon(tab: string) { if (tab === "Feed") return "dynamic_feed"; if (tab === "Chat") return "forum"; if (tab === "Events") return "event"; if (tab === "Members") return "groups"; if (adminTabs.includes(tab as typeof adminTabs[number])) return "admin_panel_settings"; return "info"; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(); }
function location(group?: CommunityGroup) { return [group?.city, group?.state, group?.country].filter(Boolean).join(", ") || "Online community"; }
function renderTab(tab: string, group: CommunityGroup | undefined, posts: CommunityPost[], events: CommunityEvent[], members: CommunityGroupMember[], conversations: CommunityConversation[], messages: CommunityMessage[]) {
  if (tab === "Feed" || tab === "Home") return <><Heading icon="dynamic_feed" title={tab === "Home" ? "Latest community updates" : "Community feed"} count={`${posts.length} posts`} />{posts.length ? posts.slice(0, tab === "Home" ? 3 : posts.length).map(post => <article className="group-post" key={post.id}><Avatar name={post.authorName} /><div><strong>{post.authorName || "Community member"}</strong><time>{new Date(post.publishedAtUtc || post.createdAtUtc).toLocaleDateString()}</time><h3>{post.title || "Community update"}</h3><p>{post.body}</p><div className="group-post-stats"><span>♡ {post.reactionCount}</span><span>💬 {post.commentCount}</span></div></div></article>) : <Empty icon="dynamic_feed" title="Welcome to the feed" message="Join the group and be the first to share an update." />}</>;
  if (tab === "Events") return <><Heading icon="event" title="Upcoming near this community" />{events.slice(0, 6).map(event => <article className="group-event" key={event.id}><div className="group-date"><b>{new Date(event.startAtUtc).toLocaleDateString(undefined,{day:"2-digit"})}</b><span>{new Date(event.startAtUtc).toLocaleDateString(undefined,{month:"short"})}</span></div><div><h3>{event.title}</h3><p>{new Date(event.startAtUtc).toLocaleString()} · {event.venueName || event.city || "Online"}</p><span className="group-pill">{titleCase(event.eventMode)}</span></div></article>)}</>;
  if (tab === "Members") return <><Heading icon="groups" title="Community members" count={`${members.length} people`} /><div className="group-member-grid">{members.map(member => <article key={member.id}><Avatar name={member.displayName} /><div><h3>{member.displayName || "Community member"}</h3><p>{titleCase(member.role)}</p></div></article>)}</div></>;
  if (tab === "Chat") return <><Heading icon="forum" title="Community conversations" count={`${messages.length} messages`} />{messages.length ? <div className="group-chat-list">{messages.slice().reverse().slice(-8).map(message => <article key={message.id}><Avatar name={message.senderName} /><div><strong>{message.senderName}</strong><p>{message.body}</p><time>{new Date(message.sentAtUtc).toLocaleString()}</time></div></article>)}</div> : <Empty icon="forum" title="Start the conversation" message={group?.currentUserRole ? "Say hello from the Messages section." : "Join this community to chat with its members."} />}<Link className="group-chat-button" to="/community/messages">Open all messages ({conversations.length}) →</Link></>;
  if (tab === "About") return <><Heading icon="info" title={`About ${group?.name || "this community"}`} /><div className="group-about-copy"><p>{group?.description}</p><h3>What you’ll find here</h3><ul><li>Local news, recommendations and helpful conversations</li><li>Family-friendly cultural events and meetups</li><li>A respectful space to connect with neighbours</li></ul></div></>;
  return <Empty icon={tabIcon(tab)} title={tab} message="Management tools are ready for authorized owners and administrators." />;
}
function Heading({icon,title,count}:{icon:string;title:string;count?:string}) { return <div className="group-section-heading"><div><span className="material-icons">{icon}</span><h2>{title}</h2></div>{count ? <span>{count}</span> : null}</div>; }
function Avatar({name}:{name?:string}) { return <div className="group-person-avatar">{name?.charAt(0).toUpperCase() || "C"}</div>; }
function Empty({icon,title,message,link=false}:{icon:string;title:string;message:string;link?:boolean}) { return <div className="group-empty-state"><span className="material-icons">{icon}</span><h2>{title}</h2><p>{message}</p>{link ? <Link to="/community?section=messages">Open messages</Link> : null}</div>; }
