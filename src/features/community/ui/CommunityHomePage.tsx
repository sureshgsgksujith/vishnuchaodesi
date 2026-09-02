import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import { getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import { communityApi, discoverCommunityWithFallback, enterCommunity, getCommunityFeatureFlags, type CommunityConversation, type CommunityEvent, type CommunityGroup, type CommunityPost } from "../api/communityApi";
import "./communityHome.css";

const panels = [
  { icon: "forum", title: "Community Feed", text: "Posts from groups you join and communities recommended for you.", action: "Open feed", href: "/community/feed", feature: "Groups" },
  { icon: "groups", title: "Recommended Groups", text: "Suggestions will adapt to your location, interests and activity.", action: "Discover communities", href: "/community/discover", feature: "Recommendations" },
  { icon: "event", title: "Upcoming Events", text: "Nearby events and events from your groups will appear here.", action: "Browse events", href: "/community/events", feature: "Events" },
  { icon: "mark_email_unread", title: "Invitations", text: "You have no pending personal invitations.", action: "Create an invitation", href: "/community/invitations/new", feature: "Invitations" },
  { icon: "chat", title: "Messages", text: "Unread direct and group conversations will appear here.", action: "Open messages", href: "/community/messages", feature: "DirectChat" },
  { icon: "local_fire_department", title: "Trending Near You", text: "Popular groups, posts and events in your selected area.", action: "See what’s trending", href: "/community/discover", feature: "Recommendations" },
];

const panelId = (title: string) => title.toLowerCase().replace(/\s+/g, "-");

export default function CommunityHomePage() {
  const { activeCity, activeLocation, activeLocationLabel, currentCity, currentLocation, setHomeSelectedLocation } = useHomeSelectedLocation();
  const [showLocation, setShowLocation] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [conversations, setConversations] = useState<CommunityConversation[]>([]);
  const [invitations, setInvitations] = useState<Record<string, unknown>[]>([]);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isShowingAllCities, setIsShowingAllCities] = useState(false);
  const visiblePanels = panels.filter(panel => flags[panel.feature] === true);

  useEffect(() => {
    let active = true;
    Promise.all([enterCommunity(), getCommunityFeatureFlags()]).then(([, result]) => { if (active) { setFlags(result); setIsReady(true); } }).catch(() => active && setIsReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    discoverCommunityWithFallback({city:activeLocation.cityName||undefined,state:activeLocation.stateName||undefined,country:activeLocation.countryName||undefined})
      .then(async result => {
        const [allGroupsResult, conversationsResult, invitationsResult, notificationsResult] = await Promise.allSettled([
          withRetry(() => communityApi.groups({ page: 1, pageSize: 100 })), withRetry(() => communityApi.conversations()), withRetry(() => communityApi.invitations()), withRetry(() => communityApi.notifications())
        ]);
        const allGroups = allGroupsResult.status === "fulfilled" ? allGroupsResult.value.items : [];
        const mergedGroups = [...result.groups, ...allGroups].filter((group, index, list) => list.findIndex(item => item.id === group.id) === index);
        const postResults = await Promise.allSettled(mergedGroups.slice(0, 8).map(group => withRetry(() => communityApi.posts(group.id))));
        const allPosts = postResults.flatMap(item => item.status === "fulfilled" ? item.value.items : [])
          .filter((post, index, list) => list.findIndex(item => item.id === post.id) === index)
          .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
        if (!active) return;
        setGroups(mergedGroups); setEvents(result.events); setPosts(allPosts);
        setConversations(conversationsResult.status === "fulfilled" ? conversationsResult.value.items : []);
        setInvitations(invitationsResult.status === "fulfilled" ? invitationsResult.value.items : []);
        const loadedNotifications = notificationsResult.status === "fulfilled" ? notificationsResult.value.items : [];
        setNotifications(loadedNotifications.length ? loadedNotifications : demoNotifications);
        setLoadError(""); setIsShowingAllCities(result.isShowingAllCities);
      })
      .catch(() => { if (active) setLoadError("Community previews could not be loaded. Please try again."); });
    return () => { active = false; };
  }, [activeCity, activeLocation.countryName, activeLocation.stateName, isReady]);

  return <>
    <UserHomeHeader hideAddAction />
    <main className="community-home">
      <section className="community-hero">
        <div>
          <span className="community-eyebrow">ChaoDesi Groups &amp; Communities</span>
          <h1>Connect with your community</h1>
          <p>Find people, conversations and celebrations that feel close to home.</p>
          <div className="community-hero-stats"><span><b>{groups.length}</b> communities</span><span><b>{posts.length}</b> updates</span><span><b>{events.length}</b> events</span></div>
        </div>
        <div className="community-location">
          <label htmlFor="community-city">Your community location</label>
          <div>
            <span className="material-icons" aria-hidden="true">location_on</span>
            <input id="community-city" value={activeLocationLabel} readOnly aria-label="Location selected at the top of the page" />
            <button type="button" onClick={()=>setShowLocation(true)}>Change</button>
          </div>
          <button type="button" className="community-near-me" onClick={() => setHomeSelectedLocation({cityName:currentCity,stateName:currentLocation.state||"",countryName:currentLocation.country||""})} disabled={!currentCity}>
            <span className="material-icons" aria-hidden="true">my_location</span> Near me
          </button>
          <small>{activeLocationLabel ? `Using top location: ${activeLocationLabel}` : "Choose country, state and city from the top location selector."}</small>
        </div>
      </section>
      {showLocation?<CommunityLocationModal initial={activeLocation} close={()=>setShowLocation(false)} apply={location=>{setHomeSelectedLocation(location);setShowLocation(false)}}/>:null}

      <nav className="community-quick-nav" aria-label="Community sections">
        {visiblePanels.map((panel) => (
          <a key={panel.title} href={`#${panelId(panel.title)}`}>
            <span className="material-icons" aria-hidden="true">{panel.icon}</span>
            <span className="community-quick-nav-label">{panel.title}</span>
          </a>
        ))}
      </nav>

      {loadError ? <p className="community-home-error">{loadError}</p> : null}
      {isShowingAllCities ? <p className="community-home-notice"><span className="material-icons" aria-hidden="true">travel_explore</span>No communities were found near {activeCity}. Showing popular communities from all locations.</p> : null}
      <section className={`community-grid${isReady ? " is-ready" : ""}`} aria-live="polite">
        {visiblePanels.map((panel, index) => <article id={panelId(panel.title)} className={`community-panel community-panel-${index + 1}`} key={panel.title}>
          <header><span className="material-icons">{panel.icon}</span><div><h2>{panel.title}</h2>{index === 1 && activeCity ? <small>Near {activeCity}</small> : null}</div></header>
          <PanelPreview title={panel.title} text={panel.text} icon={panel.icon} groups={groups} events={events} posts={posts} conversations={conversations} invitations={invitations} notifications={notifications} />
          <Link to={panel.href}>{panel.action}<span aria-hidden="true">→</span></Link>
        </article>)}
        {isReady && visiblePanels.length === 0 ? <article className="community-panel"><div className="community-empty"><span className="material-icons">toggle_off</span><h2>Community features are currently disabled</h2><p>A Super Admin can enable individual capabilities when they are ready.</p></div></article> : null}
      </section>
    </main>
    <HomeFooterSection />
  </>;
}

function CommunityLocationModal({initial,close,apply}:{initial:{countryName?:string;stateName?:string;cityName?:string};close:()=>void;apply:(location:{countryName:string;stateName:string;cityName:string})=>void}){
  const [countries,setCountries]=useState<CountryOption[]>([]),[states,setStates]=useState<StateOption[]>([]),[cities,setCities]=useState<CityOption[]>([]);
  const [country,setCountry]=useState<CountryOption>(),[state,setState]=useState<StateOption>(),[city,setCity]=useState<CityOption>();
  const [countrySearch,setCountrySearch]=useState(""),[stateSearch,setStateSearch]=useState(""),[citySearch,setCitySearch]=useState("");
  const [loadingCountries,setLoadingCountries]=useState(true),[loadingStates,setLoadingStates]=useState(false),[loadingCities,setLoadingCities]=useState(false);
  const matching=(value:string,query:string)=>value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const visibleCountries=useMemo(()=>countries.filter(item=>matching(item.name,countrySearch)),[countries,countrySearch]);
  const visibleStates=useMemo(()=>states.filter(item=>matching(`${item.name} ${item.code}`,stateSearch)),[states,stateSearch]);
  const visibleCities=useMemo(()=>cities.filter(item=>matching(item.name,citySearch)),[cities,citySearch]);
  useEffect(()=>{let active=true;void(async()=>{try{const countryRows=await getLocationCountries();if(!active)return;setCountries(countryRows);const selectedCountry=countryRows.find(item=>item.name.localeCompare(initial.countryName||"",undefined,{sensitivity:"accent"})===0);if(!selectedCountry)return;setCountry(selectedCountry);setLoadingStates(true);const stateRows=await getLocationStates(selectedCountry.id);if(!active)return;setStates(stateRows);const selectedState=stateRows.find(item=>item.name.localeCompare(initial.stateName||"",undefined,{sensitivity:"accent"})===0||item.code.localeCompare(initial.stateName||"",undefined,{sensitivity:"accent"})===0);if(!selectedState)return;setState(selectedState);setLoadingCities(true);const cityRows=await getLocationCities(selectedState.id);if(!active)return;setCities(cityRows);setCity(cityRows.find(item=>item.name.localeCompare(initial.cityName||"",undefined,{sensitivity:"accent"})===0))}finally{if(active){setLoadingCountries(false);setLoadingStates(false);setLoadingCities(false)}}})();return()=>{active=false}},[initial.cityName,initial.countryName,initial.stateName]);
  async function changeCountry(id:number){const next=countries.find(item=>item.id===id);setCountry(next);setState(undefined);setCity(undefined);setStateSearch("");setCitySearch("");setStates([]);setCities([]);if(!next)return;setLoadingStates(true);try{setStates(await getLocationStates(next.id))}finally{setLoadingStates(false)}}
  async function changeState(id:number){const next=states.find(item=>item.id===id);setState(next);setCity(undefined);setCitySearch("");setCities([]);if(!next)return;setLoadingCities(true);try{setCities(await getLocationCities(next.id))}finally{setLoadingCities(false)}}
  return <div className="community-location-modal" role="dialog" aria-modal="true" aria-labelledby="community-location-title" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><section><header><div><span className="material-icons">location_on</span><div><small>PERSONALIZE YOUR COMMUNITY</small><h2 id="community-location-title">Change your location</h2></div></div><button aria-label="Close location selector" onClick={close}>×</button></header><p>Search and choose country, state and city. The selection updates all location-aware sections.</p><div className="community-location-selects"><label>Country<div className="location-search"><span className="material-icons">search</span><input value={countrySearch} onChange={event=>setCountrySearch(event.target.value)} placeholder="Search country"/></div><select size={Math.min(5,Math.max(2,visibleCountries.length))} value={country?.id||""} disabled={loadingCountries} onChange={event=>void changeCountry(Number(event.target.value))}>{visibleCountries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>State / Province<div className="location-search"><span className="material-icons">search</span><input value={stateSearch} onChange={event=>setStateSearch(event.target.value)} placeholder="Search state" disabled={!country}/></div><select size={Math.min(5,Math.max(2,visibleStates.length))} value={state?.id||""} disabled={!country||loadingStates} onChange={event=>void changeState(Number(event.target.value))}>{visibleStates.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>City<div className="location-search"><span className="material-icons">search</span><input value={citySearch} onChange={event=>setCitySearch(event.target.value)} placeholder="Search city" disabled={!state}/></div><select size={Math.min(5,Math.max(2,visibleCities.length))} value={city?.id||""} disabled={!state||loadingCities} onChange={event=>setCity(cities.find(item=>item.id===Number(event.target.value)))}>{visibleCities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>{loadingCountries||loadingStates||loadingCities?<div className="community-location-loading"><span></span>{loadingCountries?"Loading countries…":loadingStates?"Loading states…":"Loading cities…"}</div>:null}<footer><button className="secondary" onClick={close}>Cancel</button><button disabled={!country||!state||!city} onClick={()=>country&&state&&city&&apply({countryName:country.name,stateName:state.name,cityName:city.name})}>Apply location</button></footer></section></div>}

function PanelPreview({ title, text, icon, groups, events, posts, conversations, invitations, notifications }: { title: string; text: string; icon: string; groups: CommunityGroup[]; events: CommunityEvent[]; posts: CommunityPost[]; conversations: CommunityConversation[]; invitations: Record<string, unknown>[]; notifications: Record<string, unknown>[] }) {
  if (title === "Community Feed" && posts.length) {
    return <div className="community-preview-list community-preview-feed">{posts.slice(0, 4).map(post => <Link key={post.id} to="/community/feed"><strong>{post.authorName}</strong><span>{post.title || post.body}</span><small>{post.reactionCount} reactions · {post.commentCount} comments</small></Link>)}</div>;
  }
  if (title === "Recommended Groups" || title === "Trending Near You") {
    const preview = groups.slice(0, title === "Trending Near You" ? 2 : 3);
    if (preview.length) return <div className="community-preview-list">{preview.map(group => <Link key={group.id} to={`/community/groups/${group.slug || toGroupSlug(group.name)}`}><strong>{group.name}</strong><small>{group.memberCount} members{group.city ? ` · ${group.city}` : ""}</small></Link>)}</div>;
  }
  if (title === "Upcoming Events" && events.length) {
    return <div className="community-preview-list">{events.slice(0, 3).map(event => <Link key={event.id} to="/community/events"><strong>{event.title}</strong><small>{new Date(event.startAtUtc).toLocaleDateString()} · {event.city || event.venueName || "Online"}</small></Link>)}</div>;
  }
  if (title === "Invitations" && invitations.length) {
    return <div className="community-preview-list">{invitations.slice(0, 3).map((item, index) => <Link key={String(item.id ?? index)} to={`/community/invitations/manage/${String(item.id)}`}><strong>{String(item.title || "Community invitation")}</strong><small>{String(item.invitationType || "CUSTOM").replace(/_/g, " ")} · {String(item.status || "DRAFT")}</small></Link>)}</div>;
  }
  if (title === "Messages" && conversations.length) {
    return <div className="community-preview-list">{conversations.slice(0, 3).map(item => <Link key={item.id} to="/community/messages"><strong>{item.title || "Community member"}</strong><span>{item.status === "REQUESTED" ? "New message request" : "Continue your conversation"}</span><small>{item.unreadCount} unread message{item.unreadCount === 1 ? "" : "s"}</small></Link>)}</div>;
  }
  if (title === "Trending Near You" && notifications.length) {
    return <div className="community-preview-list">{notifications.slice(0, 2).map((item, index) => <Link key={String(item.id ?? index)} to="/community/notifications"><strong>{String(item.title || item.notificationType || "Community update")}</strong><span>{String(item.body || "See what is happening in your community.")}</span></Link>)}</div>;
  }
  return <div className="community-empty"><span className="material-icons">{icon}</span><p>{text}</p></div>;
}

function toGroupSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const demoNotifications: Record<string, unknown>[] = [
  { id: "welcome", title: "Welcome to ChaoDesi Community", body: "Explore local groups, introduce yourself and connect with neighbors." },
  { id: "event", title: "Community events this week", body: "Three local celebrations are accepting RSVPs now." },
  { id: "conversation", title: "Keep the conversation going", body: "Visit Messages to connect directly with community members." }
];

async function withRetry<T>(request: () => Promise<T>): Promise<T> {
  try { return await request(); }
  catch { await new Promise(resolve => window.setTimeout(resolve, 350)); return request(); }
}
