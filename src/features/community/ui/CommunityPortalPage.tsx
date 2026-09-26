import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import {
  communityApi,
  discoverCommunityWithFallback,
  enterCommunity,
  type CommunityConversation,
  type CommunityComment,
  type CommunityUserSearchResult,
  type CommunityEvent,
  type CommunityGroup,
  type CommunityGroupMember,
  type CommunityMessage,
  type CommunityPost,
} from "../api/communityApi";
import "./commentThread.css";
import "./profilePrivacy.css";
import "./communityFriends.css";
import { getCustomerToken } from "../../auth/utils/customerSession";
import { env } from "../../../app/config/env";
import {
  useHomeSelectedLocation,
  type HomeSelectedLocation,
} from "../../home/hooks/useHomeSelectedLocation";
import {
  getLocationCities,
  getLocationCountries,
  getLocationStates,
  type CityOption,
  type CountryOption,
  type StateOption,
} from "../../../shared/api/locationMastersApi";
import "./communityPortal.css";
import "./communityGroupsTabs.css";
import "./communityFeedPolish.css";
import "./communityMessages.css";

function resolveCommunityMediaUrl(url?: string) {
  if (!url) return "";
  if (/^(?:https?:|blob:|data:)/i.test(url)) return url;

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;
    const apiOrigin = new URL(apiBase, window.location.origin).origin;
    return new URL(url.startsWith("/") ? url : `/${url}`, apiOrigin).toString();
  } catch {
    return url;
  }
}
import "./communityPortalMobile.css";
import CommunityEventCards from "./CommunityEventCards";
import CommunityGiftDashboard from "./CommunityGiftDashboard";
import GiftFulfillment from "./GiftFulfillment";
import CommunityCallControls from "./CommunityCallControls";

