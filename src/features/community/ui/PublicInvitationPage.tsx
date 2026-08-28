import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { communityApi } from "../api/communityApi";
import "./communityPortal.css";

export default function PublicInvitationPage() {
  const { token = "" } = useParams();
  const [data,setData]=useState<Record<string,unknown>>(), [guestToken,setGuestToken]=useState(""), [error,setError]=useState(""), [sent,setSent]=useState(false);
  async function open(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);try{setData(await communityApi.accessInvitation({publicToken:token,guestToken:form.get("guestToken")||undefined,accessCode:form.get("accessCode")||undefined}));setGuestToken(String(form.get("guestToken")||""));setError("")}catch{setError("The invitation or access details are invalid.")}}
  async function rsvp(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);await communityApi.rsvpInvitation(Number(data?.id),{guestToken,status:form.get("status"),attendingCount:Number(form.get("attendingCount")),plusOnes:Number(form.get("plusOnes"))});setSent(true)}
  const functions=Array.isArray(data?.functions)?data.functions as Record<string,unknown>[]:[];
  return <main className="community-portal"><header><div><span>ChaoDesi invitation</span><h1>{String(data?.title||"Open your invitation")}</h1></div></header><section className="community-workspace">{!data?<form className="community-form" onSubmit={open}><input name="guestToken" placeholder="Guest token (if provided)"/><input name="accessCode" type="password" placeholder="Private access code"/><button>Open invitation</button></form>:<><p>{String(data.message||"")}</p><h3>{String(data.hostDetails||"")}</h3><div className="community-cards">{functions.map((item,index)=><article key={String(item.id??index)}><h3>{String(item.name)}</h3><p>{new Date(String(item.startAtUtc)).toLocaleString()} · {String(item.venueName||"")}</p>{item.mapUrl?<a href={String(item.mapUrl)} target="_blank" rel="noreferrer">Map</a>:null}</article>)}</div>{guestToken&&!sent?<form className="community-form" onSubmit={rsvp}><select name="status"><option>ACCEPTED</option><option>MAYBE</option><option>DECLINED</option></select><input name="attendingCount" type="number" min="0" defaultValue="1"/><input name="plusOnes" type="number" min="0" defaultValue="0"/><button>Send RSVP</button></form>:null}{sent?<p className="community-state">Thank you. Your RSVP was recorded.</p>:null}</>}{error&&<p className="community-error">{error}</p>}</section></main>;
}
