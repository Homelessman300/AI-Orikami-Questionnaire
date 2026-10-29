
/**
 * 
 * Main AI chat interface for Orikami.
 * feutrues:
 * - Displays a chat conversation between the user and the AI assistant.
 * - Allows the user to input messages and receive AI-generated responses. 
 */
import { useEffect, useRef, useState } from "react";
import ChatMessage, {
  type Message,
} from "../components/ChatMessage";
import { sendChatMessage } from "../services/api";
import "../style/chat.css";

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I can help you create a project and a FHIR questionnaire. What would you like to create?",
  },
];

export default function ChatPage() {
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextId = useRef(2);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      id: nextId.current++,
      role: "user",
      content: text,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const history = messages.map(({ role, content }) => ({
  role,
  content,
}));

    const reply = await sendChatMessage(text, history);
      const assistantMessage: Message = {
        id: nextId.current++,
        role: "assistant",
        content: reply,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">ORIKAMI AI BUILDER</span>
          <h1>AI Chat</h1>
          <p>
            Describe your project and questionnaire using
            natural language.
          </p>
        </div>

        <div className="model-label">Qwen3 14B</div>
      </header>

      <main className="chat-panel">
        <div className="chat-panel-header">
          <div className="assistant-icon">AI</div>
          <div>
            <h2>AI Assistant</h2>
            <p>Project & Questionnaire Builder</p>
          </div>
        </div>

        <div className="chat-history" aria-live="polite">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="message-avatar">AI</div>
              <div className="message-body">
                <span className="message-author">
                  AI Assistant
                </span>
                <p>Generating response...</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="chat-error" role="alert">
            {error}
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe your project or questionnaire..."
            disabled={loading}
            aria-label="Message to AI"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
