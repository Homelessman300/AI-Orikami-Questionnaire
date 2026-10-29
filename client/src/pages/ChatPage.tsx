
/**
 * Purpose:
 * Main AI chat interface for Orikami.
 *
 * Features:
 * - Displays the AI conversation.
 * - Sends messages to the backend.
 * - Uses shared conversation history from App.tsx.
 * - Preserves messages when navigating between pages.
 * - Displays loading states and errors.
 */

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import ChatMessage, {
  type Message,
} from "../components/ChatMessage";

import { sendChatMessage } from "../services/api";

import "../style/chat.css";

/**
 * Props received from App.tsx.
 */
type ChatPageProps = {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
};

export default function ChatPage({
  messages,
  onMessagesChange,
}: ChatPageProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextId = useRef(
    Math.max(0, ...messages.map((message) => message.id)) + 1
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Automatically scroll to the newest message.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /**
   * Sends the user's message to the backend.
   */
  async function handleSend(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    /**
     * Create the new user message.
     */
    const userMessage: Message = {
      id: nextId.current++,
      role: "user",
      content: text,
    };

    /**
     * Save the user's message in shared state.
     */
    onMessagesChange([
      ...messages,
      userMessage,
    ]);

    setInput("");
    setLoading(true);
    setError("");

    try {
      /**
       * Build the conversation history.
       *
       * Exclude the initial UI greeting.
       * The backend adds the system prompt itself.
       */
      const history = messages
        .filter((message) => message.id !== 1)
        .map(({ role, content }) => ({
          role,
          content,
        }));

      /**
       * Send the new message and previous history
       * to the AI backend.
       */
      const reply = await sendChatMessage(
        text,
        history
      );

      /**
       * Create the AI response message.
       */
      const assistantMessage: Message = {
        id: nextId.current++,
        role: "assistant",
        content: reply,
      };

      /**
       * Save both the user message and AI response.
       */
      onMessagesChange([
        ...messages,
        userMessage,
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
          <span className="page-eyebrow">
            ORIKAMI AI BUILDER
          </span>

          <h1>AI Chat</h1>

          <p>
            Describe your project and questionnaire
            using natural language.
          </p>
        </div>

        <div className="model-label">
          Qwen3 14B
        </div>
      </header>

      <main className="chat-panel">
        <div className="chat-panel-header">
          <div className="assistant-icon">
            AI
          </div>

          <div>
            <h2>AI Assistant</h2>
            <p>Project & Questionnaire Builder</p>
          </div>
        </div>

        <div
          className="chat-history"
          aria-live="polite"
        >
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                AI
              </div>

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
          <div
            className="chat-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="chat-composer"
          onSubmit={handleSend}
        >
          <input
            type="text"
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
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
