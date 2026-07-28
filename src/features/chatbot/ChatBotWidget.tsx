import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient } from "../../shared/api/client";
import "./ChatBotWidget.css";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const starterMessages = [
  "How do I post a listing?",
  "How do I post a local service?",
  "Where can I see notifications?",
];

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi, I can help with ChaoDesi app questions about listings, classifieds, local services, events, plans, notifications, profiles, and payments.",
    },
  ]);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messageEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isOpen, messages]);

  async function sendMessage(nextInput = input) {
    const message = nextInput.trim();
    if (!message || isSending) return;

    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await apiClient.post<{ reply: string }>("/ChatBot/message", {
        message,
        pageTitle: document.title,
        pageUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        source: "customer",
      });
      setMessages((current) => [...current, { role: "assistant", text: response.data.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I could not reach ChaoDesi assistant right now. Please try again shortly.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="chaodesi-chatbot">
      {isOpen ? (
        <section className="chaodesi-chatbot__panel" aria-label="ChaoDesi assistant">
          <header className="chaodesi-chatbot__header">
            <div>
              <strong>ChaoDesi Assistant</strong>
              <span>Application help only</span>
            </div>
            <button type="button" className="chaodesi-chatbot__close" aria-label="Close chat" onClick={() => setIsOpen(false)}>
              x
            </button>
          </header>

          <div className="chaodesi-chatbot__messages">
            {messages.map((message, index) => (
              <div className={`chaodesi-chatbot__message chaodesi-chatbot__message--${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {isSending ? <div className="chaodesi-chatbot__message chaodesi-chatbot__message--assistant">Typing...</div> : null}
            <div ref={messageEndRef} />
          </div>

          <div className="chaodesi-chatbot__quick" aria-label="Quick questions">
            {starterMessages.map((message) => (
              <button type="button" key={message} disabled={isSending} onClick={() => void sendMessage(message)}>
                {message}
              </button>
            ))}
          </div>

          <form className="chaodesi-chatbot__form" onSubmit={submitForm}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about ChaoDesi..." maxLength={1200} />
            <button type="submit" disabled={isSending || !input.trim()} aria-label="Send message">
              <i className="material-icons">send</i>
            </button>
          </form>
        </section>
      ) : (
        <button type="button" className="chaodesi-chatbot__toggle" aria-label="Open ChaoDesi assistant" onClick={() => setIsOpen(true)}>
          <ChatAssistantIcon />
        </button>
      )}
    </div>
  );
}

function ChatAssistantIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M36 10V7" stroke="#dff5ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="5" r="2.5" fill="#62d7ff" />
      <rect x="23" y="11" width="27" height="22" rx="9" fill="#eaf8ff" stroke="#86dfff" strokeWidth="2" />
      <rect x="27" y="16" width="19" height="12" rx="5" fill="#18396f" />
      <circle cx="32" cy="22" r="2" fill="#66e6ff" />
      <circle cx="41" cy="22" r="2" fill="#66e6ff" />
      <path d="M33 27h7" stroke="#66e6ff" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="25" y="35" width="24" height="19" rx="7" fill="#eaf8ff" stroke="#86dfff" strokeWidth="2" />
      <rect x="31" y="40" width="12" height="8" rx="3" fill="#18396f" />
      <path d="m34 44 2 2 4-4" stroke="#66e6ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 53v5M45 53v5" stroke="#dff5ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M49 39c4 1 6 4 6 8" stroke="#dff5ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M23 39c-7-2-10-8-10-14v-8" stroke="#dff5ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 18v-6M13 17V9M18 19v-6M8 18c0 4 2 7 5 7s5-2 5-6" stroke="#dff5ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="13" cy="25" r="3" fill="#86dfff" />
    </svg>
  );
}
