import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import {
  sendOtpApi,
  verifyOtpApi,
  registerApi,
  loginApi,
  resetPasswordApi,
} from "../api/authApi";
import { reinitializeTemplate } from "../../../utils/reinitializeTemplate";

type AuthMode = "login" | "register" | "forgot";
type MessageType = "success" | "error" | "info";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialMode = useMemo<AuthMode>(() => {
    const loginParam = searchParams.get("login");

    if (loginParam === "register") return "register";
    if (loginParam === "forgot") return "forgot";

    return "login";
  }, [searchParams]);

  const selectedPlanCode = useMemo(() => {
    return searchParams.get("plan")?.trim().toUpperCase() || "";
  }, [searchParams]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");
  const [registerMessageType, setRegisterMessageType] =
    useState<MessageType>("info");
  const [resendSeconds, setResendSeconds] = useState(0);

  const [forgotLoginId, setForgotLoginId] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotMessageType, setForgotMessageType] =
    useState<MessageType>("info");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    reinitializeTemplate();
  }, [mode]);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setResendSeconds((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);

    if (nextMode === "login") {
      setSearchParams({});
    } else {
      setSearchParams(selectedPlanCode ? { login: nextMode, plan: selectedPlanCode } : { login: nextMode });
    }
  };

  const getMessageClass = (type: MessageType) => {
    if (type === "success") return "text-success";
    if (type === "error") return "text-danger";
    return "text-muted";
  };

  const resetRegisterOtpState = () => {
    setRegisterOtpSent(false);
    setRegisterOtpVerified(false);
    setRegisterOtp("");
    setRegisterMessage("");
    setRegisterMessageType("info");
    setResendSeconds(0);
  };

  const resetForgotState = () => {
    setForgotOtp("");
    setForgotOtpSent(false);
    setForgotOtpVerified(false);
    setForgotMessage("");
    setForgotMessageType("info");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleRegisterEmailChange = (value: string) => {
    setRegisterEmail(value);
    resetRegisterOtpState();
  };

  const handleSendRegisterOtp = async () => {
    if (!registerEmail.trim()) {
      setRegisterMessage("Please enter your email first.");
      setRegisterMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const result = await sendOtpApi(registerEmail, "Register");
      setRegisterOtpSent(true);
      setRegisterOtpVerified(false);
      setRegisterMessage(result.message || "OTP sent successfully to your email.");
      setRegisterMessageType("success");
      setResendSeconds(30);
    } catch (error) {
      setRegisterMessage(
        error instanceof Error ? error.message : "Failed to send OTP."
      );
      setRegisterMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    if (resendSeconds > 0) return;
    await handleSendRegisterOtp();
  };

  const handleVerifyRegisterOtp = async () => {
    if (!registerEmail.trim() || !registerOtp.trim()) {
      setRegisterMessage("Please enter email and OTP.");
      setRegisterMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const result = await verifyOtpApi(registerEmail, registerOtp, "Register");
      setRegisterOtpVerified(true);
      setRegisterMessage(result.message || "OTP verified successfully.");
      setRegisterMessageType("success");
    } catch (error) {
      setRegisterOtpVerified(false);
      setRegisterMessage(
        error instanceof Error ? error.message : "Failed to verify OTP."
      );
      setRegisterMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerOtpVerified) {
      setRegisterMessage("Please verify OTP before registration.");
      setRegisterMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const result = await registerApi({
        fullName,
        email: registerEmail,
        mobileNumber: countryCode + mobileNumber,
        password: registerPassword,
        otpCode: registerOtp,
        selectedPlanCode: selectedPlanCode || undefined,
      });

      setRegisterMessage(
        `${result.message}${result.customerCode ? ` Customer Code: ${result.customerCode}` : ""}`
      );
      setRegisterMessageType("success");

      setLoginId(registerEmail);
      setFullName("");
      setRegisterEmail("");
      setMobileNumber("");
      setRegisterPassword("");
      resetRegisterOtpState();

      setTimeout(() => {
        switchMode("login");
      }, 1000);
    } catch (error) {
      setRegisterMessage(
        error instanceof Error ? error.message : "Registration failed."
      );
      setRegisterMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const result = await loginApi({
        loginId,
        password: loginPassword,
      });

      if (result.token) localStorage.setItem("token", result.token);
      if (result.token) localStorage.setItem("customer_token", result.token);
      if (result.userId) localStorage.setItem("userId", String(result.userId));
      if (result.customerCode) localStorage.setItem("customerCode", result.customerCode);
      if (result.fullName) localStorage.setItem("fullName", result.fullName);
      if (result.email) localStorage.setItem("email", result.email);
      if (result.mobileNumber) localStorage.setItem("mobileNumber", result.mobileNumber);
      if (result.userType) localStorage.setItem("userType", result.userType);

      navigate("/home");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotLoginId.trim()) {
      setForgotMessage("Please enter email or mobile number.");
      setForgotMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const result = await sendOtpApi(forgotLoginId, "ForgotPassword");
      setForgotOtpSent(true);
      setForgotOtpVerified(false);
      setForgotMessage(result.message || "OTP sent successfully.");
      setForgotMessageType("success");
    } catch (error) {
      setForgotMessage(
        error instanceof Error ? error.message : "Failed to send OTP."
      );
      setForgotMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    if (!forgotLoginId.trim() || !forgotOtp.trim()) {
      setForgotMessage("Please enter login ID and OTP.");
      setForgotMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const result = await verifyOtpApi(
        forgotLoginId,
        forgotOtp,
        "ForgotPassword"
      );

      setForgotOtpVerified(true);
      setForgotMessage(result.message || "OTP verified successfully.");
      setForgotMessageType("success");
    } catch (error) {
      setForgotOtpVerified(false);
      setForgotMessage(
        error instanceof Error ? error.message : "Failed to verify OTP."
      );
      setForgotMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotLoginId.trim()) {
      setForgotMessage("Please enter email or mobile number.");
      setForgotMessageType("error");
      return;
    }

    if (!forgotOtp.trim()) {
      setForgotMessage("Please enter OTP.");
      setForgotMessageType("error");
      return;
    }

    if (!newPassword.trim()) {
      setForgotMessage("Please enter new password.");
      setForgotMessageType("error");
      return;
    }

    if (!confirmPassword.trim()) {
      setForgotMessage("Please confirm your password.");
      setForgotMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotMessage("New password and confirm password do not match.");
      setForgotMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const result = await resetPasswordApi({
        loginId: forgotLoginId,
        otpCode: forgotOtp,
        newPassword,
        confirmPassword,
      });

      setForgotMessage(result.message || "Password reset successfully.");
      setForgotMessageType("success");

      resetForgotState();

      setTimeout(() => {
        switchMode("login");
      }, 1200);
    } catch (error) {
      setForgotMessage(
        error instanceof Error ? error.message : "Failed to reset password."
      );
      setForgotMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <section className="login-reg login-reg-pg">
        <div className="container">
          <div className="row">
            <div className="col-md-6 offset-md-3">
              <div className="login-main">
                <span className="tit-tag">GENERAL USER LOGIN</span>

                {mode === "login" && (
                  <div style={{ display: "block" }}>
                    <div className="login login-new">
                      <div className="login-hero">
                        <img
                          src="/template-17/images/login/2.png"
                          alt="Login"
                          style={{ maxWidth: "100%", marginBottom: "20px" }}
                        />
                      </div>

                      <h4>Visitors Login</h4>

                      <form id="login_form" onSubmit={handleLoginSubmit}>
                        <div className="form-group mb-3">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter email or mobile*"
                            required
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                          />
                        </div>

                        <div className="form-group mb-3">
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Enter password*"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                          />
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary w-100"
                          disabled={loading}
                        >
                          {loading ? "Please wait..." : "Sign in"}
                        </button>
                      </form>

                      <div className="log-bot mt-3">
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <li>
                            <span
                              className="ll-2"
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate("/pricing-details")}
                            >
                              Create an account?
                            </span>
                          </li>
                          <li>
                            <span
                              className="ll-3"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                resetForgotState();
                                switchMode("forgot");
                              }}
                            >
                              Forgot password?
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "register" && (
                  <div style={{ display: "block" }}>
                    <div className="login login-new">
                      <h4>Create an account</h4>
                      {selectedPlanCode ? (
                        <p className="text-muted">Selected plan: {selectedPlanCode}</p>
                      ) : null}

                      <form id="register_form" onSubmit={handleRegisterSubmit}>
                        <div className="form-group mb-3">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </div>

                        <div className="form-group mb-3">
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <input
                              type="email"
                              className="form-control"
                              placeholder="Email address*"
                              required
                              value={registerEmail}
                              onChange={(e) => handleRegisterEmailChange(e.target.value)}
                              style={{ flex: 1, minWidth: "220px" }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSendRegisterOtp}
                              disabled={loading}
                            >
                              {registerOtpSent ? "Send Again" : "Send OTP"}
                            </button>
                          </div>
                        </div>

                        {registerMessage && (
                          <div className="form-group mb-3">
                            <small className={getMessageClass(registerMessageType)}>
                              {registerMessage}
                            </small>
                          </div>
                        )}

                        {registerOtpSent && (
                          <div className="form-group mb-3">
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Enter OTP"
                                value={registerOtp}
                                onChange={(e) => setRegisterOtp(e.target.value)}
                                style={{ flex: 1, minWidth: "220px" }}
                              />
                              <button
                                type="button"
                                className="btn btn-success"
                                onClick={handleVerifyRegisterOtp}
                                disabled={loading || registerOtpVerified}
                              >
                                {registerOtpVerified ? "Verified" : "Verify OTP"}
                              </button>
                            </div>

                            {!registerOtpVerified && (
                              <div style={{ marginTop: "8px" }}>
                                {resendSeconds > 0 ? (
                                  <small className="text-muted">
                                    Resend OTP in {resendSeconds}s
                                  </small>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleResendRegisterOtp}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#0d6efd",
                                      padding: 0,
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Resend OTP
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="form-group mb-3">
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Password*"
                            required
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                          />
                        </div>

                        <div className="form-group mb-3">
                          <div style={{ display: "flex", gap: "8px" }}>
                            <select
                              className="form-control"
                              style={{ maxWidth: "120px" }}
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                            >
                              <option value="+1">US +1</option>
                              <option value="+44">GB +44</option>
                              <option value="+91">IN +91</option>
                              <option value="+61">AU +61</option>
                              <option value="+971">AE +971</option>
                            </select>

                            <input
                              type="text"
                              className="form-control"
                              placeholder="Mobile number"
                              value={mobileNumber}
                              onChange={(e) => setMobileNumber(e.target.value)}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary w-100"
                          disabled={loading || !registerOtpVerified}
                        >
                          {loading ? "Please wait..." : "Register Now"}
                        </button>
                      </form>

                      <div className="log-bot mt-3">
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <li>
                            <span
                              className="ll-1"
                              style={{ cursor: "pointer" }}
                              onClick={() => switchMode("login")}
                            >
                              Already have an account?
                            </span>
                          </li>
                          <li>
                            <span
                              className="ll-3"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                resetForgotState();
                                switchMode("forgot");
                              }}
                            >
                              Forgot password?
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "forgot" && (
                  <div style={{ display: "block" }}>
                    <div className="login login-new">
                      <h4>Forgot Password</h4>

                      <form id="forgot_form" onSubmit={handleResetPassword}>
                        <div className="form-group mb-3">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter email or mobile*"
                            required
                            value={forgotLoginId}
                            onChange={(e) => setForgotLoginId(e.target.value)}
                          />
                        </div>

                        {forgotMessage && (
                          <div className="form-group mb-3">
                            <small className={getMessageClass(forgotMessageType)}>
                              {forgotMessage}
                            </small>
                          </div>
                        )}

                        {!forgotOtpSent && (
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={handleSendForgotOtp}
                            disabled={loading}
                          >
                            {loading ? "Please wait..." : "Send OTP"}
                          </button>
                        )}

                        {forgotOtpSent && !forgotOtpVerified && (
                          <div style={{ marginTop: "10px" }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Enter OTP"
                              value={forgotOtp}
                              onChange={(e) => setForgotOtp(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-success w-100 mt-2"
                              onClick={handleVerifyForgotOtp}
                              disabled={loading}
                            >
                              {loading ? "Please wait..." : "Verify OTP"}
                            </button>
                          </div>
                        )}

                        {forgotOtpVerified && (
                          <div style={{ marginTop: "10px" }}>
                            <div className="form-group mb-3">
                              <input
                                type="password"
                                className="form-control"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                              />
                            </div>

                            <div className="form-group mb-3">
                              <input
                                type="password"
                                className="form-control"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                            </div>

                            <button
                              type="submit"
                              className="btn btn-primary w-100"
                              disabled={loading}
                            >
                              {loading ? "Please wait..." : "Reset Password"}
                            </button>
                          </div>
                        )}
                      </form>

                      <div className="log-bot mt-3">
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <li>
                            <span
                              className="ll-1"
                              style={{ cursor: "pointer" }}
                              onClick={() => switchMode("login")}
                            >
                              Back to Login?
                            </span>
                          </li>
                          <li>
                            <span
                              className="ll-2"
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate("/pricing-details")}
                            >
                              Create an account?
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}
