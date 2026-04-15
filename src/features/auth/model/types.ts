export interface AuthState {
  token: string | null;
  userName: string | null;
  isAuthenticated: boolean;
}