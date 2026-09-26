import { useEffect, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { env } from "../../../app/config/env";
import { getCustomerToken } from "../../auth/utils/customerSession";

type CallMode = "audio" | "video";
type IncomingCall = { callId: string; mode: CallMode; callerUserId: number; callerName: string };
type ActiveCall = { callId: string; mode: CallMode; callerUserId: number; status: string };

export default function CommunityCallControls({
  conversationId,
  currentUserId,
  title,
}: {
  conversationId: number;
  currentUserId?: number;
  title: string;
}) {
  const connectionRef = useRef<HubConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<number, RTCPeerConnection>());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall>();
  const [active, setActive] = useState<ActiveCall>();
  const activeRef = useRef<ActiveCall | undefined>(undefined);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [error, setError] = useState("");

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  }, [active]);

  const closeCall = (notify = false) => {
    const call = activeRef.current;
    if (notify && call && connectionRef.current?.state === "Connected")
      void connectionRef.current.invoke("EndCall", conversationId, call.callId);
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setRemoteStreams(new Map());
    setIncoming(undefined);
    setActive(undefined);
  };

  const getLocalStream = async (mode: CallMode) => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPeer = async (remoteUserId: number) => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing) return existing;
    const call = activeRef.current;
    if (!call) throw new Error("Call is not active.");
    const stream = await getLocalStream(call.mode);
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.onicecandidate = (event) => {
      if (event.candidate)
        void connectionRef.current?.invoke("CallSignal", conversationId, call.callId, remoteUserId, "ice", JSON.stringify(event.candidate));
    };
    peer.ontrack = (event) => {
      const remote = event.streams[0];
      setRemoteStreams((current) => new Map(current).set(remoteUserId, remote));
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState))
        setRemoteStreams((current) => { const next = new Map(current); next.delete(remoteUserId); return next; });
    };
    peersRef.current.set(remoteUserId, peer);
    return peer;
  };

  const offerTo = async (remoteUserId: number) => {
    const call = activeRef.current;
    if (!call) return;
    const peer = await createPeer(remoteUserId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await connectionRef.current?.invoke("CallSignal", conversationId, call.callId, remoteUserId, "offer", JSON.stringify(offer));
  };

  useEffect(() => {
    let disposed = false;
    const token = getCustomerToken();
    const apiBase = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;
    const hubUrl = `${new URL(apiBase, window.location.origin).origin}/hubs/community`;
    const connection = new HubConnectionBuilder().withUrl(hubUrl, {
      accessTokenFactory: () => token || "",
      withCredentials: false,
    }).withAutomaticReconnect().configureLogging(LogLevel.Warning).build();
    connectionRef.current = connection;
    connection.onreconnected(() => setError(""));
    connection.on("callIncoming", (event: IncomingCall & { conversationId: number }) => {
      if (event.conversationId === conversationId && !activeRef.current) setIncoming(event);
    });
    connection.on("callAccepted", async (event: { conversationId: number; callId: string; callerUserId: number; userId: number }) => {
      const call = activeRef.current;
      if (call && event.conversationId === conversationId && event.callId === call.callId && event.userId !== currentUserId) await offerTo(event.userId);
    });
    connection.on("callRejected", (event: { callId: string; userName: string }) => {
      if (activeRef.current?.callId === event.callId) setError(`${event.userName} declined the call.`);
    });
    connection.on("callSignal", async (event: { conversationId: number; callId: string; fromUserId: number; targetUserId: number; signalType: string; payload: string }) => {
      const call = activeRef.current;
      if (!call || event.targetUserId !== currentUserId || event.callId !== call.callId || event.conversationId !== conversationId) return;
      const peer = await createPeer(event.fromUserId);
      if (event.signalType === "offer") {
        await peer.setRemoteDescription(JSON.parse(event.payload));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await connection.invoke("CallSignal", conversationId, call.callId, event.fromUserId, "answer", JSON.stringify(answer));
      } else if (event.signalType === "answer") await peer.setRemoteDescription(JSON.parse(event.payload));
      else if (event.signalType === "ice") await peer.addIceCandidate(JSON.parse(event.payload));
    });
    connection.on("callEnded", (event: { callId: string }) => { if (activeRef.current?.callId === event.callId) closeCall(false); });
    void connection.start()
      .then(() => connection.invoke("JoinConversation", conversationId))
      .then(() => { if (!disposed) setError(""); })
      .catch(() => { if (!disposed) setError("Calling service could not connect."); });
    return () => {
      disposed = true;
      closeCall(false);
      void connection.stop();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [conversationId, currentUserId]);

  const start = async (mode: CallMode) => {
    setError("");
    try {
      await getLocalStream(mode);
      const call = { callId: crypto.randomUUID(), mode, callerUserId: currentUserId || 0, status: "Calling…" };
      activeRef.current = call;
      setActive(call);
      await connectionRef.current?.invoke("StartCall", conversationId, call.callId, mode);
    } catch { closeCall(false); setError("Microphone or camera access was not granted."); }
  };

  const accept = async () => {
    if (!incoming) return;
    try {
      await getLocalStream(incoming.mode);
      const call = { ...incoming, status: "Connected" };
      activeRef.current = call;
      setActive(call);
      setIncoming(undefined);
      await connectionRef.current?.invoke("AcceptCall", conversationId, call.callId, call.callerUserId);
    } catch { setError("Microphone or camera access was not granted."); }
  };

  return <>
    <button type="button" title="Audio call" onClick={() => void start("audio")}><span className="material-icons">call</span></button>
    <button type="button" title="Video call" onClick={() => void start("video")}><span className="material-icons">videocam</span></button>
    {incoming ? <div className="community-call incoming"><strong>{incoming.callerName}</strong><span>Incoming {incoming.mode} call</span><div><button onClick={() => void accept()} className="accept"><span className="material-icons">call</span></button><button onClick={() => { void connectionRef.current?.invoke("RejectCall", conversationId, incoming.callId, incoming.callerUserId); setIncoming(undefined); }} className="end"><span className="material-icons">call_end</span></button></div></div> : null}
    {active ? <div className="community-call active"><strong>{title}</strong><span>{active.status}</span><div className="call-videos"><video ref={localVideoRef} autoPlay muted playsInline />{[...remoteStreams].map(([userId, stream]) => <RemoteVideo key={userId} stream={stream} />)}</div><button className="end" onClick={() => closeCall(true)}><span className="material-icons">call_end</span></button></div> : null}
    {error ? <div className="community-call-error">{error}<button onClick={() => setError("")}>×</button></div> : null}
  </>;
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline />;
}
