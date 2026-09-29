import { useEffect, useState } from "react";
import { downloadJobProof, getProviderJobProofAccess, getProviderJobProofs, uploadProviderJobProof, type JobProof, type JobProofRequirement } from "../api/servicesMarketplaceApi";

export default function ProviderJobProofs({ bookingId }: { bookingId: string }) {
  const [requirements, setRequirements] = useState<JobProofRequirement[]>([]);
  const [proofs, setProofs] = useState<JobProof[]>([]);
  const [message, setMessage] = useState("");
  async function load() { const result = await getProviderJobProofs(bookingId); setRequirements(result.requirements); setProofs(result.proofs); }
  useEffect(() => { void load().catch(() => setMessage("Proof requirements could not be loaded.")); }, [bookingId]);
  async function upload(requirement: JobProofRequirement, selected?: File) {
    if (!selected) return;
    try {
      const processed = selected.type.startsWith("image/") ? await privacySafeImage(selected) : selected;
      if (processed.size > requirement.maximumFileSizeBytes) { setMessage("The proof remains larger than the configured limit after compression."); return; }
      await uploadProviderJobProof(bookingId, requirement.publicId, processed, processed !== selected); await load(); setMessage("Proof uploaded for security scan and review.");
    } catch { setMessage("Proof upload failed. Check the file and try again."); }
  }
  async function view(proofId: string) { const access = await getProviderJobProofAccess(bookingId, proofId); const blob = await downloadJobProof(access.token); const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
  return <section><h4>Job proof</h4>{requirements.map((r) => <div key={r.publicId}><strong>{r.displayName}{r.isRequiredForCompletion ? " *" : ""}</strong><p>{r.instructions}</p><small>{r.approvedCount}/{r.minimumCount} approved · maximum {r.maximumCount}</small><input type="file" accept={r.allowedExtensions.join(",")} aria-label={`Upload ${r.displayName}`} onChange={(e) => void upload(r, e.target.files?.[0])} /></div>)}{proofs.map((p) => <p key={p.publicId}>{p.fileName} · {p.status.replace(/_/g, " ")}{p.reviewReason ? ` · ${p.reviewReason}` : ""} <button onClick={() => void view(p.publicId)}>View</button></p>)}{message ? <p role="status">{message}</p> : null}</section>;
}

async function privacySafeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); const context = canvas.getContext("2d"); if (!context) throw new Error("Image processing unavailable"); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image compression failed")), "image/jpeg", 0.9)); return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
