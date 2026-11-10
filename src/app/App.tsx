import { AppRouter } from "./router/AppRouter";
import { useCustomerIdleTimeout } from "../features/auth/hooks/useCustomerIdleTimeout";
import { lazy, Suspense } from "react";

const ChatBotWidget = lazy(() => import("../features/chatbot/ChatBotWidget"));

export default function App() {
  useCustomerIdleTimeout();

  return (
    <>
      <AppRouter />
      <Suspense fallback={null}>
        <ChatBotWidget />
      </Suspense>
    </>
  );
}