const nav = [
  ["discover", "Discover"],
  ["groups", "My Groups"],
  ["feed", "Feed"],
  ["friends", "My Friends"],
  ["messages", "Messages"],
  ["events", "Events"],
  ["invitations", "Invitations"],
  ["gifts", "Gifts"],
  ["notifications", "Notifications"],
  ["profile", "Profile"],
];
const portalDemoNotifications: Record<string, unknown>[] = [
  {
    id: "welcome",
    isRead: true,
    notificationType: "WELCOME",
    title: "Welcome to your ChaoDesi community",
    body: "Your community profile is ready. Discover groups and introduce yourself.",
  },
  {
    id: "events",
    isRead: true,
    notificationType: "EVENTS",
    title: "Three community events are coming up",
    body: "Open Events to review details and RSVP for local celebrations.",
  },
  {
    id: "groups",
    isRead: true,
    notificationType: "GROUP_UPDATE",
    title: "New updates from your communities",
    body: "Catch up on conversations, recommendations and neighborhood news.",
  },
];
export default function CommunityPortalPage() {
  const { section = "discover" } = useParams();
  return (
    <>
      <UserHomeHeader hideAddAction />
      <main className="community-portal">
        <header>
          <div>
            <span>ChaoDesi Groups &amp; Communities</span>
            <h1>
              {nav.find((x) => x[0] === section)?.[1] || "Groups & Communities"}
            </h1>
          </div>
          <Link to="/community">Groups &amp; Communities home</Link>
        </header>
        <nav>
          {nav.map(([key, label]) => (
            <Link
              className={section === key ? "active" : ""}
              key={key}
              to={`/community/${key}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <CommunitySection section={section} />
      </main>
      <HomeFooterSection />
    </>
  );
}

function CommunitySection({ section }: { section: string }) {
  const { activeCity, activeLocation, activeLocationLabel } =
    useHomeSelectedLocation();
  const locationParams = {
    city: activeLocation.cityName || undefined,
    state: activeLocation.stateName || undefined,
    country: activeLocation.countryName || undefined,
  };
  const [groups, setGroups] = useState<CommunityGroup[]>([]),
    [posts, setPosts] = useState<CommunityPost[]>([]),
    [events, setEvents] = useState<CommunityEvent[]>([]);
  const [conversations, setConversations] = useState<CommunityConversation[]>(
      [],
    ),
    [messages, setMessages] = useState<CommunityMessage[]>([]),
    [selected, setSelected] = useState<number>();
  const [contacts, setContacts] = useState<CommunityGroupMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [replyTo, setReplyTo] = useState<CommunityMessage>();
  const [editingMessage, setEditingMessage] = useState<CommunityMessage>();
  const [messageEditMinutes, setMessageEditMinutes] = useState(10);
  const [messageDeleteMinutes, setMessageDeleteMinutes] = useState(10);
  const [messageActionNotice, setMessageActionNotice] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      if (section === "discover") {
        const x = await discoverCommunityWithFallback(locationParams);
        setEvents(x.events);
        if (x.groups.length) setGroups(x.groups);
        else
          setGroups(
            (await communityApi.groups({ pageSize: 100, ...locationParams }))
              .items,
          );
      } else if (section === "groups") {
        const x = await communityApi.groups({ pageSize: 100 });
        setGroups(x.items);
      } else if (section === "feed") {
        const me = await enterCommunity();
        setCurrentUserId(me.id);
        let x = await communityApi.groups({ pageSize: 100, ...locationParams });
        if (!x.items.length) x = await communityApi.groups({ pageSize: 100 });
        setGroups(x.items);
        const results = await Promise.allSettled(
          x.items.map((group) => communityApi.posts(group.id)),
        );
        setPosts(
          results
            .flatMap((result) =>
              result.status === "fulfilled" ? result.value.items : [],
            )
            .filter(
              (post, index, list) =>
                list.findIndex((item) => item.id === post.id) === index,
            )
            .sort(
              (a, b) =>
                new Date(b.createdAtUtc).getTime() -
                new Date(a.createdAtUtc).getTime(),
            ),
        );
      } else if (section === "messages" || section === "friends") {
        const conversationPage = await communityApi.conversations();
        setConversations(conversationPage.items);
        if (section === "friends") return;
        try {
          const groupPage = await communityApi.groups({ pageSize: 100 }),
            me = await enterCommunity();
          setCurrentUserId(me.id);
          const memberResults = await Promise.allSettled(
            groupPage.items
              .filter((group) => group.currentUserRole)
              .map((group) => communityApi.groupMembers(group.id)),
          );
          const unique = new Map<number, CommunityGroupMember>();
          memberResults.forEach((result) => {
            if (result.status === "fulfilled")
              result.value.items
                .filter((member) => member.userId !== me.id)
                .forEach((member) => unique.set(member.userId, member));
          });
          setContacts(
            [...unique.values()].sort((a, b) =>
              a.displayName.localeCompare(b.displayName),
            ),
          );
        } catch {
          setContacts([]);
        }
      } else if (section === "events") {
        let x = await communityApi.events({ pageSize: 100, ...locationParams });
        if (!x.items.length) x = await communityApi.events({ pageSize: 100 });
        setEvents(x.items);
      } else if (section === "invitations")
        setItems((await communityApi.invitations()).items);
      else if (section === "gifts")
        setItems((await communityApi.giftRegistries()).items);
      else if (section === "notifications") {
        const loaded = (await communityApi.notifications()).items;
        setItems(loaded.length ? loaded : portalDemoNotifications);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load Community data.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    activeCity,
    activeLocation.countryName,
    activeLocation.stateName,
    section,
  ]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (section !== "messages") return;
    setSelected(undefined);
    setMessages([]);
    setReplyTo(undefined);
    setEditingMessage(undefined);
  }, [section]);
  useEffect(() => {
    if (section === "messages")
      void communityApi
        .messagingSettings()
        .then((x) => {
          setMessageEditMinutes(x.messageEditMinutes);
          setMessageDeleteMinutes(x.messageDeleteMinutes);
        })
        .catch(() => undefined);
  }, [section]);
  useEffect(() => {
    if (section !== "messages" || !selected) return;
    const apiBase = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;
    let active = true;
    let fallbackTimer: number | undefined;
    const stopFallback = () => {
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    };
    const syncWhileDisconnected = async () => {
      try {
        const [messagePage, conversationPage] = await Promise.all([
          communityApi.messages(selected),
          communityApi.conversations(),
        ]);
        if (!active) return;
        setMessages(messagePage.items);
        setConversations(
          conversationPage.items.map((conversation) =>
            conversation.id === selected
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
        void communityApi.markConversationRead(selected).catch(() => undefined);
      } catch {
        // Retry on the next disconnected interval.
      }
    };
    const startFallback = () => {
      if (fallbackTimer !== undefined) return;
      void syncWhileDisconnected();
      fallbackTimer = window.setInterval(
        () => void syncWhileDisconnected(),
        10000,
      );
    };
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiBase.replace(/\/api\/?$/i, "")}/hubs/community`, {
        accessTokenFactory: () => getCustomerToken() || "",
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();
    connection.on("message", (message: CommunityMessage) => {
      if (message.conversationId === selected) {
        setMessages((current) =>
          current.some((x) => x.id === message.id)
            ? current
            : [message, ...current],
        );
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selected
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
        void communityApi.markConversationRead(selected).catch(() => undefined);
      }
    });
    connection.on(
      "messageEdited",
      (change: { id: number; body: string; editedAtUtc: string }) =>
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
        ),
    );
    connection.on("messageDeleted", (change: { id: number }) =>
      setMessages((current) =>
        current.filter((message) => message.id !== change.id),
      ),
    );
    connection.onreconnecting(startFallback);
    connection.onreconnected(() => {
      stopFallback();
      return connection
        .invoke("JoinConversation", selected)
        .catch(() => startFallback());
    });
    connection.onclose(startFallback);
    void connection
      .start()
      .then(() => connection.invoke("JoinConversation", selected))
      .then(stopFallback)
      .catch(startFallback);
    return () => {
      active = false;
      stopFallback();
      void connection
        .invoke("LeaveConversation", selected)
        .catch(() => undefined)
        .finally(() => connection.stop());
    };
  }, [section, selected]);
  useEffect(() => {
    if (!selected || !messageListRef.current) return;
    const list = messageListRef.current;
    const scrollToLatest = () => {
      list.scrollTop = list.scrollHeight;
    };
    const frame = window.requestAnimationFrame(scrollToLatest);
    const timer = window.setTimeout(scrollToLatest, 150);
    const observer = new ResizeObserver(scrollToLatest);
    Array.from(list.children).forEach((item) => observer.observe(item));
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [selected, messages]);
  if (busy) return <div className="community-state">Loading…</div>;
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selected,
  );
  return (
    <section className="community-workspace">
      {error && <p className="community-error">{error}</p>}
      {section === "discover" && (
        <DiscoverView
          groups={groups}
          events={events}
          reload={reload}
          city={activeCity}
        />
      )}
      {section === "groups" && (
        <GroupsView
          groups={groups}
          reload={reload}
          location={activeLocation}
          locationLabel={activeLocationLabel}
        />
      )}
      {section === "feed" && (
        <FeedView
          groups={groups}
          currentUserId={currentUserId}
          posts={posts}
          setPosts={setPosts}
          reload={reload}
        />
      )}
      {section === "friends" && (
        <FriendsView conversations={conversations} reload={reload} />
      )}
      {section === "messages" && (
        <div className={`community-messages ${selected ? "conversation-open" : ""}`}>
          <aside>
            <StartDirect contacts={contacts} done={reload} />
            {conversations.map((c) => (
              <div
                className={`community-thread ${selected === c.id ? "active" : ""}`}
                key={c.id}
              >
                <button
                  onClick={async () => {
                    setSelected(c.id);
                    setConversations((current) =>
                      current.map((conversation) =>
                        conversation.id === c.id
                          ? { ...conversation, unreadCount: 0 }
                          : conversation,
                      ),
                    );
                    setReplyTo(undefined);
                    setEditingMessage(undefined);
                    try {
                      const messagePage = await communityApi.messages(c.id);
                      setMessages(messagePage.items);
                      void communityApi
                        .markConversationRead(c.id)
                        .catch(() => undefined);
                    } catch {
                      setMessages([]);
                    }
                  }}
                >
                  <strong>{c.title || "Community member"}</strong>
                  <small>
                    {c.status === "REQUESTED"
                      ? c.canAccept
                        ? "Message request"
                        : "Waiting for acceptance"
                      : `${c.unreadCount} unread`}
                  </small>
                </button>
                {c.canAccept && (
                  <button
                    className="community-accept-chat"
                    onClick={async () => {
                      await communityApi.acceptConversation(c.id);
                      await reload();
                    }}
                  >
                    Accept
                  </button>
                )}
              </div>
            ))}
          </aside>
          <div>
            {selected ? (
              <>
                <ConversationHeader
                  conversation={conversations.find((item) => item.id === selected)}
                  currentUserId={currentUserId}
                  onNotice={setMessageActionNotice}
                  onBack={() => {
                    setSelected(undefined);
                    setMessages([]);
                    setReplyTo(undefined);
                    setEditingMessage(undefined);
                  }}
                />
                {messageActionNotice && (
                  <div className="message-action-notice" role="alert">
                    <span className="material-icons">schedule</span>
                    <span>{messageActionNotice}</span>
                    <button
                      type="button"
                      aria-label="Close message"
                      onClick={() => setMessageActionNotice("")}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                )}
                <div className="message-list" ref={messageListRef}>
                  {messages
                    .slice()
                    .reverse()
                    .map((m) => {
                      const quoted = m.replyToMessageId
                        ? messages.find(
                            (item) => item.id === m.replyToMessageId,
                          )
                        : undefined;
                      const canEdit =
                        Date.now() <=
                        new Date(m.sentAtUtc).getTime() +
                          messageEditMinutes * 60000;
                      const canDelete =
                        Date.now() <=
                        new Date(m.sentAtUtc).getTime() +
                          messageDeleteMinutes * 60000;
                      return (
                        <p
                          className={
                            m.senderUserId === currentUserId
                              ? "message-mine"
                              : "message-other"
                          }
                          key={m.id}
                        >
                          <span className="message-actions">
                            <button
                              type="button"
                              title="Reply"
                              aria-label="Reply to message"
                              onClick={() => {
                                setMessageActionNotice("");
                                setEditingMessage(undefined);
                                setReplyTo(m);
                              }}
                            >
                              <span className="material-icons">reply</span>
                            </button>
                            {m.body ? (
                              <button
                                type="button"
                                title="Copy"
                                aria-label="Copy message"
                                onClick={() =>
                                  void navigator.clipboard.writeText(
                                    m.body || "",
                                  )
                                }
                              >
                                <span className="material-icons">
                                  content_copy
                                </span>
                              </button>
                            ) : null}
                            {m.senderUserId === currentUserId ? (
                              <>
                                <button
                                  type="button"
                                  title={
                                    canEdit
                                      ? "Edit"
                                      : `Edit time expired (${messageEditMinutes} minutes)`
                                  }
                                  aria-label="Edit message"
                                  onClick={() => {
                                    if (m.messageType !== "TEXT") {
                                      setMessageActionNotice(
                                        "Only text messages can be edited.",
                                      );
                                      return;
                                    }
                                    if (!canEdit) {
                                      setMessageActionNotice(
                                        `Editing time has expired. Messages can be edited within ${messageEditMinutes} minutes after sending.`,
                                      );
                                      return;
                                    }
                                    setMessageActionNotice("");
                                    setReplyTo(undefined);
                                    setEditingMessage(m);
                                  }}
                                >
                                  <span className="material-icons">edit</span>
                                </button>
                                <button
                                  type="button"
                                  title={
                                    canDelete
                                      ? "Delete"
                                      : `Delete time expired (${messageDeleteMinutes} minutes)`
                                  }
                                  aria-label="Delete message"
                                  onClick={async () => {
                                    if (!canDelete) {
                                      setMessageActionNotice(
                                        `Deletion time has expired. Messages can be deleted for everyone within ${messageDeleteMinutes} minutes after sending.`,
                                      );
                                      return;
                                    }
                                    setMessageActionNotice("");
                                    if (
                                      window.confirm(
                                        "Delete this message for everyone?",
                                      )
                                    ) {
                                      try {
                                        await communityApi.deleteMessage(m.id);
                                        setMessages((current) =>
                                          current.filter(
                                            (item) => item.id !== m.id,
                                          ),
                                        );
                                      } catch {
                                        setMessageActionNotice(
                                          "This message could not be deleted. Its deletion time may have expired.",
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <span className="material-icons">delete</span>
                                </button>
                              </>
                            ) : null}
                          </span>
                          {quoted ? (
                            <span className="message-quote">
                              <b>
                                {quoted.senderUserId === currentUserId
                                  ? "You"
                                  : quoted.senderName}
                              </b>
                              {quoted.body ||
                                (quoted.messageType === "AUDIO"
                                  ? "Voice message"
                                  : quoted.messageType === "LOCATION"
                                    ? "Location"
                                    : "Attachment")}
                            </span>
                          ) : null}
                          <strong>
                            {m.senderUserId === currentUserId
                              ? "You"
                              : m.senderName}
                          </strong>
                          {m.messageType === "AUDIO" ? (
                            <VoiceClip metadataJson={m.metadataJson} />
                          ) : m.messageType === "IMAGE" ||
                            m.messageType === "DOCUMENT" ? (
                            <ChatAttachment message={m} />
                          ) : m.messageType === "LOCATION" ? (
                            <ChatLocation metadataJson={m.metadataJson} />
                          ) : (
                            m.body
                          )}
                          <small>
                            {new Date(m.sentAtUtc).toLocaleString()}
                            {m.editedAtUtc ? " · edited" : ""}
                          </small>
                        </p>
                      );
                    })}
                </div>
                {selectedConversation?.status === "ACTIVE" && selectedConversation.canSendMessages ? (
                  <SendMessage
                    id={selected}
                    replyTo={replyTo}
                    clearReply={() => setReplyTo(undefined)}
                    editingMessage={editingMessage}
                    clearEditing={() => setEditingMessage(undefined)}
                    done={async () =>
                      setMessages((await communityApi.messages(selected)).items)
                    }
                  />
                ) : selectedConversation?.status === "ACTIVE" ? (
                  <div className="community-chat-pending">
            <span className="material-icons">send</span>
                    <strong>Admins-only chat</strong>
                    <p>Only the group owner, admins and moderators can send messages. You can still read all updates.</p>
                  </div>
                ) : (
                  <div className="community-chat-pending">
                    <span className="material-icons">schedule</span>
                    <strong>Message request pending</strong>
                    <p>
                      You can send messages after the recipient accepts this
                      conversation.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="community-state">Select a conversation</div>
            )}
          </div>
        </div>
      )}
      {section === "events" && (
        <>
          <div className="community-event-create">
            <CreateEvent done={reload} location={activeLocation} />
          </div>
          <CommunityEventCards events={events} register onChanged={reload} />
        </>
      )}
      {section === "invitations" && <InvitationDashboard items={items} />}
      {section === "gifts" && (
        <>
          <CommunityGiftDashboard items={items} done={reload} />
          <GiftFulfillment />
        </>
      )}
      {section === "notifications" && (
        <NotificationDashboard items={items} reload={reload} />
      )}
      {section === "profile" && <Profile />}
    </section>
  );
}

function ConversationHeader({
  conversation,
  currentUserId,
  onNotice,
  onBack,
}: {
  conversation?: CommunityConversation;
  currentUserId?: number;
  onNotice: (message: string) => void;
  onBack: () => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<CommunityGroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CommunityUserSearchResult[]>([]);
  const isGroup = Boolean(conversation?.groupId);
  const currentMember = members.find((member) => member.userId === currentUserId);
  const canManage = ["OWNER", "ADMIN", "MODERATOR"].includes(
    currentMember?.role || "",
  );

  const openMembers = async () => {
    if (!conversation?.groupId) return;
    setShowMembers(true);
    setLoadingMembers(true);
    try {
      setMembers((await communityApi.groupMembers(conversation.groupId)).items);
    } catch {
      onNotice("Group members could not be loaded.");
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <>
      <header className="conversation-header">
        <button type="button" className="conversation-mobile-back" aria-label="Back to conversations" onClick={onBack}>
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="conversation-avatar" aria-hidden="true">
          <span className="material-icons">{isGroup ? "groups" : "person"}</span>
        </div>
        <button
          type="button"
          className="conversation-identity"
          onClick={() => isGroup && void openMembers()}
        >
          <strong>{conversation?.title || "Community member"}</strong>
          <small>{isGroup ? "Group chat · view members" : "Direct message"}</small>
        </button>
        <div className="conversation-tools">
          <CommunityCallControls
            conversationId={conversation?.id || 0}
            currentUserId={currentUserId}
            title={conversation?.title || "Community member"}
          />
          {isGroup ? (
            <button type="button" title="Group members" onClick={() => void openMembers()}>
              <span className="material-icons">group_add</span>
            </button>
          ) : null}
        </div>
      </header>
      {showMembers && conversation?.groupId ? (
        <div className="conversation-members-panel">
          <div className="conversation-members-heading">
            <div><strong>{conversation.title || "Group"}</strong><small>{members.length} members</small></div>
            <button type="button" aria-label="Close members" onClick={() => setShowMembers(false)}>
              <span className="material-icons">close</span>
            </button>
          </div>
          {loadingMembers ? <p>Loading members…</p> : (
            <div className="conversation-member-list">
              {members.map((member) => (
                <div key={member.id}>
                  <span className="material-icons">account_circle</span>
                  <span><strong>{member.displayName}</strong><small>{member.role.toLowerCase()}</small></span>
                </div>
              ))}
            </div>
          )}
          {canManage ? (
            <form
              className="conversation-member-search"
              onSubmit={async (event) => {
                event.preventDefault();
                if (search.trim().length < 2) return;
                try {
                  setResults(await communityApi.searchUsers(search.trim()));
                } catch {
                  onNotice("Customers could not be searched.");
                }
              }}
            >
              <label>Add member</label>
              <div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer" /><button type="submit"><span className="material-icons">search</span></button></div>
              {results.map((user) => (
                <button
                  type="button"
                  className="conversation-invite-result"
                  key={user.id}
                  onClick={async () => {
                    try {
                      await communityApi.inviteGroupMember(conversation.groupId!, user.id);
                      onNotice(`Invitation sent to ${user.displayName}.`);
                      setResults([]);
                      setSearch("");
                    } catch {
                      onNotice(`${user.displayName} could not be invited.`);
                    }
                  }}
                >
                  <span>{user.displayName}</span><b>Invite</b>
                </button>
              ))}
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function GroupsView({
  groups,
  reload,
  location,
}: {
  groups: CommunityGroup[];
  reload: () => Promise<void>;
  location: HomeSelectedLocation;
  locationLabel: string;
}) {
  const [showCreate, setShowCreate] = useState(false),
    [page, setPage] = useState(1),
    [groupView, setGroupView] = useState<
      "created" | "joined" | "pending" | "discover"
    >("created");
  const views = [
    {
      key: "created" as const,
      label: "Groups I Created",
      icon: "admin_panel_settings",
    },
    { key: "joined" as const, label: "Joined Groups", icon: "groups" },
    {
      key: "pending" as const,
      label: "Awaiting Approval",
      icon: "hourglass_top",
    },
    { key: "discover" as const, label: "Find Groups", icon: "travel_explore" },
  ];
  const filtered = groups.filter((group) =>
    groupView === "created"
      ? group.currentUserRole === "OWNER"
      : groupView === "joined"
        ? Boolean(group.currentUserRole) && group.currentUserRole !== "OWNER"
        : groupView === "pending"
          ? !group.currentUserRole &&
            group.currentUserRequestStatus === "PENDING"
          : !group.currentUserRole &&
            group.currentUserRequestStatus !== "PENDING",
  );
  const pageSize = 6,
    totalPages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    setPage(1);
  }, [groupView]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  return (
    <>
      <div className="community-list-head">
        <div>
          <h2>My groups</h2>
          <p>
            Manage groups you created, joined groups and membership requests.
          </p>
        </div>
        <button
          className="community-create-button"
          onClick={() => setShowCreate(true)}
        >
          <span className="material-icons">add</span>Create group
        </button>
      </div>
      <nav
        className="community-group-view-tabs"
        aria-label="My group categories"
      >
        {views.map((view) => (
          <button
            key={view.key}
            className={groupView === view.key ? "active" : ""}
            onClick={() => setGroupView(view.key)}
          >
            <span className="material-icons">{view.icon}</span>
            {view.label}
            <b>
              {
                groups.filter((group) =>
                  view.key === "created"
                    ? group.currentUserRole === "OWNER"
                    : view.key === "joined"
                      ? Boolean(group.currentUserRole) &&
                        group.currentUserRole !== "OWNER"
                      : view.key === "pending"
                        ? !group.currentUserRole &&
                          group.currentUserRequestStatus === "PENDING"
                        : !group.currentUserRole &&
                          group.currentUserRequestStatus !== "PENDING",
                ).length
              }
            </b>
          </button>
        ))}
      </nav>
      <div className="community-group-view-heading">
        <h3>{views.find((view) => view.key === groupView)?.label}</h3>
        <p>
          {groupView === "created"
            ? "Groups you own and control."
            : groupView === "joined"
              ? "Groups where your membership is approved."
              : groupView === "pending"
                ? "Private groups waiting for an owner decision."
                : "Public and private groups from all locations. Private groups require owner approval."}
        </p>
      </div>
      <GroupCards groups={visible} reload={reload} />
      {totalPages > 1 && (
        <nav className="community-pagination" aria-label="Group pages">
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next →
          </button>
        </nav>
      )}
      {showCreate && (
        <div
          className="community-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreate(false);
          }}
        >
          <div className="community-modal-card create-group-modal-card">
            <header>
              <div>
                <span className="material-icons">groups</span>
                <div>
                  <small>NEW COMMUNITY</small>
                  <h2 id="create-group-title">Create a group</h2>
                </div>
              </div>
              <button
                aria-label="Close create group"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </header>
            <p>Location is preselected from the top location.</p>
            <CreateGroup
              location={location}
              done={async () => {
                await reload();
                setShowCreate(false);
                setGroupView("created");
              }}
              cancel={() => setShowCreate(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
function GroupCards({
  groups,
  reload,
}: {
  groups: CommunityGroup[];
  reload: () => Promise<void>;
}) {
  return (
    <div className="community-cards community-group-cards">
      {groups.map((g) => (
        <article key={g.id}>
          <div className="community-group-cover">
            <span className="material-icons">groups</span>
            <em>{g.visibility}</em>
          </div>
          <div className="community-group-card-body">
            <span className="community-role">
              {g.currentUserRole === "OWNER"
                ? "Owner · Created by you"
                : g.currentUserRole
                  ? `${g.currentUserRole.toLowerCase()} · Approved`
                  : g.currentUserRequestStatus === "PENDING"
                    ? "Request awaiting approval"
                    : "Available to join"}
            </span>
            <h3>{g.name}</h3>
            <p>
              {g.description ||
                "Connect with local members, share updates and discover upcoming activities."}
            </p>
            <ul>
              <li>
                <span className="material-icons">location_on</span>
                {[g.city, g.state, g.country].filter(Boolean).join(", ") ||
                  "Online"}
              </li>
              <li>
                <span className="material-icons">group</span>
                {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
              </li>
            </ul>
            <div className="community-card-actions">
              <Link to={`/community/groups/${g.slug}`}>View community</Link>
              {g.currentUserRole === "OWNER" ? (
                <span className="community-owner-card-actions">
                  <Link
                    className="community-owner-edit"
                    to={`/community/groups/${g.slug}?tab=manage&action=edit`}
                  >
                    <span className="material-icons">edit</span>Edit
                  </Link>
                  <Link
                    className="community-owner-archive"
                    to={`/community/groups/${g.slug}?tab=manage&action=archive`}
                  >
                    <span className="material-icons">archive</span>Archive
                  </Link>
                </span>
              ) : null}
              {!g.currentUserRole &&
              g.currentUserRequestStatus !== "PENDING" ? (
                <button
                  onClick={async () => {
                    await communityApi.joinGroup(g.id);
                    await reload();
                  }}
                >
                  {g.visibility === "PRIVATE" ? "Request to join" : "Join"}
                </button>
              ) : g.currentUserRequestStatus === "PENDING" ? (
                <span className="community-pending-label">
                  <span className="material-icons">schedule</span>Pending
                </span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
      {!groups.length && (
        <div className="community-state">No groups in this section.</div>
      )}
    </div>
  );
}
function DiscoverView({
  groups,
  events,
  reload,
  city,
}: {
  groups: CommunityGroup[];
  events: CommunityEvent[];
  reload: () => Promise<void>;
  city: string;
}) {
  return (
    <>
      <section className="discover-welcome">
        <div>
          <small>DISCOVER NEAR YOU</small>
          <h2>Find your people. Join the moment.</h2>
          <p>
            Explore welcoming communities and upcoming experiences
            {city ? ` around ${city}` : " near you"}.
          </p>
        </div>
        <div className="discover-summary">
          <article>
            <span className="material-icons">groups</span>
            <strong>{groups.length}</strong>
            <small>Communities</small>
          </article>
          <article>
            <span className="material-icons">event</span>
            <strong>{events.length}</strong>
            <small>Upcoming events</small>
          </article>
        </div>
      </section>
      <div className="discover-section-head">
        <div>
          <h2>Communities for you</h2>
          <p>
            {groups.some((group) => group.currentUserRole)
              ? "Your joined communities and local recommendations"
              : "Recommended from your location and interests"}
          </p>
        </div>
        <Link to="/community/groups">View my groups →</Link>
      </div>
      <GroupCards groups={groups.slice(0, 6)} reload={reload} />
      <div className="discover-section-head">
        <div>
          <h2>Upcoming near you</h2>
          <p>Meet, celebrate and connect with your local community.</p>
        </div>
        <Link to="/community/events">See all events →</Link>
      </div>
      <EventCards events={events} />
    </>
  );
}
function EventCards({
  events,
  register,
}: {
  events: CommunityEvent[];
  register?: boolean;
}) {
  return (
    <div className="community-event-grid">
      {events.map((e) => {
        const date = new Date(e.startAtUtc);
        return (
          <article key={e.id}>
            <div className="community-event-art">
              <div>
                <b>{date.toLocaleDateString(undefined, { day: "2-digit" })}</b>
                <span>
                  {date.toLocaleDateString(undefined, { month: "short" })}
                </span>
              </div>
              <span className="material-icons">
                {e.eventMode === "VIRTUAL" ? "videocam" : "celebration"}
              </span>
            </div>
            <div className="community-event-body">
              <span>{e.eventMode.replace(/_/g, " ")}</span>
              <h3>{e.title}</h3>
              <p>
                <span className="material-icons">schedule</span>
                {date.toLocaleString()}
              </p>
              <p>
                <span className="material-icons">location_on</span>
                {e.venueName || e.city || "Online event"}
              </p>
              {register ? (
                <button
                  onClick={() =>
                    communityApi.registerEvent(e.id, "Community guest")
                  }
                >
                  RSVP now
                </button>
              ) : (
                <Link to="/community/events">
                  View event <b>→</b>
                </Link>
              )}
            </div>
          </article>
        );
      })}
      {!events.length && (
        <div className="invitation-empty">
          <span className="material-icons">event_busy</span>
          <h3>No upcoming events</h3>
          <p>Check back soon for new community activities.</p>
        </div>
      )}
    </div>
  );
}
function FeedView({
  groups,
  currentUserId,
  posts,
  setPosts,
  reload,
}: {
  groups: CommunityGroup[];
  currentUserId?: number;
  posts: CommunityPost[];
  setPosts: (posts: CommunityPost[]) => void;
  reload: () => Promise<void>;
}) {
  return (
    <div className="feed-layout">
      <section className="feed-main">
        <div className="feed-toolbar">
          <div>
            <span className="material-icons">dynamic_feed</span>
            <div>
              <h2>Community feed</h2>
              <p>Updates and conversations from all your communities.</p>
            </div>
          </div>
          <label>
            Filter by group
            <GroupPicker
              groups={groups}
              onPick={async (id) => {
                if (id === 0) {
                  await reload();
                  return;
                }
                setPosts((await communityApi.posts(id)).items);
              }}
            />
          </label>
        </div>
        <div className="community-feed-composer">
          <div className="feed-avatar">S</div>
          <div>
            <strong>Share something with your community</strong>
            <p>Ask a question, recommend a place or celebrate a moment.</p>
          </div>
          <CreatePost
            groups={groups}
            currentUserId={currentUserId}
            done={reload}
          />
        </div>
        <PostCards posts={posts} groups={groups} reload={reload} />
      </section>
      <aside className="feed-sidebar">
        <div>
          <span className="material-icons">groups</span>
          <strong>{groups.length}</strong>
          <small>Your communities</small>
        </div>
        <h3>Community tips</h3>
        <ul>
          <li>Introduce yourself to new neighbors</li>
          <li>Share useful local recommendations</li>
          <li>Keep discussions friendly and helpful</li>
        </ul>
        <Link to="/community/groups">Explore communities →</Link>
      </aside>
    </div>
  );
}
function PostCards({
  posts,
  groups,
  reload,
}: {
  posts: CommunityPost[];
  groups: CommunityGroup[];
  reload: () => Promise<void>;
}) {
  const [commentPost, setCommentPost] = useState<CommunityPost>(),
    [comments, setComments] = useState<CommunityComment[]>([]),
    [commentsLoading, setCommentsLoading] = useState(false),
    [replyTo, setReplyTo] = useState<CommunityComment>(),
    [reportPost, setReportPost] = useState<CommunityPost>(),
    [copied, setCopied] = useState<number>();
  async function openComments(post: CommunityPost) {
    setCommentPost(post);
    setReplyTo(undefined);
    setCommentsLoading(true);
    try {
      setComments((await communityApi.comments(post.id)).items);
    } finally {
      setCommentsLoading(false);
    }
  }
  function closeComments() {
    setCommentPost(undefined);
    setReplyTo(undefined);
    setComments([]);
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  useEffect(() => {
    const postId = Number(
      new URLSearchParams(window.location.search).get("post"),
    );
    const linkedPost = posts.find((post) => post.id === postId);
    if (linkedPost && commentPost?.id !== linkedPost.id)
      void openComments(linkedPost);
  }, [posts]);
  return (
    <>
      <div className="community-feed">
        {posts.map((p) => {
          const group = groups.find((item) => item.id === p.groupId),
            date = new Date(p.publishedAtUtc || p.createdAtUtc),
            media = p.mediaJson
              ? (JSON.parse(p.mediaJson) as {
                  url?: string;
                  mediaType?: string;
                })
              : undefined;
          return (
            <article key={p.id}>
              <header>
                <span className="feed-avatar">
                  {p.authorName?.charAt(0).toUpperCase() || "C"}
                </span>
                <div>
                  <strong>{p.authorName}</strong>
                  <small>
                    {group?.name || "ChaoDesi Community"} ·{" "}
                    {date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </div>
                <button
                  className="feed-report"
                  title="Report post"
                  onClick={() => setReportPost(p)}
                >
                  <span className="material-icons">more_horiz</span>
                </button>
              </header>
              {p.title && <h3>{p.title}</h3>}
              <p>{p.body}</p>
              {media?.url &&
                (media.mediaType?.startsWith("video") ? (
                  <video
                    className="feed-media"
                    controls
                    src={resolveCommunityMediaUrl(media.url)}
                  />
                ) : (
                  <img
                    className="feed-media"
                    src={resolveCommunityMediaUrl(media.url)}
                    alt={p.title || "Community post"}
                  />
                ))}
              <div className="feed-engagement">
                <span>
                  <span className="material-icons">favorite</span>
                  {p.reactionCount} reactions
                </span>
                <button
                  className="feed-comment-count"
                  onClick={() => void openComments(p)}
                >
                  {p.commentCount} comments
                </button>
              </div>
              <footer>
                <button
                  onClick={async () => {
                    await communityApi.react(p.id);
                    await reload();
                  }}
                >
                  <span className="material-icons">favorite_border</span>Like
                </button>
                <button onClick={() => void openComments(p)}>
                  <span className="material-icons">chat_bubble_outline</span>
                  Comment
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/community/feed?post=${p.id}`,
                    );
                    setCopied(p.id);
                    window.setTimeout(() => setCopied(undefined), 1800);
                  }}
                >
                  <span className="material-icons">
                    {copied === p.id ? "check" : "share"}
                  </span>
                  {copied === p.id ? "Copied" : "Share"}
                </button>
              </footer>
            </article>
          );
        })}
        {!posts.length && (
          <div className="community-state feed-empty">
            <span className="material-icons">forum</span>
            <h3>Start the conversation</h3>
            <p>Be the first to share an update with your communities.</p>
          </div>
        )}
      </div>
      {commentPost && (
        <div
          className="community-modal comment-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="community-modal-card">
            <header>
              <div>
                <span className="material-icons">chat_bubble</span>
                <div>
                  <small>JOIN THE CONVERSATION</small>
                  <h2>{commentPost.commentCount} comments</h2>
                </div>
              </div>
              <button onClick={closeComments}>×</button>
            </header>
            <div className="comment-thread">
              {commentsLoading ? (
                <p className="comment-loading">Loading comments…</p>
              ) : comments.length ? (
                comments.map((comment) => (
                  <article
                    key={comment.id}
                    className={comment.parentCommentId ? "comment-reply" : ""}
                  >
                    <span className="feed-avatar">
                      {comment.authorName?.charAt(0).toUpperCase() || "C"}
                    </span>
                    <div>
                      <strong>{comment.authorName}</strong>
                      <small>
                        {new Date(comment.createdAtUtc).toLocaleString()}
                      </small>
                      <p>{comment.body}</p>
                      <button onClick={() => setReplyTo(comment)}>Reply</button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="comment-empty">
                  <span className="material-icons">forum</span>
                  <p>No comments yet. Start the conversation.</p>
                </div>
              )}
            </div>
            {replyTo ? (
              <div className="comment-replying">
                <span>
                  Replying to <b>{replyTo.authorName}</b>
                </span>
                <button onClick={() => setReplyTo(undefined)}>×</button>
              </div>
            ) : null}
            <Form
              label="Post comment"
              submit={async (form) => {
                await communityApi.comment(
                  commentPost.id,
                  String(form.get("body")).trim(),
                  replyTo?.id,
                );
                await reload();
                setComments(
                  (await communityApi.comments(commentPost.id)).items,
                );
                setReplyTo(undefined);
              }}
            >
              <label>
                Your comment
                <textarea
                  name="body"
                  required
                  minLength={2}
                  autoFocus
                  placeholder={
                    replyTo
                      ? `Reply to ${replyTo.authorName}`
                      : "Write a comment…"
                  }
                />
              </label>
              <div className="community-modal-actions">
                <button
                  type="button"
                  className="community-secondary-button"
                  onClick={closeComments}
                >
                  Cancel
                </button>
                <button type="submit">Post comment</button>
              </div>
            </Form>
          </div>
        </div>
      )}
      {reportPost && (
        <div className="community-modal" role="dialog" aria-modal="true">
          <div className="community-modal-card">
            <header>
              <div>
                <span className="material-icons">flag</span>
                <div>
                  <small>COMMUNITY SAFETY</small>
                  <h2>Report this post</h2>
                </div>
              </div>
              <button onClick={() => setReportPost(undefined)}>×</button>
            </header>
            <Form
              label="Submit report"
              submit={async (form) => {
                await communityApi.report({
                  targetType: "POST",
                  targetId: reportPost.id,
                  reasonCode: form.get("reason"),
                  description: form.get("description"),
                });
                setReportPost(undefined);
              }}
            >
              <label>
                Reason
                <select name="reason" required>
                  <option value="SPAM">Spam or misleading</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Details
                <textarea
                  name="description"
                  required
                  placeholder="Tell our safety team what happened"
                />
              </label>
              <div className="community-modal-actions">
                <button
                  type="button"
                  className="community-secondary-button"
                  onClick={() => setReportPost(undefined)}
                >
                  Cancel
                </button>
                <button type="submit">Send report</button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}
function Form({
  submit,
  children,
  label,
}: {
  submit: (f: FormData) => Promise<void>;
  children: React.ReactNode;
  label: string;
}) {
  const [saving, setSaving] = useState(false),
    [formError, setFormError] = useState("");
  return (
    <form
      className="community-form"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setSaving(true);
        setFormError("");
        try {
          await submit(new FormData(form));
          form.reset();
        } catch (error) {
          setFormError(
            error instanceof Error
              ? error.message
              : "Unable to complete this action. Please try again.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      {children}
      {formError && (
        <p className="community-error" role="alert">
          {formError}
        </p>
      )}
      <button type="submit" disabled={saving}>
        {saving ? "Sending…" : label}
      </button>
    </form>
  );
}
function CreateGroup({
  done,
  cancel,
  location,
}: {
  done: () => Promise<void>;
  cancel: () => void;
  location: HomeSelectedLocation;
}) {
  return (
    <Form
      label="Create group"
      submit={async (f) => {
        const text = (key: string) => String(f.get(key) || "").trim();
        const name = text("name"),
          questions = text("joiningQuestions")
            .split(/\r?\n/)
            .map((question) => question.trim())
            .filter(Boolean),
          body = {
            name,
            description: text("description"),
            visibility: text("visibility"),
            city: text("city"),
            state: text("state"),
            country: text("country"),
            postalCode: text("postalCode"),
            languageCode: text("languageCode"),
            rules: text("rules"),
            joiningQuestionsJson: questions.length
              ? JSON.stringify(questions)
              : null,
          };
        let created: Awaited<ReturnType<typeof communityApi.createGroup>> | null = null;
        try {
          created = await communityApi.createGroup(body);
        } catch (createError) {
          try {
            const verification = await communityApi.groups({
              search: name,
              pageSize: 100,
            });
            created = verification.items.find(
                (group) =>
                  group.name.localeCompare(name, undefined, {
                    sensitivity: "accent",
                  }) === 0,
              ) || null;
            if (!created) throw createError;
          } catch {
            throw createError;
          }
        }
        const avatarFile = f.get("avatarFile");
        const coverFile = f.get("coverFile");
        let avatarUrl = "";
        let coverUrl = "";
        if (avatarFile instanceof File && avatarFile.size)
          avatarUrl = (await communityApi.uploadMedia(avatarFile, "GroupAvatar", created.id)).url;
        if (coverFile instanceof File && coverFile.size)
          coverUrl = (await communityApi.uploadMedia(coverFile, "GroupCover", created.id)).url;
        if (avatarUrl || coverUrl)
          await communityApi.updateGroup(created.id, { ...body, avatarUrl, coverUrl });
        await communityApi.setGroupChatPermission(
          created.id,
          text("chatPermission") as "ALL_MEMBERS" | "ADMINS_ONLY",
        );
        await done();
      }}
    >
      <label>
        Group name
        <input
          name="name"
          required
          minLength={3}
          placeholder="Example: Novi Telugu Families"
        />
      </label>
      <CascadingLocationFields initialLocation={location} />
      <label>
        Visibility
        <select name="visibility" defaultValue="PRIVATE">
          <option value="PRIVATE">
            Private — customers request to join; owner approves
          </option>
          <option value="PUBLIC">Public — customers join immediately</option>
          <option value="INVITE_ONLY">Invite only</option>
        </select>
      </label>
      <label>
        Description
        <textarea
          name="description"
          required
          minLength={10}
          placeholder="Tell members what this group is about…"
        />
      </label>
      <div className="create-group-options-grid">
        <label>
          Postal code
          <input name="postalCode" maxLength={20} placeholder="Example: 500090" />
        </label>
        <label>
          Group language
          <select name="languageCode" defaultValue="en">
            <option value="en">English</option>
            <option value="te">Telugu</option>
            <option value="hi">Hindi</option>
            <option value="fr">French</option>
          </select>
        </label>
      </div>
      <label>
        Who can post in group chat?
        <select name="chatPermission" defaultValue="ALL_MEMBERS">
          <option value="ALL_MEMBERS">All members can post</option>
          <option value="ADMINS_ONLY">Admins and moderators only</option>
        </select>
      </label>
      <label>
        Group rules
        <textarea name="rules" maxLength={8000} placeholder="Add the rules members should follow" />
      </label>
      <label>
        Joining questions
        <textarea name="joiningQuestions" placeholder={"Why would you like to join?\nDo you agree to follow the group rules?"} />
        <small>Optional. Enter one question per line.</small>
      </label>
      <div className="create-group-options-grid">
        <label className="create-group-image-upload">
          Group avatar
          <input name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" />
          <small>Square JPG, PNG or WebP</small>
        </label>
        <label className="create-group-image-upload">
          Cover image
          <input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" />
          <small>Wide JPG, PNG or WebP</small>
        </label>
      </div>
      <div className="community-modal-actions">
        <button
          type="button"
          className="community-secondary-button"
          onClick={cancel}
        >
          Cancel
        </button>
        <button type="submit">Create group</button>
      </div>
    </Form>
  );
}
function CreatePost({
  groups,
  currentUserId,
  done,
}: {
  groups: CommunityGroup[];
  currentUserId?: number;
  done: () => Promise<void>;
}) {
  const ownedGroups = groups.filter(
    (group) =>
      group.currentUserRole === "OWNER" || group.ownerUserId === currentUserId,
  );
  return (
    <Form
      label="Publish post"
      submit={async (f) => {
        const file = f.get("media") as File;
        let media;
        if (file?.size) media = await communityApi.uploadMedia(file, "Post");
        const selectedGroup = String(f.get("groupId"));
        const targetGroups =
          selectedGroup === "ALL_OWNED"
            ? ownedGroups
            : groups.filter((group) => group.id === Number(selectedGroup));
        if (!targetGroups.length) throw new Error("Select at least one group.");
        const post = {
          postType: media?.mediaType?.startsWith("video")
            ? "VIDEO"
            : media
              ? "IMAGE"
              : "TEXT",
          title: f.get("title"),
          body: f.get("body"),
          mediaJson: media ? JSON.stringify(media) : undefined,
        };
        await Promise.all(
          targetGroups.map((group) =>
            communityApi.createPost({ ...post, groupId: group.id }),
          ),
        );
        await done();
      }}
    >
      <select
        name="groupId"
        required
        defaultValue={
          ownedGroups.length > 1 ? "ALL_OWNED" : String(groups[0]?.id || "")
        }
      >
        {ownedGroups.length > 1 ? (
          <option value="ALL_OWNED">
            Post to all my groups ({ownedGroups.length})
          </option>
        ) : null}
        {groups.map((g) => (
          <option value={g.id} key={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <input
        className="feed-title-input"
        name="title"
        maxLength={160}
        placeholder="Post title (optional)"
      />
      <textarea name="body" required placeholder="Share with your community…" />
      <label className="feed-file">
        <span className="material-icons">add_photo_alternate</span>Add photo or
        video
        <input name="media" type="file" accept="image/*,video/*" />
      </label>
    </Form>
  );
}
function GroupPicker({
  groups,
  onPick,
}: {
  groups: CommunityGroup[];
  onPick: (id: number) => void;
}) {
  return (
    <select
      className="community-picker"
      defaultValue="0"
      onChange={(e) => onPick(Number(e.target.value))}
    >
      <option value="0">All groups</option>
      {groups.map((g) => (
        <option value={g.id} key={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
function LegacyStartDirect({
  contacts,
  done,
}: {
  contacts: CommunityGroupMember[];
  done: () => Promise<void>;
}) {
  return (
    <Form
      label="Start chat"
      submit={async (f) => {
        await communityApi.startDirect(Number(f.get("userId")));
        await done();
      }}
    >
      <label className="community-field-label" htmlFor="chat-contact">
        Choose a community member
      </label>
      <select id="chat-contact" name="userId" required defaultValue="">
        <option value="" disabled>
          Select member
        </option>
        {contacts.map((contact) => (
          <option value={contact.userId} key={contact.userId}>
            {contact.displayName} · {contact.role.toLowerCase()}
          </option>
        ))}
      </select>
      {!contacts.length && <small>Join a community to find members.</small>}
    </Form>
  );
}
void LegacyStartDirect;
function FriendsView({
  conversations,
  reload,
}: {
  conversations: CommunityConversation[];
  reload: () => Promise<void>;
}) {
  const direct = conversations.filter(
    (item) => item.conversationType === "DIRECT",
  );
  const connected = direct.filter((item) => item.status === "ACTIVE");
  const incoming = direct.filter(
    (item) => item.status === "REQUESTED" && item.canAccept,
  );
  const sent = direct.filter(
    (item) => item.status === "REQUESTED" && !item.canAccept,
  );
  const list = (
    items: CommunityConversation[],
    empty: string,
    accept = false,
  ) =>
    items.length ? (
      <div className="friends-list">
        {items.map((item) => (
          <article key={item.id}>
            {item.otherUserId ? (
              <Link
                className="friend-profile-link"
                to={`/community/friends/${item.otherUserId}`}
              >
                <span className="material-icons">account_circle</span>
                <span>
                  <strong>{item.title || "ChaoDesi customer"}</strong>
                  <small>
                    {accept
                      ? "Wants to connect with you"
                      : item.status === "ACTIVE"
                        ? "Connected customer"
                        : "Waiting for acceptance"}
                  </small>
                </span>
              </Link>
            ) : (
              <>
                <span className="material-icons">account_circle</span>
                <div>
                  <strong>{item.title || "ChaoDesi customer"}</strong>
                  <small>
                    {accept
                      ? "Wants to connect with you"
                      : item.status === "ACTIVE"
                        ? "Connected customer"
                        : "Waiting for acceptance"}
                  </small>
                </div>
              </>
            )}
            {accept ? (
              <button
                type="button"
                onClick={async () => {
                  await communityApi.acceptConversation(item.id);
                  await reload();
                }}
              >
                Accept
              </button>
            ) : item.status === "ACTIVE" ? (
              <Link to="/community/messages">Message</Link>
            ) : (
              <span className="friends-waiting">Pending</span>
            )}
          </article>
        ))}
      </div>
    ) : (
      <p className="friends-empty">{empty}</p>
    );
  return (
    <section className="friends-page">
      <div className="friends-heading">
        <div>
          <span>YOUR CONNECTIONS</span>
          <h2>My Friends</h2>
          <p>Find customers, manage requests and continue conversations.</p>
        </div>
        <Link to="/community/messages">
          <span className="material-icons">chat</span> Open messages
        </Link>
      </div>
      <StartDirect contacts={[]} done={reload} />
      <div className="friends-columns">
        <section>
          <h3>
            <span className="material-icons">group</span> Friends{" "}
            <b>{connected.length}</b>
          </h3>
          {list(connected, "Customers you connect with will appear here.")}
        </section>
        <section>
          <h3>
            <span className="material-icons">person_add</span> Friend requests{" "}
            <b>{incoming.length}</b>
          </h3>
          {list(incoming, "No new friend requests.", true)}
        </section>
        <section>
          <h3>
            <span className="material-icons">schedule</span> Sent requests{" "}
            <b>{sent.length}</b>
          </h3>
          {list(sent, "No requests are waiting for approval.")}
        </section>
      </div>
    </section>
  );
}
function StartDirect({
  done,
}: {
  contacts: CommunityGroupMember[];
  done: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityUserSearchResult[]>([]);
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  useEffect(() => {
    void communityApi
      .messagingPrivacy()
      .then((x) => setPrivacy(x.directMessagePrivacy))
      .catch(() => undefined);
  }, []);
  const search = async () => {
    if (query.trim().length < 2) {
      setStatus("Enter at least 2 characters.");
      return;
    }
    setSearching(true);
    setStatus("");
    try {
      const rows = await communityApi.searchUsers(query.trim());
      setResults(rows);
      if (!rows.length) setStatus("No customer found.");
    } catch {
      setStatus("Unable to search customers.");
    } finally {
      setSearching(false);
    }
  };
  const start = async (customer: CommunityUserSearchResult) => {
    setStatus("");
    try {
      const result = (await communityApi.startDirect(customer.id)) as {
        status?: string;
        requiresApproval?: boolean;
      };
      setStatus(
        result.requiresApproval || result.status === "REQUESTED"
          ? `Request sent to ${customer.displayName}. Waiting for acceptance.`
          : `Chat with ${customer.displayName} is ready.`,
      );
      await done();
    } catch {
      setStatus("Unable to start this conversation.");
    }
  };
  return (
    <section className="direct-chat-finder">
      <strong>Find a customer</strong>
      <small>Search by name, email, mobile number or Community ID.</small>
      <div className="direct-chat-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          placeholder="Name, email, mobile or Community ID"
          aria-label="Search customers"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={searching}
        >
          <span className="material-icons">search</span>
        </button>
      </div>
      <label className="direct-privacy">
        Who can message me?
        <select
          value={privacy}
          onChange={(e) => {
            const value = e.target.value as "PUBLIC" | "PRIVATE";
            setPrivacy(value);
            void communityApi.setMessagingPrivacy(value);
          }}
        >
          <option value="PUBLIC">Public — chat starts immediately</option>
          <option value="PRIVATE">Private — I approve requests</option>
        </select>
      </label>
      {status && (
        <p className="direct-chat-status" role="status">
          {status}
        </p>
      )}
      <div className="direct-chat-results">
        {results.map((customer) => (
          <button
            type="button"
            key={customer.id}
            onClick={() => void start(customer)}
          >
            <span className="material-icons">account_circle</span>
            <span>
              <b>
                {customer.displayName}
                {customer.isVerified ? " ✓" : ""}
              </b>
              <small>
                {customer.email || customer.phone || "ChaoDesi customer"}
              </small>
            </span>
            <em>
              {customer.directMessagePrivacy === "PUBLIC" ? "Chat" : "Request"}
            </em>
          </button>
        ))}
      </div>
    </section>
  );
}
function SendMessage({
  id,
  done,
  replyTo,
  clearReply,
  editingMessage,
  clearEditing,
}: {
  id: number;
  done: () => Promise<void>;
  replyTo?: CommunityMessage;
  clearReply: () => void;
  editingMessage?: CommunityMessage;
  clearEditing: () => void;
}) {
  const [body, setBody] = useState("");
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  useEffect(() => {
    if (editingMessage) {
      setBody(editingMessage.body || "");
      setShowEmoji(false);
    }
  }, [editingMessage]);

  async function sendText() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      if (editingMessage)
        await communityApi.editMessage(editingMessage.id, text);
      else await communityApi.sendMessage(id, text, replyTo?.id);
      setBody("");
      clearReply();
      clearEditing();
      await done();
    } catch {
      setError("Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (!blob.size) return;
        setSending(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, {
            type: "audio/webm",
          });
          const media = await communityApi.uploadMedia(file, "ChatAttachment");
          await communityApi.sendVoiceMessage(
            id,
            media.url,
            Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
            replyTo?.id,
          );
          clearReply();
          await done();
        } catch {
          setError("Unable to send voice message.");
        } finally {
          setSending(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission is required for voice messages.");
    }
  }

  async function sendFile(file?: File) {
    if (!file || sending) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Attachments must be 50 MB or smaller.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const media = await communityApi.uploadMedia(file, "ChatAttachment");
      const messageType = media.mediaType.startsWith("image/")
        ? "IMAGE"
        : media.mediaType.startsWith("audio/")
          ? "AUDIO"
          : "DOCUMENT";
      await communityApi.sendAttachment(
        id,
        messageType,
        {
          url: media.url,
          thumbnailUrl: media.thumbnailUrl,
          mediaType: media.mediaType,
          fileName: media.originalFileName,
          sizeBytes: media.sizeBytes,
        },
        body,
        replyTo?.id,
      );
      setBody("");
      clearReply();
      await done();
    } catch {
      setError("Unable to upload and send this attachment.");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function sendLocation() {
    if (sending || !navigator.geolocation) {
      setError("Location sharing is not available in this browser.");
      return;
    }
    setSending(true);
    setError("");
    setShowEmoji(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await communityApi.sendLocation(
            id,
            position.coords.latitude,
            position.coords.longitude,
            replyTo?.id,
          );
          clearReply();
          await done();
        } catch {
          setError("Unable to send your location.");
        } finally {
          setSending(false);
        }
      },
      () => {
        setError("Please allow location permission to share your location.");
        setSending(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <>
      {editingMessage ? (
        <div className="composer-reply composer-edit">
          <span className="material-icons">edit</span>
          <span>
            <b>Editing message</b>
            <small>{editingMessage.body}</small>
          </span>
          <button
            type="button"
            onClick={() => {
              clearEditing();
              setBody("");
            }}
            aria-label="Cancel editing"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
      ) : null}
      {replyTo ? (
        <div className="composer-reply">
          <span className="material-icons">reply</span>
          <span>
            <b>Replying to {replyTo.senderName}</b>
            <small>
              {replyTo.body ||
                (replyTo.messageType === "AUDIO"
                  ? "Voice message"
                  : replyTo.messageType === "LOCATION"
                    ? "Location"
                    : "Attachment")}
            </small>
          </span>
          <button type="button" onClick={clearReply} aria-label="Cancel reply">
            <span className="material-icons">close</span>
          </button>
        </div>
      ) : null}
      <form
        className={`whatsapp-composer${recording ? " is-recording" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          void sendText();
        }}
      >
        <button
          type="button"
          className="composer-emoji"
          disabled={recording || sending}
          aria-label="Choose emoji"
          title="Emoji"
          onClick={() => setShowEmoji((value) => !value)}
        >
          <span className="material-icons">insert_emoticon</span>
        </button>
        <button
          type="button"
          className="composer-attach"
          disabled={recording || sending}
          aria-label="Attach a file"
          title="Attach image, video, audio or document"
          onClick={() => fileRef.current?.click()}
        >
          <span className="material-icons">attach_file</span>
        </button>
        <input
          ref={fileRef}
          className="composer-file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,audio/mpeg,audio/webm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => void sendFile(event.target.files?.[0])}
        />
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={recording || sending}
          placeholder={
            recording ? "Recording voice message…" : "Type a message"
          }
          maxLength={16000}
        />
        <button
          type="button"
          className="composer-location"
          disabled={recording || sending}
          aria-label="Share current location"
          title="Share current location"
          onClick={() => void sendLocation()}
        >
          <span className="material-icons">location_on</span>
        </button>
        {!body.trim() ? (
          <button
            type="button"
            className="composer-mic"
            disabled={sending}
            onClick={() => void toggleRecording()}
            aria-label={
              recording ? "Stop and send recording" : "Record voice message"
            }
          >
            <span className="material-icons">{recording ? "stop" : "mic"}</span>
          </button>
        ) : (
          <button
            className="composer-send"
            disabled={sending}
            aria-label="Send message"
          >
            <span className="material-icons">send</span>
          </button>
        )}
        {showEmoji ? (
          <div className="composer-emoji-picker" aria-label="Choose an emoji">
            {[
              "😀",
              "😂",
              "😍",
              "🥰",
              "😊",
              "👍",
              "🙏",
              "👏",
              "🎉",
              "❤️",
              "🔥",
              "😢",
              "😮",
              "🤔",
              "✅",
              "🌸",
            ].map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => {
                  setBody((value) => `${value}${emoji}`);
                  setShowEmoji(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </form>
      {error && <p className="composer-error">{error}</p>}
    </>
  );
}

function VoiceClip({ metadataJson }: { metadataJson?: string }) {
  try {
    const metadata = JSON.parse(metadataJson || "{}") as {
      url?: string;
      durationSeconds?: number;
    };
    return metadata.url ? (
      <div className="voice-clip">
        <span className="material-icons">graphic_eq</span>
        <audio
          controls
          preload="metadata"
          src={resolveCommunityMediaUrl(metadata.url)}
        />
        {metadata.durationSeconds ? (
          <small>{metadata.durationSeconds}s</small>
        ) : null}
      </div>
    ) : (
      <span>Voice message unavailable</span>
    );
  } catch {
    return <span>Voice message unavailable</span>;
  }
}
function ChatAttachment({ message }: { message: CommunityMessage }) {
  try {
    const metadata = JSON.parse(message.metadataJson || "{}") as {
      url?: string;
      thumbnailUrl?: string;
      mediaType?: string;
      fileName?: string;
      sizeBytes?: number;
    };
    if (!metadata.url) return <span>Attachment unavailable</span>;
    const name = metadata.fileName || "Attachment";
    const mediaUrl = resolveCommunityMediaUrl(metadata.url);
    const thumbnailUrl = resolveCommunityMediaUrl(metadata.thumbnailUrl);
    return (
      <div className="chat-attachment">
        {metadata.mediaType?.startsWith("image/") ? (
          <a href={mediaUrl} target="_blank" rel="noreferrer">
            <img src={thumbnailUrl || mediaUrl} alt={name} />
          </a>
        ) : metadata.mediaType?.startsWith("video/") ? (
          <video controls preload="metadata" src={mediaUrl} />
        ) : (
          <a
            className="chat-document"
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            download
          >
            <span className="material-icons">description</span>
            <span>
              <b>{name}</b>
              <small>
                {metadata.sizeBytes
                  ? `${(metadata.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                  : "Open attachment"}
              </small>
            </span>
            <span className="material-icons">download</span>
          </a>
        )}
        {message.body ? (
          <span className="chat-attachment-caption">{message.body}</span>
        ) : null}
      </div>
    );
  } catch {
    return <span>Attachment unavailable</span>;
  }
}
function ChatLocation({ metadataJson }: { metadataJson?: string }) {
  try {
    const metadata = JSON.parse(metadataJson || "{}") as {
      latitude?: number;
      longitude?: number;
      mapUrl?: string;
    };
    if (
      typeof metadata.latitude !== "number" ||
      typeof metadata.longitude !== "number"
    )
      return <span>Location unavailable</span>;
    const mapUrl =
      metadata.mapUrl ||
      `https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude}`;
    return (
      <a
        className="chat-location"
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span className="material-icons">location_on</span>
        <span>
          <b>Current location</b>
          <small>Open in Google Maps</small>
        </span>
        <span className="material-icons">open_in_new</span>
      </a>
    );
  } catch {
    return <span>Location unavailable</span>;
  }
}
function CreateEvent({
  done,
  location,
}: {
  done: () => Promise<void>;
  location: HomeSelectedLocation;
}) {
  const [pricing, setPricing] = useState<"FREE" | "PAID">("FREE");
  return (
    <Form
      label="Create event"
      submit={async (f) => {
        const start = new Date(String(f.get("start")));
        const currency = String(f.get("currency") || "INR");
        const capacity = Number(f.get("capacity")) || undefined;
        const event = await communityApi.createEvent({
          title: f.get("title"),
          eventMode: "IN_PERSON",
          country: f.get("country"),
          state: f.get("state"),
          city: f.get("city"),
          timeZone: "UTC",
          startAtUtc: start.toISOString(),
          endAtUtc: new Date(start.getTime() + 7200000).toISOString(),
          capacity,
          currency,
        });
        if (pricing === "PAID") {
          await communityApi.createEventTicket(event.id, {
            name: f.get("ticketName") || "General admission",
            price: Number(f.get("ticketPrice")),
            capacity,
            salesEndAtUtc: start.toISOString(),
            isEarlyBird: false,
          });
        }
        setPricing("FREE");
        await done();
      }}
    >
      <input name="title" required minLength={3} placeholder="Event title" />
      <CascadingLocationFields compact initialLocation={location} />
      <input name="start" type="datetime-local" required />
      <select name="pricing" value={pricing} onChange={(event) => setPricing(event.target.value as "FREE" | "PAID")} aria-label="Event pricing">
        <option value="FREE">Free event</option>
        <option value="PAID">Paid event</option>
      </select>
      <input name="capacity" type="number" min="1" placeholder="Maximum attendees" />
      {pricing === "PAID" && <>
        <input name="ticketName" required placeholder="Ticket name" defaultValue="General admission" />
        <input name="ticketPrice" type="number" required min="0.01" step="0.01" placeholder="Ticket price" />
        <select name="currency" defaultValue={location.countryName === "India" ? "INR" : location.countryName === "Canada" ? "CAD" : "USD"} aria-label="Ticket currency">
          <option value="INR">INR ₹</option><option value="USD">USD $</option><option value="CAD">CAD $</option>
        </select>
      </>}
    </Form>
  );
}
function CascadingLocationFields({
  compact = false,
  initialLocation,
}: {
  compact?: boolean;
  initialLocation?: HomeSelectedLocation;
}) {
  const [countries, setCountries] = useState<CountryOption[]>([]),
    [states, setStates] = useState<StateOption[]>([]),
    [cities, setCities] = useState<CityOption[]>([]),
    [country, setCountry] = useState<CountryOption>(),
    [state, setState] = useState<StateOption>(),
    [city, setCity] = useState<CityOption>(),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const countryRows = await getLocationCountries();
      if (!active) return;
      setCountries(countryRows);
      const selectedCountry = countryRows.find(
        (item) =>
          item.name.localeCompare(
            initialLocation?.countryName || "",
            undefined,
            { sensitivity: "accent" },
          ) === 0,
      );
      if (!selectedCountry) return;
      setCountry(selectedCountry);
      const stateRows = await getLocationStates(selectedCountry.id);
      if (!active) return;
      setStates(stateRows);
      const selectedState = stateRows.find(
        (item) =>
          item.name.localeCompare(initialLocation?.stateName || "", undefined, {
            sensitivity: "accent",
          }) === 0 ||
          item.code?.localeCompare(
            initialLocation?.stateName || "",
            undefined,
            { sensitivity: "accent" },
          ) === 0,
      );
      if (!selectedState) return;
      setState(selectedState);
      const cityRows = await getLocationCities(selectedState.id);
      if (!active) return;
      setCities(cityRows);
      setCity(
        cityRows.find(
          (item) =>
            item.name.localeCompare(
              initialLocation?.cityName || "",
              undefined,
              { sensitivity: "accent" },
            ) === 0,
        ),
      );
    })().finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [
    initialLocation?.cityName,
    initialLocation?.countryName,
    initialLocation?.stateName,
  ]);
  return (
    <div
      className={`community-location-fields community-cascade${compact ? " compact" : ""}`}
    >
      <input type="hidden" name="country" value={country?.name || ""} />
      <input type="hidden" name="state" value={state?.name || ""} />
      <input type="hidden" name="city" value={city?.name || ""} />
      <label>
        {compact ? null : <span>Country</span>}
        <select
          aria-label="Country"
          required
          value={country?.id || ""}
          onChange={async (event) => {
            const selected = countries.find(
              (item) => item.id === Number(event.target.value),
            );
            setCountry(selected);
            setState(undefined);
            setCity(undefined);
            setCities([]);
            setLoading(true);
            try {
              setStates(selected ? await getLocationStates(selected.id) : []);
            } finally {
              setLoading(false);
            }
          }}
        >
          <option value="">Select country</option>
          {countries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {compact ? null : <span>State / Province</span>}
        <select
          aria-label="State or province"
          required
          disabled={!country || loading}
          value={state?.id || ""}
          onChange={async (event) => {
            const selected = states.find(
              (item) => item.id === Number(event.target.value),
            );
            setState(selected);
            setCity(undefined);
            setLoading(true);
            try {
              setCities(selected ? await getLocationCities(selected.id) : []);
            } finally {
              setLoading(false);
            }
          }}
        >
          <option value="">
            {loading ? "Loading…" : "Select state / province"}
          </option>
          {states.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {compact ? null : <span>City</span>}
        <select
          aria-label="City"
          required
          disabled={!state || loading}
          value={city?.id || ""}
          onChange={(event) =>
            setCity(
              cities.find((item) => item.id === Number(event.target.value)),
            )
          }
        >
          <option value="">{loading ? "Loading…" : "Select city"}</option>
          {cities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
function NotificationDashboard({
  items,
  reload,
}: {
  items: Record<string, unknown>[];
  reload: () => Promise<void>;
}) {
  const [filter, setFilter] = useState("ALL");
  const categories = [
    "ALL",
    ...new Set(
      items.map((item) => String(item.notificationType || "COMMUNITY")),
    ),
  ];
  const visible =
      filter === "ALL"
        ? items
        : items.filter(
            (item) => String(item.notificationType || "COMMUNITY") === filter,
          ),
    unread = items.filter((item) => item.isRead !== true).length;
  return (
    <div className="notification-center">
      <div className="notification-overview">
        <div>
          <span className="material-icons">notifications_active</span>
          <div>
            <small>COMMUNITY ACTIVITY</small>
            <h2>Stay in the loop</h2>
            <p>Updates, invitations and conversations that matter to you.</p>
          </div>
        </div>
        <div className="notification-count">
          <strong>{unread}</strong>
          <span>Unread updates</span>
        </div>
      </div>
      <div className="notification-toolbar">
        <div>
          {categories.map((category) => (
            <button
              className={filter === category ? "active" : ""}
              key={category}
              onClick={() => setFilter(category)}
            >
              {category.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <span>
          {visible.length} notification{visible.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="notification-list">
        {visible.map((item, index) => {
          const type = String(item.notificationType || "COMMUNITY"),
            id = Number(item.id),
            isDemo = Number.isNaN(id),
            isRead = item.isRead === true,
            date = item.createdAtUtc
              ? new Date(String(item.createdAtUtc))
              : undefined;
          return (
            <article
              className={isRead ? "read" : "unread"}
              key={String(item.id ?? index)}
            >
              <div
                className={`notification-icon notification-${type.toLowerCase()}`}
              >
                <span className="material-icons">{notificationIcon(type)}</span>
              </div>
              <div className="notification-copy">
                <div>
                  <span>{type.replace(/_/g, " ")}</span>
                  {!isRead && <i>NEW</i>}
                </div>
                <h3>{String(item.title || "Community update")}</h3>
                <p>
                  {String(
                    item.body ||
                      "There is something new waiting for you in the community.",
                  )}
                </p>
                <small>
                  {date && !Number.isNaN(date.getTime())
                    ? date.toLocaleString()
                    : isDemo
                      ? "Getting started"
                      : "Date unavailable"}
                </small>
              </div>
              {!isRead && !isDemo && (
                <button
                  className="notification-read"
                  onClick={async () => {
                    await communityApi.readNotification(id);
                    await reload();
                  }}
                >
                  <span className="material-icons">done</span>Mark read
                </button>
              )}
              {Boolean(item.actionUrl) && (
                <Link
                  className="notification-open"
                  to={String(item.actionUrl)}
                  aria-label="Open notification"
                >
                  <span className="material-icons">arrow_forward</span>
                </Link>
              )}
            </article>
          );
        })}
        {!visible.length && (
          <div className="notification-empty">
            <span className="material-icons">notifications_none</span>
            <h3>You are all caught up</h3>
            <p>New community activity will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
function notificationIcon(type: string) {
  if (type.includes("EVENT")) return "event_available";
  if (type.includes("MESSAGE") || type.includes("CHAT")) return "chat_bubble";
  if (type.includes("INVIT")) return "mail";
  if (type.includes("GROUP")) return "groups";
  if (type.includes("WELCOME")) return "person";
  return "notifications";
}
function InvitationDashboard({ items }: { items: Record<string, unknown>[] }) {
  const published = items.filter((item) => item.status === "PUBLISHED").length;
  return (
    <>
      <div className="invitation-dashboard-head">
        <div>
          <h2>Your invitations</h2>
          <p>Design, publish and manage memorable celebrations.</p>
        </div>
        <Link className="invitation-create" to="/community/invitations/new">
          <span className="material-icons">add</span>Build an invitation
        </Link>
      </div>
      <div className="invitation-stats">
        <article>
          <span className="material-icons">mail</span>
          <div>
            <strong>{items.length}</strong>
            <small>Total invitations</small>
          </div>
        </article>
        <article>
          <span className="material-icons">send</span>
          <div>
            <strong>{published}</strong>
            <small>Published</small>
          </div>
        </article>
        <article>
          <span className="material-icons">event_available</span>
          <div>
            <strong>{items.length - published}</strong>
            <small>Drafts</small>
          </div>
        </article>
      </div>
      <InvitationCards items={items} />
    </>
  );
}
function InvitationCards({ items }: { items: Record<string, unknown>[] }) {
  return (
    <div className="invitation-card-grid">
      {items.map((item, index) => {
        const type = String(item.invitationType || "CUSTOM"),
          status = String(item.status || "DRAFT"),
          date = item.createdAtUtc
            ? new Date(String(item.createdAtUtc))
            : undefined,
          eventDate = item.eventDateUtc ? new Date(String(item.eventDateUtc)) : undefined,
          eventLocation = String(item.location || "Location pending"),
          coverImage = resolveCommunityMediaUrl(String(item.coverImageUrl || ""));
        return (
          <article
            className={`invitation-card invitation-${type.toLowerCase().replace(/_/g, "-")}`}
            key={String(item.id ?? index)}
          >
            <div className="invitation-card-art">
              {coverImage ? (
                <img src={coverImage} alt={`${String(item.title || type)} cover`} />
              ) : (
                <><span className="material-icons">{invitationIcon(type)}</span><small>{type.replace(/_/g, " ")}</small></>
              )}
            </div>
            <div className="invitation-card-content">
              <div className="invitation-badges">
                <span
                  className={status === "PUBLISHED" ? "published" : "draft"}
                >
                  {status}
                </span>
                <span>{String(item.visibility || "PRIVATE")}</span>
              </div>
              <h3>{String(item.title || "Untitled invitation")}</h3>
              <p>
                <span className="material-icons">event</span>
                {eventDate && !Number.isNaN(eventDate.getTime())
                  ? eventDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                  : date && !Number.isNaN(date.getTime())
                    ? `Created ${date.toLocaleDateString()}`
                    : "Date pending"}
              </p>
              <p><span className="material-icons">location_on</span>{eventLocation}</p>
              <Link className="invitation-edit-link" to={`/community/invitations/edit/${String(item.id)}`}>
                <span className="material-icons">edit</span>Edit invitation
              </Link>
              <Link to={`/community/invitations/manage/${String(item.id)}`}>
                <span className="material-icons">groups</span>Manage guests{" "}
                <b>→</b>
              </Link>
            </div>
          </article>
        );
      })}
      {!items.length && (
        <div className="invitation-empty">
          <span className="material-icons">mark_email_unread</span>
          <h3>Create your first invitation</h3>
          <p>Choose a beautiful template and invite your guests in minutes.</p>
          <Link to="/community/invitations/new">Get started</Link>
        </div>
      )}
    </div>
  );
}
function invitationIcon(type: string) {
  if (type === "WEDDING" || type === "ENGAGEMENT") return "favorite";
  if (type === "BIRTHDAY") return "cake";
  if (type === "HOUSEWARMING") return "home";
  if (type === "BABY_SHOWER") return "child_care";
  return "celebration";
}
function Profile() {
  const [me, setMe] = useState<{ id: number; displayName: string; publicId: string }>(),
    [stats, setStats] = useState({ groups: 0, conversations: 0, events: 0 });
  const [profileGroups, setProfileGroups] = useState<CommunityGroup[]>([]);
  const [profilePosts, setProfilePosts] = useState<CommunityPost[]>([]);
  const [profilePostsLoading, setProfilePostsLoading] = useState(true);
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [savedPrivacy, setSavedPrivacy] = useState<"PUBLIC" | "PRIVATE">(
    "PRIVATE",
  );
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState("");
  const [privacyError, setPrivacyError] = useState(false);
  const loadProfilePosts = useCallback(async () => {
    setProfilePostsLoading(true);
    try {
      const [identity, groupPage] = await Promise.all([
        enterCommunity(),
        communityApi.groups({ pageSize: 100 }),
      ]);
      const results = await Promise.allSettled(
        groupPage.items.map((group) => communityApi.posts(group.id)),
      );
      const ownPosts = results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value.items : [],
        )
        .filter((post) => post.authorUserId === identity.id)
        .sort(
          (left, right) =>
            new Date(right.publishedAtUtc || right.createdAtUtc).getTime() -
            new Date(left.publishedAtUtc || left.createdAtUtc).getTime(),
        );
      setProfileGroups(groupPage.items);
      setProfilePosts(ownPosts);
    } finally {
      setProfilePostsLoading(false);
    }
  }, []);
  useEffect(() => {
    Promise.all([
      enterCommunity(),
      communityApi.groups({ pageSize: 100 }),
      communityApi.conversations(),
      communityApi.events({ pageSize: 100 }),
      communityApi.messagingPrivacy(),
    ]).then(([identity, groups, conversations, events, privacySetting]) => {
      setMe(identity);
      setPrivacy(privacySetting.directMessagePrivacy);
      setSavedPrivacy(privacySetting.directMessagePrivacy);
      setStats({
        groups: groups.items.length,
        conversations: conversations.items.length,
        events: events.items.length,
      });
    });
    void loadProfilePosts();
  }, [loadProfilePosts]);
  const initial = me?.displayName?.charAt(0).toUpperCase() || "C";
  return (
    <div className="profile-dashboard">
      <section className="profile-identity">
        <div className="profile-cover">
          <div>
            <span>COMMUNITY MEMBER</span>
            <h2>Your ChaoDesi identity</h2>
          </div>
        </div>
        <div className="profile-person">
          <div className="profile-avatar">
            {initial}
            <i className="material-icons">verified</i>
          </div>
          <div>
            <h2>{me?.displayName || "Loading…"}</h2>
            <p>
              <span className="material-icons">location_on</span>Connected to
              your local community
            </p>
          </div>
          <span className="profile-status">
            <i></i> Active member
          </span>
        </div>
        <div className="profile-stats">
          <article>
            <strong>{stats.groups}</strong>
            <span>Communities</span>
          </article>
          <article>
            <strong>{stats.conversations}</strong>
            <span>Conversations</span>
          </article>
          <article>
            <strong>{stats.events}</strong>
            <span>Upcoming events</span>
          </article>
        </div>
        <div className="profile-id-card">
          <span className="material-icons">fingerprint</span>
          <div>
            <small>YOUR COMMUNITY ID</small>
            <strong>{me?.publicId || "Preparing your identity…"}</strong>
            <p>
              Use this secure ID when another community member wants to start a
              direct conversation.
            </p>
          </div>
          <span className="material-icons profile-lock">lock</span>
        </div>
        <section className="profile-privacy-card">
          <div className="profile-privacy-title">
            <div>
              <small>PROFILE PRIVACY</small>
              <h3>Who can contact you?</h3>
              <p>
                Changing this affects new customer requests only. Your existing
                conversations stay connected.
              </p>
            </div>
          </div>
          <div className="profile-privacy-options">
            <button
              type="button"
              className={privacy === "PUBLIC" ? "selected" : ""}
              onClick={() => {
                setPrivacy("PUBLIC");
                setPrivacyNotice("");
              }}
            >
              <span className="material-icons">public</span>
              <div>
                <strong>Public customer</strong>
                <small>
                  Any customer can start a conversation immediately.
                </small>
              </div>
              <span className="material-icons profile-privacy-check">
                check_circle
              </span>
            </button>
            <button
              type="button"
              className={privacy === "PRIVATE" ? "selected" : ""}
              onClick={() => {
                setPrivacy("PRIVATE");
                setPrivacyNotice("");
                setPrivacyError(false);
              }}
            >
              <span className="material-icons">lock</span>
              <div>
                <strong>Private customer</strong>
                <small>
                  New customers send a request that you approve first.
                </small>
              </div>
              <span className="material-icons profile-privacy-check">
                check_circle
              </span>
            </button>
          </div>
          <div className="profile-privacy-footer">
            <p>
              <span className="material-icons">verified_user</span>Existing
              customers and conversations will not be removed.
            </p>
            <button
              disabled={privacySaving || privacy === savedPrivacy}
              onClick={async () => {
                setPrivacySaving(true);
                setPrivacyNotice("");
                setPrivacyError(false);
                try {
                  await communityApi.setMessagingPrivacy(privacy);
                  setSavedPrivacy(privacy);
                  setPrivacyNotice(
                    `Profile changed to ${privacy === "PUBLIC" ? "Public" : "Private"}.`,
                  );
                } catch {
                  setPrivacyError(true);
                  setPrivacyNotice("Unable to update profile privacy.");
                } finally {
                  setPrivacySaving(false);
                }
              }}
            >
              {privacySaving ? "Saving…" : "Save privacy"}
            </button>
          </div>
          {privacyNotice ? (
            <p
              className={`profile-privacy-notice${privacyError ? " error" : ""}`}
            >
              {privacyNotice}
            </p>
          ) : null}
        </section>
      </section>
      <aside className="profile-side">
        <section>
          <div className="profile-completion">
            <strong>100%</strong>
            <span>Profile ready</span>
          </div>
          <h3>You’re ready to connect</h3>
          <p>
            Your identity is verified and available across Groups &amp;
            Communities.
          </p>
          <div className="profile-progress">
            <i></i>
          </div>
          <ul>
            <li>
              <span className="material-icons">check_circle</span>Community
              identity created
            </li>
            <li>
              <span className="material-icons">check_circle</span>Account access
              verified
            </li>
            <li>
              <span className="material-icons">check_circle</span>Local
              communities available
            </li>
          </ul>
        </section>
        <section className="profile-quick-links">
          <h3>Community shortcuts</h3>
          <Link to="/community/groups">
            <span className="material-icons">groups</span>
            <div>
              <strong>My groups</strong>
              <small>View your communities</small>
            </div>
            <b>→</b>
          </Link>
          <Link to="/community/messages">
            <span className="material-icons">chat</span>
            <div>
              <strong>Messages</strong>
              <small>Continue conversations</small>
            </div>
            <b>→</b>
          </Link>
          <Link to="/community/events">
            <span className="material-icons">event</span>
            <div>
              <strong>Events</strong>
              <small>Browse upcoming activities</small>
            </div>
            <b>→</b>
          </Link>
        </section>
      </aside>
      <section className="profile-posts-panel">
        <header>
          <div>
            <small>YOUR ACTIVITY</small>
            <h2>My posts</h2>
            <p>Everything you have shared across your communities.</p>
          </div>
          <strong>{profilePosts.length} posts</strong>
        </header>
        <div className="community-feed-composer profile-post-composer">
          <div className="feed-avatar">{initial}</div>
          <div>
            <strong>Create a new post</strong>
            <p>Add a title, caption, photo or video.</p>
          </div>
          <CreatePost
            groups={profileGroups}
            currentUserId={me?.id}
            done={loadProfilePosts}
          />
        </div>
        {profilePostsLoading ? (
          <div className="community-state">Loading your posts…</div>
        ) : (
          <PostCards
            posts={profilePosts}
            groups={profileGroups}
            reload={loadProfilePosts}
          />
        )}
      </section>
    </div>
  );
}
