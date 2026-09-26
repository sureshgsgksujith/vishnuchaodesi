import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { getCustomerToken } from "../../auth/utils/customerSession";
import { env } from "../../../app/config/env";
import {
  communityApi,
  enterCommunity,
  type CommunityConversation,
  type CommunityEvent,
  type CommunityGroup,
  type CommunityGroupMember,
  type CommunityMessage,
  type CommunityPost,
} from "../api/communityApi";
import "./groupDetail.css";
import "./groupAdmin.css";
import "./groupDetailMobile.css";

function resolveGroupMediaUrl(url: string) {
  if (/^(?:https?:|blob:|data:)/i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;
  return new URL(
    url.startsWith("/") ? url : `/${url}`,
    new URL(apiBase, window.location.origin).origin,
  ).toString();
}

const memberTabs = [
  "Home",
  "Feed",
  "Chat",
  "Events",
  "Members",
  "About",
] as const;
const adminTabs = [
  "Manage",
  "Requests",
  "Moderation",
  "Analytics",
  "Settings",
] as const;
const secondaryActions = [
  "Invite",
  "Share",
  "Message Admin",
  "Mute",
  "Report",
] as const;
type MembershipState = "none" | "pending" | "active";

export default function GroupDetailPage() {
  const { slug = "community-group" } = useParams();
  const [params, setParams] = useSearchParams();
  const [showActions, setShowActions] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteResults, setInviteResults] = useState<import("../api/communityApi").CommunityUserSearchResult[]>([]);
  const [actionNotice, setActionNotice] = useState("");
  const [membership, setMembership] = useState<MembershipState>("none");
  const [group, setGroup] = useState<CommunityGroup>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [members, setMembers] = useState<CommunityGroupMember[]>([]);
  const [conversations, setConversations] = useState<CommunityConversation[]>(
    [],
  );
  const [groupConversation, setGroupConversation] =
    useState<CommunityConversation>();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [error, setError] = useState("");
  const canManage =
    group?.currentUserRole === "OWNER" || group?.currentUserRole === "ADMIN";
  const groupName = useMemo(
    () =>
      group?.name ||
      slug
        .split("-")
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(" ") ||
      "Community Group",
    [group, slug],
  );

  async function shareGroup() {
    const shareData = { title: groupName, text: `Join ${groupName} on ChaoDesi`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); setActionNotice("Group link copied."); }
    } catch (shareError) {
      if ((shareError as DOMException).name !== "AbortError") setActionNotice("Unable to share this group.");
    }
    setShowActions(false);
  }

  function runGroupAction(action: (typeof secondaryActions)[number]) {
    if (action === "Share") return void shareGroup();
    if (action === "Invite" && canManage) { setShowInvite(true); setShowActions(false); }
  }

  useEffect(() => {
    void enterCommunity().then((identity) => setCurrentUserId(identity.id));
    communityApi
      .groupBySlug(slug)
      .then(async (value) => {
        setGroup(value);
        setMembership(value.currentUserRole ? "active" : "none");
        const [postResult, memberResult, eventResult, conversationResult] =
          await Promise.allSettled([
            communityApi.posts(value.id),
            communityApi.groupMembers(value.id),
            communityApi.events({ pageSize: 20 }),
            communityApi.conversations(),
          ]);
        const postPage =
          postResult.status === "fulfilled" ? postResult.value : { items: [] };
        const memberPage =
          memberResult.status === "fulfilled"
            ? memberResult.value
            : { items: [] };
        const eventPage =
          eventResult.status === "fulfilled"
            ? eventResult.value
            : { items: [] };
        const conversationPage =
          conversationResult.status === "fulfilled"
            ? conversationResult.value
            : { items: [] };
        setPosts(postPage.items);
        setMembers(memberPage.items);
        setEvents(eventPage.items);
        setConversations(conversationPage.items);
        const chat = conversationPage.items.find(
          (conversation) =>
            conversation.groupId === value.id &&
            conversation.conversationType === "GROUP",
        );
        setGroupConversation(chat);
        if (chat) setMessages((await communityApi.messages(chat.id)).items);
      })
      .catch(() => setError("This group is unavailable or private."));
  }, [slug]);

  const visibleTabs = canManage ? [...memberTabs, ...adminTabs] : memberTabs;
  const requestedTab = params.get("tab") || "Home";
  const activeTab =
    visibleTabs.find(
      (tab) => tab.toLowerCase() === requestedTab.toLowerCase(),
    ) || "Home";
  function selectTab(tab: string) {
    setParams(tab === "Home" ? {} : { tab: tab.toLowerCase() });
  }
  const primaryAction =
    group?.currentUserRole === "OWNER"
      ? "Group owner"
      : membership === "active"
        ? "Leave group"
        : membership === "pending"
          ? "Request pending"
          : "Request to join";
  async function changeMembership() {
    if (!group || membership === "pending") return;
    if (membership === "active") {
      await communityApi.leaveGroup(group.id);
      setMembership("none");
    } else {
      const result = (await communityApi.joinGroup(group.id)) as {
        status?: string;
      };
      setMembership(result.status === "PENDING" ? "pending" : "active");
    }
  }

  return (
    <>
      <UserHomeHeader hideAddAction />
      <main className="group-detail-page">
        {error ? <p className="community-error">{error}</p> : null}
        <nav className="group-breadcrumb" aria-label="Breadcrumb">
          <Link to="/community">Groups &amp; Communities</Link>
          <span>›</span>
          <span>{groupName}</span>
        </nav>
        <section className="group-cover" aria-label={`${groupName} cover`}>
          <div className="group-cover-pattern" />
          <div className="group-cover-content">
            <span>
              <i className="material-icons">verified</i>ChaoDesi Community
            </span>
            <h2>Connect locally. Belong deeply.</h2>
            <p>
              <span className="material-icons">location_on</span>
              {location(group)}
            </p>
          </div>
        </section>
        <section className="group-identity">
          <div className="group-avatar">
            <span className="material-icons">groups</span>
          </div>
          <div className="group-title">
            <div className="group-labels">
              <span className="group-visibility">
                <span className="material-icons">
                  {group?.visibility === "PUBLIC" ? "public" : "lock"}
                </span>
                {titleCase(group?.visibility || "Public")} group
              </span>
              {group?.currentUserRole && (
                <span className="group-role-badge">
                  <span className="material-icons">verified_user</span>
                  {titleCase(group.currentUserRole)}
                </span>
              )}
            </div>
            <h1>{groupName}</h1>
            <p>
              {group?.description ||
                "A welcoming place to connect, share and grow together."}
            </p>
            <div className="group-meta">
              <span>
                <i className="material-icons">groups</i>
                <strong>
                  {Math.max(group?.memberCount || 0, members.length)}
                </strong>{" "}
                members
              </span>
              <span>
                <i className="material-icons">location_on</i>
                {location(group)}
              </span>
              <span>
                <i className="material-icons">forum</i>
                {posts.length} updates
              </span>
            </div>
          </div>
          <div className="group-actions">
            <button
              className="group-primary-action"
              disabled={
                !group ||
                membership === "pending" ||
                group.currentUserRole === "OWNER"
              }
              onClick={changeMembership}
            >
              <span className="material-icons">
                {group?.currentUserRole === "OWNER" ? "shield" : "group_add"}
              </span>
              {primaryAction}
            </button>
            <button
              className="group-icon-action"
              aria-label="Share group"
              title="Share group"
              onClick={() => void shareGroup()}
            >
              <span className="material-icons">share</span>
            </button>
            <div className="group-more-wrap">
              <button
                className="group-icon-action"
                aria-label="More group actions"
                onClick={() => setShowActions((value) => !value)}
              >
                <span className="material-icons">more_horiz</span>
              </button>
              {showActions ? (
                <div className="group-action-menu">
                  {secondaryActions.map((action) => {
                    const enabled = action === "Share" || (action === "Invite" && canManage);
                    return <button key={action} disabled={!enabled} onClick={() => runGroupAction(action)}>
                      <span className="material-icons">
                        {actionIcon(action)}
                      </span>
                      {action}
                    </button>;
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>
        {actionNotice ? <div className="group-action-notice">{actionNotice}<button onClick={() => setActionNotice("")}>×</button></div> : null}
        {showInvite && group ? (
          <div className="group-edit-modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowInvite(false); }}>
            <div className="group-edit-card group-invite-card">
              <header><div><span className="material-icons">person_add</span><h2>Invite to {group.name}</h2></div><button type="button" onClick={() => setShowInvite(false)}>×</button></header>
              <form onSubmit={async (event) => { event.preventDefault(); if (inviteSearch.trim().length < 2) return; setInviteResults(await communityApi.searchUsers(inviteSearch.trim())); }}>
                <label>Find customer<input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Name, email, mobile or Community ID" /></label>
                <button type="submit">Search</button>
                <div className="group-invite-results">
                  {inviteResults.map((user) => <button type="button" key={user.id} onClick={async () => { try { await communityApi.inviteGroupMember(group.id, user.id); setActionNotice(`Invitation sent to ${user.displayName}.`); setShowInvite(false); setInviteResults([]); setInviteSearch(""); } catch { setActionNotice(`${user.displayName} could not be invited.`); } }}><span><strong>{user.displayName}</strong><small>{user.email || user.phone || "ChaoDesi customer"}</small></span><b>Invite</b></button>)}
                </div>
              </form>
            </div>
          </div>
        ) : null}
        <nav className="group-tabs" aria-label="Group sections">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => selectTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <section className="group-tab-content">
          <div className="group-panel">
            {renderTab(
              activeTab,
              group,
              posts,
              events,
              members,
              conversations,
              groupConversation,
              messages,
              currentUserId,
              setMessages,
              setGroupConversation,
              params.get("action"),
            )}
          </div>
          <aside>
            <h3>About this group</h3>
            <p>
              {group?.description ||
                "Meet neighbours, exchange ideas and take part in local activities."}
            </p>
            <dl>
              <div>
                <dt>
                  <span className="material-icons">location_on</span>Location
                </dt>
                <dd>{location(group)}</dd>
              </div>
              <div>
                <dt>
                  <span className="material-icons">groups</span>Community
                </dt>
                <dd>
                  {Math.max(group?.memberCount || 0, members.length)} members
                </dd>
              </div>
              <div>
                <dt>
                  <span className="material-icons">translate</span>Language
                </dt>
                <dd>English, Telugu &amp; Hindi</dd>
              </div>
            </dl>
            <Link className="group-discover-link" to="/community">
              Discover communities →
            </Link>
          </aside>
        </section>
      </main>
      <HomeFooterSection />
    </>
  );
}

function actionIcon(action: (typeof secondaryActions)[number]) {
  return action === "Invite"
    ? "person_add"
    : action === "Share"
      ? "share"
      : action === "Message Admin"
        ? "mail"
        : action === "Mute"
          ? "notifications_off"
          : "flag";
}
function tabIcon(tab: string) {
  if (tab === "Feed") return "dynamic_feed";
  if (tab === "Chat") return "forum";
  if (tab === "Events") return "event";
  if (tab === "Members") return "groups";
  if (adminTabs.includes(tab as (typeof adminTabs)[number]))
    return "admin_panel_settings";
  return "info";
}
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
function location(group?: CommunityGroup) {
  return (
    [group?.city, group?.state, group?.country].filter(Boolean).join(", ") ||
    "Online community"
  );
}
function renderTab(
  tab: string,
  group: CommunityGroup | undefined,
  posts: CommunityPost[],
  events: CommunityEvent[],
  members: CommunityGroupMember[],
  conversations: CommunityConversation[],
  groupConversation: CommunityConversation | undefined,
  messages: CommunityMessage[],
  currentUserId: number | undefined,
  setMessages: Dispatch<SetStateAction<CommunityMessage[]>>,
  setGroupConversation: (conversation: CommunityConversation) => void,
  initialAction: string | null,
) {
  if (tab === "Feed" || tab === "Home")
    return (
      <>
        <Heading
          icon="dynamic_feed"
          title={tab === "Home" ? "Latest community updates" : "Community feed"}
          count={`${posts.length} posts`}
        />
        {posts.length ? (
          posts.slice(0, tab === "Home" ? 3 : posts.length).map((post) => (
            <article className="group-post" key={post.id}>
              <Avatar name={post.authorName} />
              <div>
                <strong>{post.authorName || "Community member"}</strong>
                <time>
                  {new Date(
                    post.publishedAtUtc || post.createdAtUtc,
                  ).toLocaleDateString()}
                </time>
                <h3>{post.title || "Community update"}</h3>
                <p>{post.body}</p>
                <div className="group-post-stats">
                  <span>♡ {post.reactionCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <Empty
            icon="dynamic_feed"
            title="Welcome to the feed"
            message="Join the group and be the first to share an update."
          />
        )}
      </>
    );
  if (tab === "Events")
    return (
      <>
        <Heading icon="event" title="Upcoming near this community" />
        {events.slice(0, 6).map((event) => (
          <article className="group-event" key={event.id}>
            <div className="group-date">
              <b>
                {new Date(event.startAtUtc).toLocaleDateString(undefined, {
                  day: "2-digit",
                })}
              </b>
              <span>
                {new Date(event.startAtUtc).toLocaleDateString(undefined, {
                  month: "short",
                })}
              </span>
            </div>
            <div>
              <h3>{event.title}</h3>
              <p>
                {new Date(event.startAtUtc).toLocaleString()} ·{" "}
                {event.venueName || event.city || "Online"}
              </p>
              <span className="group-pill">{titleCase(event.eventMode)}</span>
            </div>
          </article>
        ))}
      </>
    );
  if (tab === "Members")
    return (
      <>
        <Heading
          icon="groups"
          title="Community members"
          count={`${members.length} people`}
        />
        <div className="group-member-grid">
          {members.map((member) => (
            <article key={member.id}>
              <Avatar name={member.displayName} />
              <div>
                <h3>{member.displayName || "Community member"}</h3>
                <p>{titleCase(member.role)}</p>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  if (tab === "Chat")
    return (
      <GroupChat
        group={group}
        conversation={groupConversation}
        messages={messages}
        currentUserId={currentUserId}
        conversationCount={conversations.length}
        setMessages={setMessages}
        setConversation={setGroupConversation}
      />
    );
  if (tab === "About")
    return (
      <>
        <Heading
          icon="info"
          title={`About ${group?.name || "this community"}`}
        />
        <div className="group-about-copy">
          <p>{group?.description}</p>
          <h3>What you’ll find here</h3>
          <ul>
            <li>Local news, recommendations and helpful conversations</li>
            <li>Family-friendly cultural events and meetups</li>
            <li>A respectful space to connect with neighbours</li>
          </ul>
        </div>
      </>
    );
  if (group && adminTabs.includes(tab as (typeof adminTabs)[number]))
    return (
      <AdminPanel
        tab={tab}
        group={group}
        members={members}
        initialAction={initialAction}
      />
    );
  return (
    <Empty
      icon={tabIcon(tab)}
      title={tab}
      message="This section is available to group administrators."
    />
  );
}
function GroupChat({
  group,
  conversation,
  messages,
  currentUserId,
  conversationCount,
  setMessages,
  setConversation,
}: {
  group?: CommunityGroup;
  conversation?: CommunityConversation;
  messages: CommunityMessage[];
  currentUserId?: number;
  conversationCount: number;
  setMessages: Dispatch<SetStateAction<CommunityMessage[]>>;
  setConversation: (conversation: CommunityConversation) => void;
}) {
  const [body, setBody] = useState(""),
    [sending, setSending] = useState(false),
    [joining, setJoining] = useState(false),
    [chatError, setChatError] = useState(""),
    [chatNotice, setChatNotice] = useState(""),
    [replyTo, setReplyTo] = useState<CommunityMessage>(),
    [editing, setEditing] = useState<CommunityMessage>(),
    [deleting, setDeleting] = useState<CommunityMessage>(),
    [editMinutes, setEditMinutes] = useState(10),
    [deleteMinutes, setDeleteMinutes] = useState(10);
  const isMember = Boolean(group?.currentUserRole),
    canManage =
      group?.currentUserRole === "OWNER" || group?.currentUserRole === "ADMIN";
  useEffect(() => {
    if (!conversation || !isMember) return;
    let active = true;
    let fallbackTimer: number | undefined;
    const refresh = async () => {
      try {
        const latest = (await communityApi.messages(conversation.id)).items;
        if (!active) return;
        setMessages((current) => {
          const currentIds = current.map((message) => message.id).join(",");
          const latestIds = latest.map((message) => message.id).join(",");
          return currentIds === latestIds ? current : latest;
        });
      } catch {
        // Retry while SignalR is disconnected.
      }
    };
    const stopFallback = () => {
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    };
    const startFallback = () => {
      if (fallbackTimer !== undefined) return;
      void refresh();
      fallbackTimer = window.setInterval(() => void refresh(), 15000);
    };
    const apiBase = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiBase.replace(/\/api\/?$/i, "")}/hubs/community`, {
        accessTokenFactory: () => getCustomerToken() || "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();
    connection.on("message", (message: CommunityMessage) => {
      if (message.conversationId !== conversation.id) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [message, ...current],
      );
    });
    connection.on(
      "messageEdited",
      (change: {
        id: number;
        conversationId: number;
        body: string;
        editedAtUtc: string;
      }) => {
        if (change.conversationId !== conversation.id) return;
        setMessages((current) =>
          current.map((message) =>
            message.id === change.id
              ? {
                  ...message,
                  body: change.body,
                  editedAtUtc: change.editedAtUtc,
                }
              : message,
          ),
        );
      },
    );
    connection.on(
      "messageDeleted",
      (change: { id: number; conversationId: number }) => {
        if (change.conversationId === conversation.id)
          setMessages((current) =>
            current.filter((message) => message.id !== change.id),
          );
      },
    );
    connection.onreconnecting(startFallback);
    connection.onreconnected(() => {
      void refresh();
      return connection
        .invoke("JoinConversation", conversation.id)
        .then(stopFallback)
        .catch(startFallback);
    });
    connection.onclose(startFallback);
    void connection
      .start()
      .then(() => connection.invoke("JoinConversation", conversation.id))
      .then(() => {
        stopFallback();
        return refresh();
      })
      .catch(startFallback);
    return () => {
      active = false;
      stopFallback();
      void connection
        .invoke("LeaveConversation", conversation.id)
        .catch(() => undefined)
        .finally(() => connection.stop());
    };
  }, [conversation?.id, isMember, setMessages]);
  useEffect(() => {
    void communityApi.messagingSettings().then((settings) => {
      setEditMinutes(settings.messageEditMinutes);
      setDeleteMinutes(settings.messageDeleteMinutes);
    });
  }, []);
  async function createChat() {
    if (!group) return;
    setChatError("");
    try {
      const created = await communityApi.createGroupConversation(
        group.id,
        `${group.name} Chat`,
      );
      setConversation({
        id: created.id,
        conversationType: "GROUP",
        status: "ACTIVE",
        title: `${group.name} Chat`,
        groupId: group.id,
        unreadCount: 0,
        canAccept: false,
        canSendMessages: true,
      });
    } catch {
      setChatError("Unable to create group chat.");
    }
  }
  async function send() {
    if (!conversation || !body.trim()) return;
    setSending(true);
    setChatError("");
    try {
      if (editing) {
        await communityApi.editMessage(editing.id, body.trim());
        setMessages((current) =>
          current.map((message) =>
            message.id === editing.id
              ? {
                  ...message,
                  body: body.trim(),
                  editedAtUtc: new Date().toISOString(),
                }
              : message,
          ),
        );
      } else {
        const sent = await communityApi.sendMessage(
          conversation.id,
          body.trim(),
          replyTo?.id,
        );
        setMessages((current) => [
          sent,
          ...current.filter((message) => message.id !== sent.id),
        ]);
      }
      setBody("");
      setReplyTo(undefined);
      setEditing(undefined);
    } catch {
      setChatError("Unable to send this message.");
    } finally {
      setSending(false);
    }
  }
  async function joinToChat() {
    if (!group || joining) return;
    setJoining(true);
    setChatError("");
    setChatNotice("");
    try {
      const result = (await communityApi.joinGroup(group.id)) as {
        status?: string;
      };
      if (result.status === "PENDING") {
        setChatNotice(
          "Your request was sent. You can chat after the owner approves it.",
        );
      } else {
        window.location.reload();
      }
    } catch {
      setChatError("Unable to join this group right now.");
    } finally {
      setJoining(false);
    }
  }
  return (
    <>
      <Heading
        icon="forum"
        title={conversation?.title || "Group chat"}
        count={`${messages.length} messages`}
      />
      {messages.length ? (
        <div className="group-chat-list">
          {messages
            .slice()
            .reverse()
            .slice(-50)
            .map((message) => {
              const mine = message.senderUserId === currentUserId;
              const quoted = message.replyToMessageId
                ? messages.find((item) => item.id === message.replyToMessageId)
                : undefined;
              const canEdit =
                mine &&
                Date.now() <=
                  new Date(message.sentAtUtc).getTime() + editMinutes * 60000;
              const canDelete =
                mine &&
                Date.now() <=
                  new Date(message.sentAtUtc).getTime() + deleteMinutes * 60000;
              return (
                <article
                  className={mine ? "is-mine" : "is-other"}
                  key={message.id}
                >
                  {!mine ? <Avatar name={message.senderName} /> : null}
                  <div>
                    <strong>{mine ? "You" : message.senderName}</strong>
                    {quoted ? (
                      <blockquote>
                        <b>
                          {quoted.senderUserId === currentUserId
                            ? "You"
                            : quoted.senderName}
                        </b>
                        {quoted.body}
                      </blockquote>
                    ) : null}
                    <p>{message.body}</p>
                    <footer className="group-message-footer">
                      <time>
                        {new Date(message.sentAtUtc).toLocaleString()}
                        {message.editedAtUtc ? " · edited" : ""}
                      </time>
                      <span className="group-message-actions">
                        <button
                          type="button"
                          title="Reply"
                          onClick={() => {
                            setEditing(undefined);
                            setBody("");
                            setReplyTo(message);
                          }}
                        >
                          <span className="material-icons">reply</span>
                        </button>
                        {mine ? (
                          <>
                            <button
                              type="button"
                              title={
                                canEdit
                                  ? "Edit"
                                  : `Edit time expired (${editMinutes} minutes)`
                              }
                              disabled={!canEdit}
                              onClick={() => {
                                setReplyTo(undefined);
                                setEditing(message);
                                setBody(message.body || "");
                              }}
                            >
                              <span className="material-icons">edit</span>
                            </button>
                            <button
                              type="button"
                              title={
                                canDelete
                                  ? "Delete"
                                  : `Delete time expired (${deleteMinutes} minutes)`
                              }
                              disabled={!canDelete}
                              onClick={() => setDeleting(message)}
                            >
                              <span className="material-icons">delete</span>
                            </button>
                          </>
                        ) : null}
                      </span>
                    </footer>
                  </div>
                </article>
              );
            })}
        </div>
      ) : (
        <Empty
          icon="forum"
          title={
            conversation ? "Start the conversation" : "Group chat is not ready"
          }
          message={
            !isMember
              ? "Join this community to chat with its members."
              : conversation
                ? "Send the first message to your group."
                : canManage
                  ? "Create a chat room for your members."
                  : "Ask a group owner to create the chat room."
          }
        />
      )}{" "}
      {!isMember && group ? (
        <button
          className="group-chat-button group-chat-join"
          disabled={joining}
          onClick={() => void joinToChat()}
        >
          <span className="material-icons">group_add</span>
          {joining
            ? "Joining…"
            : group.visibility === "PRIVATE"
              ? "Request to join and chat"
              : "Join group to chat"}
        </button>
      ) : null}
      {isMember && conversation ? (
        <>
          {replyTo || editing ? (
            <div className="group-composer-context">
              <span className="material-icons">
                {editing ? "edit" : "reply"}
              </span>
              <div>
                <b>
                  {editing
                    ? "Editing message"
                    : `Replying to ${replyTo?.senderUserId === currentUserId ? "yourself" : replyTo?.senderName}`}
                </b>
                <span>{editing?.body || replyTo?.body}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplyTo(undefined);
                  setEditing(undefined);
                  setBody("");
                }}
              >
                ×
              </button>
            </div>
          ) : null}
          <form
            className="group-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                editing
                  ? "Update your message"
                  : replyTo
                    ? "Write your reply"
                    : "Write a message to the group"
              }
              maxLength={4000}
            />
            <button disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </>
      ) : null}
      {isMember && !conversation && canManage ? (
        <button className="group-chat-button" onClick={() => void createChat()}>
          Create group chat
        </button>
      ) : null}
      {chatError ? <p className="community-error">{chatError}</p> : null}
      {chatNotice ? <p className="group-chat-notice">{chatNotice}</p> : null}
      {deleting ? (
        <div
          className="group-message-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleting(undefined);
          }}
        >
          <div>
            <span className="material-icons">delete</span>
            <h3>Delete message?</h3>
            <p>This message will be removed for everyone in the group.</p>
            <footer>
              <button
                className="secondary"
                onClick={() => setDeleting(undefined)}
              >
                Keep message
              </button>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await communityApi.deleteMessage(deleting.id);
                    setMessages((current) =>
                      current.filter((message) => message.id !== deleting.id),
                    );
                    setDeleting(undefined);
                  } catch {
                    setDeleting(undefined);
                    setChatError("This message can no longer be deleted.");
                  }
                }}
              >
                Delete for everyone
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      <Link className="group-chat-button" to="/community/messages">
        Open all messages ({conversationCount}) →
      </Link>
    </>
  );
}
function AdminPanel({
  tab,
  group,
  members,
  initialAction,
}: {
  tab: string;
  group: CommunityGroup;
  members: CommunityGroupMember[];
  initialAction: string | null;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [notice, setNotice] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(
    group.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
  );
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showArchiveGroup, setShowArchiveGroup] = useState(false);
  const [chatPermission, setChatPermission] = useState<"ALL_MEMBERS" | "ADMINS_ONLY">("ALL_MEMBERS");
  const [savingChatPermission, setSavingChatPermission] = useState(false);
  useEffect(() => {
    void communityApi.groupChatPermission(group.id).then((result) => setChatPermission(result.mode)).catch(() => undefined);
  }, [group.id]);
  useEffect(() => {
    if (group.currentUserRole !== "OWNER") return;
    if (initialAction === "edit") setShowGroupEdit(true);
    if (initialAction === "archive") setShowArchiveGroup(true);
  }, [group.currentUserRole, initialAction]);
  const load = () => {
    if (tab === "Requests")
      return communityApi
        .groupRequests(group.id)
        .then((page) => setRows(page.items));
    if (tab === "Moderation")
      return communityApi.reports().then((page) => setRows(page.items));
    if (tab === "Analytics") return communityApi.analytics().then(setRows);
    setRows([]);
    return Promise.resolve();
  };
  useEffect(() => {
    void load();
  }, [tab, group.id]);
  if (tab === "Manage")
    return (
      <>
        <Heading
          icon="manage_accounts"
          title="Manage members"
          count={`${members.length} active`}
        />
        <div className="group-admin-list">
          {members.map((member) => (
            <article key={member.id}>
              <Avatar name={member.displayName} />
              <div>
                <strong>{member.displayName}</strong>
                <small>{titleCase(member.role)}</small>
              </div>
              {member.role !== "OWNER" && (
                <div>
                  <select
                    value={member.role}
                    onChange={async (e) => {
                      await communityApi.setMemberRole(
                        group.id,
                        member.userId,
                        e.target.value,
                      );
                      setNotice("Member role updated.");
                    }}
                  >
                    <option>MEMBER</option>
                    <option>MODERATOR</option>
                    <option>ADMIN</option>
                  </select>
                  <button
                    onClick={async () => {
                      await communityApi.removeMember(group.id, member.userId);
                      setNotice("Member removed.");
                    }}
                  >
                    Remove
                  </button>
                  <button
                    className="danger"
                    onClick={async () => {
                      await communityApi.banMember(
                        group.id,
                        member.userId,
                        "Group guidelines violation",
                      );
                      setNotice("Member banned.");
                    }}
                  >
                    Ban
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        {notice && <p className="group-admin-notice">{notice}</p>}
      </>
    );
  if (tab === "Requests")
    return (
      <>
        <Heading
          icon="person_add"
          title="Join requests"
          count={`${rows.length} requests`}
        />
        <div className="group-admin-list">
          {rows.map((row, index) => (
            <article key={String(row.id ?? index)}>
              <Avatar name={String(row.displayName || "Member")} />
              <div>
                <strong>{String(row.displayName || "Community member")}</strong>
                <small>{String(row.status || "PENDING")}</small>
              </div>
              {row.status === "PENDING" && (
                <div>
                  <button
                    onClick={async () => {
                      await communityApi.reviewGroupRequest(
                        group.id,
                        Number(row.id),
                        "approve",
                      );
                      await load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="danger"
                    onClick={async () => {
                      await communityApi.reviewGroupRequest(
                        group.id,
                        Number(row.id),
                        "reject",
                      );
                      await load();
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}
            </article>
          ))}
          {!rows.length && (
            <Empty
              icon="how_to_reg"
              title="No pending requests"
              message="New membership requests will appear here."
            />
          )}
        </div>
      </>
    );
  if (tab === "Moderation")
    return (
      <>
        <Heading
          icon="gavel"
          title="Safety reports"
          count={`${rows.length} submitted`}
        />
        <div className="group-admin-list">
          {rows.map((row, index) => (
            <article key={String(row.id ?? index)}>
              <span className="material-icons">flag</span>
              <div>
                <strong>{String(row.reasonCode || "Report")}</strong>
                <small>
                  {String(row.targetType || "")} #{String(row.targetId || "")} ·{" "}
                  {String(row.status || "OPEN")}
                </small>
              </div>
            </article>
          ))}
          {!rows.length && (
            <Empty
              icon="verified_user"
              title="Community is healthy"
              message="No safety reports have been submitted."
            />
          )}
        </div>
      </>
    );
  if (tab === "Analytics") {
    const total = rows.reduce(
      (sum, row) => sum + Number(row.metricValue || 0),
      0,
    );
    return (
      <>
        <Heading
          icon="insights"
          title="Community analytics"
          count="Last 30 days"
        />
        <div className="group-analytics">
          <article>
            <strong>{members.length}</strong>
            <span>Active members</span>
          </article>
          <article>
            <strong>{total}</strong>
            <span>Recorded activity</span>
          </article>
          <article>
            <strong>{rows.length}</strong>
            <span>Metric signals</span>
          </article>
        </div>
      </>
    );
  }
  async function saveVisibility() {
    setSavingVisibility(true);
    setNotice("");
    try {
      await communityApi.setGroupVisibility(group.id, visibility);
      setNotice(`Group is now ${visibility.toLowerCase()}.`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setNotice("Only the group owner can change group visibility.");
    } finally {
      setSavingVisibility(false);
    }
  }
  async function saveChatPermission(mode: "ALL_MEMBERS" | "ADMINS_ONLY") {
    setSavingChatPermission(true);
    setNotice("");
    try {
      const result = await communityApi.setGroupChatPermission(group.id, mode);
      setChatPermission(result.mode);
      setNotice(result.mode === "ADMINS_ONLY" ? "Only admins can post in group chat now." : "All group members can post in chat now.");
    } catch {
      setNotice("Unable to change group chat permission.");
    } finally {
      setSavingChatPermission(false);
    }
  }
  async function editGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (group.currentUserRole !== "OWNER") return;
    const form = new FormData(event.currentTarget);
    setSavingVisibility(true);
    setNotice("");
    try {
      const avatarFile = form.get("avatarFile") as File | null;
      const coverFile = form.get("coverFile") as File | null;
      let avatarUrl = group.avatarUrl;
      let coverUrl = group.coverUrl;
      if (avatarFile?.size)
        avatarUrl = (await communityApi.uploadMedia(avatarFile, "GroupAvatar")).url;
      if (coverFile?.size)
        coverUrl = (await communityApi.uploadMedia(coverFile, "GroupCover")).url;
      const updated = await communityApi.updateGroup(group.id, {
        name: form.get("name"),
        description: form.get("description"),
        visibility: form.get("visibility"),
        country: form.get("country"),
        state: form.get("state"),
        city: form.get("city"),
        postalCode: form.get("postalCode"),
        languageCode: form.get("languageCode"),
        rules: form.get("rules"),
        avatarUrl,
        coverUrl,
      });
      setShowGroupEdit(false);
      setNotice("Group details updated.");
      window.setTimeout(() => {
        window.location.href = `/community/groups/${updated.slug}?tab=manage`;
      }, 500);
    } catch {
      setNotice("Unable to update group details.");
    } finally {
      setSavingVisibility(false);
    }
  }
  async function archiveGroup() {
    if (group.currentUserRole !== "OWNER") return;
    setSavingVisibility(true);
    setNotice("");
    try {
      await communityApi.archiveGroup(group.id);
      window.location.href = "/community/groups";
    } catch {
      setNotice("Unable to archive this group.");
      setSavingVisibility(false);
    }
  }
  return (
    <>
      <Heading icon="settings" title="Group settings" />
      <div className="group-visibility-setting">
        <div className="group-setting-title">
          <span className="material-icons">visibility</span>
          <div>
            <h3>Group visibility</h3>
            <p>Control how customers discover and join this group.</p>
          </div>
        </div>
        <div className="group-visibility-options">
          <button
            type="button"
            className={visibility === "PUBLIC" ? "selected" : ""}
            onClick={() => setVisibility("PUBLIC")}
            disabled={group.currentUserRole !== "OWNER"}
          >
            <span className="material-icons">public</span>
            <div>
              <strong>Public group</strong>
              <small>Everyone can find the group and join immediately.</small>
            </div>
            <span className="material-icons check">check_circle</span>
          </button>
          <button
            type="button"
            className={visibility === "PRIVATE" ? "selected" : ""}
            onClick={() => setVisibility("PRIVATE")}
            disabled={group.currentUserRole !== "OWNER"}
          >
            <span className="material-icons">lock</span>
            <div>
              <strong>Private group</strong>
              <small>
                Everyone can find it, but the owner must approve requests.
              </small>
            </div>
            <span className="material-icons check">check_circle</span>
          </button>
        </div>
        <button
          className="group-setting-save"
          disabled={
            savingVisibility ||
            group.currentUserRole !== "OWNER" ||
            visibility === group.visibility
          }
          onClick={() => void saveVisibility()}
        >
          {savingVisibility ? "Saving…" : "Save visibility"}
        </button>
        {notice ? <p className="group-admin-notice">{notice}</p> : null}
      </div>
      <div className="group-visibility-setting group-chat-permission-setting">
        <div className="group-setting-title">
          <span className="material-icons">forum</span>
          <div><h3>Who can post in group chat?</h3><p>Choose whether every member or only group managers can send messages.</p></div>
        </div>
        <div className="group-visibility-options">
          <button type="button" className={chatPermission === "ALL_MEMBERS" ? "selected" : ""} disabled={savingChatPermission} onClick={() => void saveChatPermission("ALL_MEMBERS")}>
            <span className="material-icons">groups</span><div><strong>All members</strong><small>Every active group member can post and reply.</small></div><span className="material-icons check">check_circle</span>
          </button>
          <button type="button" className={chatPermission === "ADMINS_ONLY" ? "selected" : ""} disabled={savingChatPermission} onClick={() => void saveChatPermission("ADMINS_ONLY")}>
            <span className="material-icons">campaign</span><div><strong>Admins only</strong><small>Only owner, admins and moderators can post.</small></div><span className="material-icons check">check_circle</span>
          </button>
        </div>
      </div>
      <div className="group-settings-summary">
        <p>
          <b>Location:</b> {location(group)}
        </p>
        <p>
          <b>Status:</b> {titleCase(group.status)}
        </p>
        <p>
          {group.currentUserRole === "OWNER"
            ? "You control this group as its owner."
            : "Visibility can only be changed by the group owner."}
        </p>
        {group.currentUserRole === "OWNER" ? (
          <div className="group-setting-management">
            <button
              onClick={() => setShowGroupEdit(true)}
              disabled={savingVisibility}
            >
              <span className="material-icons">edit</span>Edit group details
            </button>
            <button
              className="danger"
              onClick={() => setShowArchiveGroup(true)}
              disabled={savingVisibility}
            >
              <span className="material-icons">archive</span>Archive group
            </button>
          </div>
        ) : null}
      </div>
      {showGroupEdit ? (
        <div
          className="group-edit-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowGroupEdit(false);
          }}
        >
          <div className="group-edit-card">
            <header>
              <div>
                <span className="material-icons">edit</span>
                <h2>Edit group</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowGroupEdit(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={editGroup}>
              <label>
                Group name
                <input
                  name="name"
                  required
                  minLength={3}
                  defaultValue={group.name}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={group.description || ""}
                />
              </label>
              <div>
                <label>
                  Visibility
                  <select name="visibility" defaultValue={visibility}>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                    <option value="INVITE_ONLY">Invite only</option>
                  </select>
                </label>
                <label>
                  Language code
                  <input name="languageCode" placeholder="en" defaultValue={group.languageCode || "en"} />
                </label>
              </div>
              <div>
                <label>
                  Country
                  <input name="country" defaultValue={group.country || ""} />
                </label>
                <label>
                  State
                  <input name="state" defaultValue={group.state || ""} />
                </label>
              </div>
              <div>
                <label>
                  City
                  <input name="city" defaultValue={group.city || ""} />
                </label>
                <label>
                  Postal code
                  <input name="postalCode" defaultValue={group.postalCode || ""} />
                </label>
              </div>
              <div>
                <label className="group-image-upload">
                  Group avatar
                  {group.avatarUrl ? <img src={resolveGroupMediaUrl(group.avatarUrl)} alt="Current group avatar" /> : <span className="material-icons">group</span>}
                  <input name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" />
                  <small>Square JPG, PNG or WebP · maximum 15 MB</small>
                </label>
                <label className="group-image-upload group-cover-upload">
                  Cover image
                  {group.coverUrl ? <img src={resolveGroupMediaUrl(group.coverUrl)} alt="Current group cover" /> : <span className="material-icons">panorama</span>}
                  <input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" />
                  <small>Wide JPG, PNG or WebP · maximum 15 MB</small>
                </label>
              </div>
              <label>
                Group rules
                <textarea name="rules" defaultValue={group.rules || ""} />
              </label>
              <footer>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowGroupEdit(false)}
                >
                  Cancel
                </button>
                <button disabled={savingVisibility}>
                  {savingVisibility ? "Saving…" : "Save group"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
      {showArchiveGroup ? (
        <div
          className="group-edit-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setShowArchiveGroup(false);
          }}
        >
          <div className="group-edit-card group-confirm-card">
            <header>
              <div>
                <span className="material-icons">warning</span>
                <h2>Archive group</h2>
              </div>
              <button type="button" onClick={() => setShowArchiveGroup(false)}>
                ×
              </button>
            </header>
            <div className="group-confirm-body">
              <p>
                This group will disappear from discovery and customers will no
                longer be able to join it.
              </p>
              <footer>
                <button
                  className="secondary"
                  onClick={() => setShowArchiveGroup(false)}
                >
                  Cancel
                </button>
                <button
                  className="danger"
                  disabled={savingVisibility}
                  onClick={async () => {
                    setShowArchiveGroup(false);
                    await archiveGroup();
                  }}
                >
                  {savingVisibility ? "Archiving…" : "Archive group"}
                </button>
              </footer>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
function Heading({
  icon,
  title,
  count,
}: {
  icon: string;
  title: string;
  count?: string;
}) {
  return (
    <div className="group-section-heading">
      <div>
        <span className="material-icons">{icon}</span>
        <h2>{title}</h2>
      </div>
      {count ? <span>{count}</span> : null}
    </div>
  );
}
function Avatar({ name }: { name?: string }) {
  return (
    <div className="group-person-avatar">
      {name?.charAt(0).toUpperCase() || "C"}
    </div>
  );
}
function Empty({
  icon,
  title,
  message,
  link = false,
}: {
  icon: string;
  title: string;
  message: string;
  link?: boolean;
}) {
  return (
    <div className="group-empty-state">
      <span className="material-icons">{icon}</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {link ? (
        <Link to="/community?section=messages">Open messages</Link>
      ) : null}
    </div>
  );
}
