import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { communityApi, type CommunityFriendProfile } from "../api/communityApi";
import "./friendProfile.css";

export default function FriendProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<CommunityFriendProfile>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = async () => { try { setProfile(await communityApi.friendProfile(Number(id))); } catch { setError("This customer profile is unavailable."); } };
  useEffect(() => { void load(); }, [id]);
  const connect = async () => { if (!profile || working) return; setWorking(true); try { if (profile.canAccept && profile.conversationId) await communityApi.acceptConversation(profile.conversationId); else await communityApi.startDirect(profile.id); await load(); } finally { setWorking(false); } };
  return <><UserHomeHeader hideAddAction /><main className="friend-profile-page">
    <Link className="friend-back" to="/community/friends"><span className="material-icons">arrow_back</span> My Friends</Link>
    {error ? <div className="friend-profile-error">{error}</div> : !profile ? <div className="friend-profile-loading">Loading profile…</div> : <>
      <section className="friend-cover"><div className="friend-cover-pattern"/><div className="friend-avatar">{profile.profileImageUrl ? <img src={profile.profileImageUrl} alt=""/> : <span>{profile.displayName.charAt(0).toUpperCase()}</span>}</div></section>
      <section className="friend-profile-main"><div className="friend-identity"><h1>{profile.displayName}{profile.isVerified && <span className="material-icons" title="Verified">verified</span>}</h1><p><span className="material-icons">public</span> ChaoDesi community member</p><small>Member since {new Date(profile.createdAtUtc).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</small></div>
        <div className="friend-actions">
          {profile.connectionStatus === "ACTIVE" ? <><span className="friend-connected"><span className="material-icons">people</span> Friends</span><Link to="/community/messages"><span className="material-icons">chat</span> Message</Link></> : profile.connectionStatus === "REQUESTED" ? profile.canAccept ? <button onClick={() => void connect()} disabled={working}><span className="material-icons">person_add</span> Accept request</button> : <span className="friend-pending"><span className="material-icons">schedule</span> Request sent</span> : <button onClick={() => void connect()} disabled={working}><span className="material-icons">person_add</span>{profile.directMessagePrivacy === "PUBLIC" ? " Add friend" : " Send request"}</button>}
        </div>
      </section>
      <div className="friend-profile-grid"><section><h2>About</h2><div className="friend-about-row"><span className="material-icons">fingerprint</span><div><strong>Community ID</strong><small>{profile.publicId}</small></div></div><div className="friend-about-row"><span className="material-icons">shield</span><div><strong>Privacy protected</strong><small>Email and mobile number are hidden.</small></div></div></section>
        <section><h2>Mutual communities <b>{profile.mutualGroups.length}</b></h2>{profile.mutualGroups.length ? <div className="mutual-groups">{profile.mutualGroups.map(group => <Link key={group.id} to={`/community/groups/${group.slug}`}><span className="material-icons">groups</span><strong>{group.name}</strong><small>View community</small></Link>)}</div> : <p className="friend-no-mutual">You do not share any communities yet.</p>}</section>
      </div>
    </>}
  </main><HomeFooterSection /></>;
}
