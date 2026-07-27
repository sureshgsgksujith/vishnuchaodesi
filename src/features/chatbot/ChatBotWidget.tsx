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
          <i className="material-icons">support_agent</i>
        </button>
      )}
    </div>
  );
}
