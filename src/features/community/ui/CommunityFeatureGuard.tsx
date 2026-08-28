import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getCommunityFeatureFlags } from "../api/communityApi";

export default function CommunityFeatureGuard({ feature, children }: { feature: string; children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => { let active = true; getCommunityFeatureFlags().then(flags => active && setEnabled(flags[feature] === true)).catch(() => active && setEnabled(false)); return () => { active = false; }; }, [feature]);
  if (enabled === null) return <div style={{ minHeight: "65vh", background: "#f5f7fb" }} />;
  if (!enabled) return <main style={{ minHeight: "65vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 24 }}><div style={{ background: "#fff", padding: 35, borderRadius: 16, textAlign: "center", maxWidth: 480 }}><span className="material-icons" style={{ fontSize: 45, color: "#9aa6b8" }}>toggle_off</span><h1>Feature unavailable</h1><p>This Groups & Communities capability is currently disabled by ChaoDesi.</p><Link to="/community">Back to Groups & Communities</Link></div></main>;
  return children;
}
