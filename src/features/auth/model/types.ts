export interface LoginFormValues {
  loginId: string;
  password: string;
}

export interface RegisterFormValues {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  otp: string;
}

export interface ForgotPasswordFormValues {
  loginId: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthState {
  token: string | null;
  userName: string | null;
  isAuthenticated: boolean;
}
