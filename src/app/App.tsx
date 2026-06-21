import { AppRouter } from "./router/AppRouter";
import { useCustomerIdleTimeout } from "../features/auth/hooks/useCustomerIdleTimeout";

export default function App() {
  useCustomerIdleTimeout();

  return <AppRouter />;
}
