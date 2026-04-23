import { Link } from "react-router-dom";
import { useState } from "react";
import AuthLayout from "./AuthLayout";

export default function ForgotPasswordPage() {
  const [otpSent, setOtpSent] = useState(false);

  return (
    <AuthLayout>
      <section className="login-pg">
        <div className="container">
          <div className="login-main text-center">
            <div className="login-badge">GENERAL USER LOGIN</div>

            <div className="login-card">
              <h2>Forgot Password</h2>

              <form>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter Email or Phone*"
                    className="form-control"
                  />
                </div>

                <button
                  type="button"
                  className="login-btn"
                  onClick={() => setOtpSent(true)}
                >
                  Send OTP
                </button>

                {otpSent && (
                  <>
                    <div className="form-group mt-3">
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        className="form-control"
                      />
                    </div>

                    <button type="button" className="login-btn">
                      Verify OTP
                    </button>
                  </>
                )}

                <div className="login-links">
                  <Link to="/login">Back to Login?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}