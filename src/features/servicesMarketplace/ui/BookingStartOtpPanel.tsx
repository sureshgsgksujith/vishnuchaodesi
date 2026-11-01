import { useEffect, useState } from "react";
import { getServiceStartOtp, type ServiceStartOtp } from "../api/servicesMarketplaceApi";

export default function BookingStartOtpPanel({ bookingId, status }: { bookingId: string; status: string }) {
  const [otp, setOtp] = useState<ServiceStartOtp>();
  const eligible = ["ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(status);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!eligible) { if (active) setOtp(undefined); return; }
      try { const result = await getServiceStartOtp(bookingId); if (active) setOtp(result); }
      catch { if (active) setOtp(undefined); }
    }
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [bookingId, eligible]);

  if (!otp) return null;
  return <section className={`services-start-otp${otp.verified ? " is-verified" : ""}`} aria-label="Service start verification code">
    <div className="services-start-otp-icon"><span className="material-icons" aria-hidden="true">{otp.verified ? "verified" : "pin"}</span></div>
    <div><small>{otp.verified ? "START VERIFIED" : "SERVICE START OTP"}</small><h4>{otp.verified ? "OTP verified by your professional" : "Give this code only after the professional arrives"}</h4><p>{otp.verified ? "Your service professional securely verified the visit and started the work." : "The professional must enter this code before work can begin. Do not share it by phone or before checking the professional at your address."}</p></div>
    {!otp.verified ? <strong className="services-start-otp-code" aria-label={`OTP ${otp.code.split("").join(" ")}`}>{otp.code}</strong> : null}
  </section>;
}
