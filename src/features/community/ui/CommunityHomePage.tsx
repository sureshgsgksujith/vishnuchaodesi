import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import { enterCommunity, getCommunityFeatureFlags } from "../api/communityApi";
import "./communityHome.css";

const panels = [
  { icon: "forum", title: "Community Feed", text: "Posts from groups you join and communities recommended for you.", action: "Open feed", href: "/community/feed", feature: "Groups" },
  { icon: "groups", title: "Recommended Groups", text: "Suggestions will adapt to your location, interests and activity.", action: "Discover communities", href: "/community/discover", feature: "Recommendations" },
  { icon: "event", title: "Upcoming Events", text: "Nearby events and events from your groups will appear here.", action: "Browse events", href: "/community/events", feature: "Events" },
  { icon: "mark_email_unread", title: "Invitations", text: "You have no pending personal invitations.", action: "Create an invitation", href: "/community/invitations/new", feature: "Invitations" },
  { icon: "chat", title: "Messages", text: "Unread direct and group conversations will appear here.", action: "Open messages", href: "/community/messages", feature: "DirectChat" },
  { icon: "local_fire_department", title: "Trending Near You", text: "Popular groups, posts and events in your selected area.", action: "See what’s trending", href: "/community", feature: "Recommendations" },
];

const panelId = (title: string) => title.toLowerCase().replace(/\s+/g, "-");

export default function CommunityHomePage() {
  const { activeCity, activeLocationLabel, currentCity, setHomeSelectedCity } = useHomeSelectedLocation();
  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const city = cityDraft ?? activeCity;
  const visiblePanels = panels.filter(panel => flags[panel.feature] === true);

  useEffect(() => {
    let active = true;
    Promise.all([enterCommunity(), getCommunityFeatureFlags()]).then(([, result]) => { if (active) { setFlags(result); setIsReady(true); } }).catch(() => active && setIsReady(true));
    return () => { active = false; };
  }, []);

  function saveLocation(event: FormEvent) {
    event.preventDefault();
    setHomeSelectedCity(city.trim());
    setCityDraft(null);
  }

  return <>
    <UserHomeHeader hideAddAction />
    <main className="community-home">
      <section className="community-hero">
        <div>
          <span className="community-eyebrow">ChaoDesi Groups &amp; Communities</span>
          <h1>Connect with your community</h1>
          <p>Find people, conversations and celebrations that feel close to home.</p>
        </div>
        <form className="community-location" onSubmit={saveLocation}>
          <label htmlFor="community-city">Your community location</label>
          <div>
            <span className="material-icons" aria-hidden="true">location_on</span>
            <input id="community-city" value={city} onChange={(event) => setCityDraft(event.target.value)} placeholder="Select a city" />
            <button type="submit">Apply</button>
          </div>
          <button type="button" className="community-near-me" onClick={() => { setCityDraft(null); setHomeSelectedCity(currentCity); }} disabled={!currentCity}>
            <span className="material-icons" aria-hidden="true">my_location</span> Near me
          </button>
          <small>{activeLocationLabel ? `Showing communities near ${activeLocationLabel}` : "Choose a city to personalize your community."}</small>
        </form>
      </section>

      <nav className="community-quick-nav" aria-label="Community sections">
        {visiblePanels.map((panel) => (
          <a key={panel.title} href={`#${panelId(panel.title)}`}>
            <span className="material-icons" aria-hidden="true">{panel.icon}</span>
            <span className="community-quick-nav-label">{panel.title}</span>
          </a>
        ))}
      </nav>

      <section className={`community-grid${isReady ? " is-ready" : ""}`} aria-live="polite">
        {visiblePanels.map((panel, index) => <article id={panelId(panel.title)} className={`community-panel community-panel-${index + 1}`} key={panel.title}>
          <header><span className="material-icons">{panel.icon}</span><div><h2>{panel.title}</h2>{index === 1 && activeCity ? <small>Near {activeCity}</small> : null}</div></header>
          <div className="community-empty"><span className="material-icons">{panel.icon}</span><p>{panel.text}</p></div>
          <Link to={panel.href}>{panel.action}<span aria-hidden="true">→</span></Link>
        </article>)}
        {isReady && visiblePanels.length === 0 ? <article className="community-panel"><div className="community-empty"><span className="material-icons">toggle_off</span><h2>Community features are currently disabled</h2><p>A Super Admin can enable individual capabilities when they are ready.</p></div></article> : null}
      </section>
    </main>
    <HomeFooterSection />
  </>;
}
