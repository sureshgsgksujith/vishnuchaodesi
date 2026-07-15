import { Link } from "react-router-dom";
import { useState } from "react";
import AuthLayout from "./AuthLayout";
import PhoneNumberInput from "../../../shared/components/PhoneNumberInput";

export default function RegisterPage() {
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  return (
    <AuthLayout>
      <section className="login-pg">
        <div className="container">
          <div className="login-main text-center">
            <div className="login-badge">GENERAL USER LOGIN</div>

            <div className="login-card">
              <h2>Create an account</h2>

              <form>
                <div className="form-group">
                  <input type="text" placeholder="Name" className="form-control" />
                </div>

                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email id*"
                    className="form-control"
                    onBlur={() => setOtpSent(true)}
                  />
                </div>

                {otpSent && (
                  <>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Enter OTP sent to your email"
                        className="form-control"
                      />
                    </div>
                    <p className="text-success small">OTP has been sent to your email.</p>
                  </>
                )}

                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Password*"
                    className="form-control"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Confirm Password*"
                    className="form-control"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                <div className="form-group">
                  <PhoneNumberInput value={mobileNumber} onChange={setMobileNumber} placeholder="Phone" />
                </div>

                <button type="submit" className="login-btn">Register Now</button>

                <div className="login-links">
                  <Link to="/login">Login?</Link>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}
