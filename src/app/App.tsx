import { AppRouter } from "./router/AppRouter";
import { useCustomerIdleTimeout } from "../features/auth/hooks/useCustomerIdleTimeout";
import ChatBotWidget from "../features/chatbot/ChatBotWidget";

export default function App() {
  useCustomerIdleTimeout();

  return (
    <>
      <AppRouter />
      <ChatBotWidget />
    </>
  );
}
