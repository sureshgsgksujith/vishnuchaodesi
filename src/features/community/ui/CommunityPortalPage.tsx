import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { communityApi, discoverCommunityWithFallback, type CommunityConversation, type CommunityEvent, type CommunityGroup, type CommunityMessage, type CommunityPost } from "../api/communityApi";
import { getCustomerToken } from "../../auth/utils/customerSession";
import { env } from "../../../app/config/env";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import "./communityPortal.css";

const nav = [["discover","Discover"],["groups","My Groups"],["feed","Feed"],["messages","Messages"],["events","Events"],["invitations","Invitations"],["gifts","Gifts"],["notifications","Notifications"],["profile","Profile"]];
export default function CommunityPortalPage() {
  const { section = "discover" } = useParams();
  return <><UserHomeHeader hideAddAction /><main className="community-portal"><header><div><span>ChaoDesi Groups &amp; Communities</span><h1>{nav.find(x=>x[0]===section)?.[1] || "Groups & Communities"}</h1></div><Link to="/community">Groups &amp; Communities home</Link></header><nav>{nav.map(([key,label])=><Link className={section===key?"active":""} key={key} to={`/community/${key}`}>{label}</Link>)}</nav><CommunitySection section={section}/></main><HomeFooterSection /></>;
}

function CommunitySection({section}:{section:string}) {
  const { activeCity } = useHomeSelectedLocation();
  const [groups,setGroups]=useState<CommunityGroup[]>([]), [posts,setPosts]=useState<CommunityPost[]>([]), [events,setEvents]=useState<CommunityEvent[]>([]);
  const [conversations,setConversations]=useState<CommunityConversation[]>([]), [messages,setMessages]=useState<CommunityMessage[]>([]), [selected,setSelected]=useState<number>();
  const [items,setItems]=useState<Record<string,unknown>[]>([]), [error,setError]=useState(""), [busy,setBusy]=useState(true);
  const reload=useCallback(async()=>{setBusy(true);setError("");try{
    if(section==="discover"){const x=await discoverCommunityWithFallback(activeCity || undefined);setGroups(x.groups);setEvents(x.events);}
    else if(section==="groups"||section==="feed"){const x=await communityApi.groups({pageSize:100});setGroups(x.items);if(section==="feed"&&x.items[0])setPosts((await communityApi.posts(x.items[0].id)).items);}
    else if(section==="messages")setConversations((await communityApi.conversations()).items);
    else if(section==="events")setEvents((await communityApi.events({pageSize:100})).items);
    else if(section==="invitations")setItems((await communityApi.invitations()).items);
    else if(section==="notifications")setItems((await communityApi.notifications()).items);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load Community data.");}finally{setBusy(false)}},[activeCity,section]);
  useEffect(()=>{void reload()},[reload]);
  useEffect(()=>{
    if(section!=="messages"||!selected)return;
    const apiBase=import.meta.env.VITE_API_BASE_URL||env.apiBaseUrl;
    const connection=new HubConnectionBuilder().withUrl(`${apiBase.replace(/\/api\/?$/i,"")}/hubs/community`,{accessTokenFactory:()=>getCustomerToken()||""}).withAutomaticReconnect([0,2000,5000,10000]).configureLogging(LogLevel.Warning).build();
    connection.on("message",(message:CommunityMessage)=>{if(message.conversationId===selected)setMessages(current=>current.some(x=>x.id===message.id)?current:[message,...current])});
    void connection.start().then(()=>connection.invoke("JoinConversation",selected)).catch(()=>undefined);
    return()=>{void connection.invoke("LeaveConversation",selected).catch(()=>undefined).finally(()=>connection.stop())};
  },[section,selected]);
  if(busy)return <div className="community-state">Loading…</div>;
  return <section className="community-workspace">{error&&<p className="community-error">{error}</p>}
    {section==="discover"&&<><h2>Recommended groups</h2><GroupCards groups={groups} reload={reload}/><h2>Upcoming near you</h2><EventCards events={events}/></>}
    {section==="groups"&&<><CreateGroup done={reload}/><GroupCards groups={groups} reload={reload}/></>}
    {section==="feed"&&<><GroupPicker groups={groups} onPick={async id=>setPosts((await communityApi.posts(id)).items)}/><CreatePost groups={groups} done={reload}/><PostCards posts={posts}/></>}
    {section==="messages"&&<div className="community-messages"><aside><StartDirect done={reload}/>{conversations.map(c=><button key={c.id} onClick={async()=>{setSelected(c.id);setMessages((await communityApi.messages(c.id)).items)}}>{c.title||c.conversationType}<small>{c.unreadCount} unread</small></button>)}</aside><div>{selected?<><div className="message-list">{messages.map(m=><p key={m.id}><strong>{m.senderName}</strong>{m.body}<small>{new Date(m.sentAtUtc).toLocaleString()}</small></p>)}</div><SendMessage id={selected} done={async()=>setMessages((await communityApi.messages(selected)).items)}/></>:<div className="community-state">Select a conversation</div>}</div></div>}
    {section==="events"&&<><CreateEvent done={reload}/><EventCards events={events} register/></>}
    {section==="invitations"&&<><Link className="community-primary" to="/community/invitations/new">Build an invitation</Link><InvitationCards items={items}/></>}
    {section==="gifts"&&<CreateRegistry/>}{section==="notifications"&&<ObjectCards items={items} empty="You are all caught up."/>}
    {section==="profile"&&<Profile/>}
  </section>;
}

function GroupCards({groups,reload}:{groups:CommunityGroup[];reload:()=>Promise<void>}){return <div className="community-cards">{groups.map(g=><article key={g.id}><span>{g.visibility}</span><h3>{g.name}</h3><p>{g.description||`${g.memberCount} members${g.city?` · ${g.city}`:""}`}</p><div><Link to={`/community/groups/${g.slug}`}>View</Link>{!g.currentUserRole&&<button onClick={async()=>{await communityApi.joinGroup(g.id);await reload()}}>Join</button>}</div></article>)}{!groups.length&&<div className="community-state">No groups found.</div>}</div>}
function EventCards({events,register}:{events:CommunityEvent[];register?:boolean}){return <div className="community-cards">{events.map(e=><article key={e.id}><span>{e.eventMode}</span><h3>{e.title}</h3><p>{new Date(e.startAtUtc).toLocaleString()} · {e.city||e.venueName||"Online"}</p>{register&&<button onClick={()=>communityApi.registerEvent(e.id,"Community guest")}>RSVP</button>}</article>)}{!events.length&&<div className="community-state">No upcoming events.</div>}</div>}
function PostCards({posts}:{posts:CommunityPost[]}){return <div className="community-feed">{posts.map(p=><article key={p.id}><small>{p.authorName}</small><h3>{p.title}</h3><p>{p.body}</p><button onClick={()=>communityApi.react(p.id)}>♡ {p.reactionCount}</button><span>{p.commentCount} comments</span></article>)}{!posts.length&&<div className="community-state">No posts yet.</div>}</div>}
function Form({submit,children,label}:{submit:(f:FormData)=>Promise<void>;children:React.ReactNode;label:string}){const [saving,setSaving]=useState(false);return <form className="community-form" onSubmit={async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setSaving(true);try{await submit(new FormData(e.currentTarget));e.currentTarget.reset()}finally{setSaving(false)}}}>{children}<button disabled={saving}>{saving?"Saving…":label}</button></form>}
function CreateGroup({done}:{done:()=>Promise<void>}){return <Form label="Create group" submit={async f=>{await communityApi.createGroup({name:f.get("name"),description:f.get("description"),visibility:f.get("visibility"),city:f.get("city")});await done()}}><input name="name" required minLength={3} placeholder="Group name"/><input name="city" placeholder="City"/><select name="visibility"><option>PUBLIC</option><option>PRIVATE</option><option>INVITE_ONLY</option></select><textarea name="description" placeholder="Description"/></Form>}
function CreatePost({groups,done}:{groups:CommunityGroup[];done:()=>Promise<void>}){return <Form label="Publish post" submit={async f=>{await communityApi.createPost({groupId:Number(f.get("groupId")),postType:"TEXT",body:f.get("body")});await done()}}><select name="groupId" required>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select><textarea name="body" required placeholder="Share with your community…"/></Form>}
function GroupPicker({groups,onPick}:{groups:CommunityGroup[];onPick:(id:number)=>void}){return <select className="community-picker" onChange={e=>onPick(Number(e.target.value))}>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select>}
function StartDirect({done}:{done:()=>Promise<void>}){return <Form label="Start chat" submit={async f=>{await communityApi.startDirect(Number(f.get("userId")));await done()}}><input name="userId" type="number" min="1" required placeholder="Community user ID"/></Form>}
function SendMessage({id,done}:{id:number;done:()=>Promise<void>}){return <Form label="Send" submit={async f=>{await communityApi.sendMessage(id,String(f.get("body")));await done()}}><input name="body" required placeholder="Write a message"/></Form>}
function CreateEvent({done}:{done:()=>Promise<void>}){return <Form label="Create event" submit={async f=>{const start=new Date(String(f.get("start")));await communityApi.createEvent({title:f.get("title"),eventMode:"IN_PERSON",city:f.get("city"),timeZone:"UTC",startAtUtc:start.toISOString(),endAtUtc:new Date(start.getTime()+7200000).toISOString(),currency:"USD"});await done()}}><input name="title" required minLength={3} placeholder="Event title"/><input name="city" placeholder="City"/><input name="start" type="datetime-local" required/></Form>}
function CreateRegistry(){const [result,setResult]=useState("");return <><h2>Gift registry</h2><Form label="Create registry" submit={async f=>{const x=await communityApi.createRegistry({title:f.get("title"),description:f.get("description"),visibility:f.get("visibility")});setResult(`Registry created: ${JSON.stringify(x)}`)}}><input name="title" required placeholder="Registry title"/><select name="visibility"><option>PRIVATE</option><option>INVITEES</option><option>PUBLIC</option></select><textarea name="description" placeholder="Description"/></Form>{result&&<p>{result}</p>}</>}
function ObjectCards({items,empty}:{items:Record<string,unknown>[];empty:string}){return <div className="community-cards">{items.map((x,i)=><article key={String(x.id??i)}><h3>{String(x.title??x.notificationType??"Community item")}</h3><p>{String(x.body??x.status??"")}</p></article>)}{!items.length&&<div className="community-state">{empty}</div>}</div>}
function InvitationCards({items}:{items:Record<string,unknown>[]}){return <div className="community-cards">{items.map((item,index)=><article key={String(item.id??index)}><span>{String(item.invitationType||"Invitation")}</span><h3>{String(item.title)}</h3><p>{String(item.status)} · {String(item.visibility)}</p><Link to={`/community/invitations/manage/${String(item.id)}`}>Manage guests</Link></article>)}{!items.length&&<div className="community-state">No invitations yet.</div>}</div>}
function Profile(){const [me,setMe]=useState<{displayName:string;publicId:string}>();useEffect(()=>{import("../api/communityApi").then(x=>x.enterCommunity()).then(setMe)},[]);return <article className="community-profile"><span className="material-icons">account_circle</span><h2>{me?.displayName||"Loading…"}</h2><p>Community ID: {me?.publicId}</p><small>Your Community identity is isolated from legacy business tables.</small></article>}
