const API_BASE_URL = import.meta.env.VITE_API_BASE_URL + "/Auth"; //"https://localhost:7152/api/Auth";

export type AuthApiResponse = {
  success: boolean;
  message: string;
  token: string | null;
  userId: number | null;
  customerCode: string | null;
  email: string | null;
  mobileNumber: string | null;
  fullName: string | null;
  userType: string | null;
  redirectUrl: string | null;
};

async function parseResponse(response: Response): Promise<AuthApiResponse> {
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export async function sendOtpApi(loginId: string, purpose: "Register" | "ForgotPassword") {
  const response = await fetch(`${API_BASE_URL}/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      loginId,
      purpose,
    }),
  });

  return parseResponse(response);
}

export async function verifyOtpApi(
  loginId: string,
  otpCode: string,
  purpose: "Register" | "ForgotPassword"
) {
  const response = await fetch(`${API_BASE_URL}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      loginId,
      otpCode,
      purpose,
    }),
  });

  return parseResponse(response);
}

export async function registerApi(payload: {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  otpCode: string;
}) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function loginApi(payload: {
  loginId: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function resetPasswordApi(payload: {
  loginId: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Reset password failed");
  }

  return data;
}
