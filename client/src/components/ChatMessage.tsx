
/**
 * File: ChatMessage.tsx
 *
 * Purpose:
 * Displays an individual chat message from either
 * the user or the AI assistant.
 * Features:
 * - Displays the message sender.
 * - Applies different styling for user and AI messages.
 * - Renders AI-generated Markdown, such as bold text,
 *   paragraphs, and numbered lists.
 */

import ReactMarkdown from "react-markdown";

/**
 * Defines the structure of a chat message.
 */
export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

/**
 * Props received from ChatPage.
 */
interface ChatMessageProps {
  message: Message;
}

/**
 * Renders a single message in the chat conversation.
 */
export default function ChatMessage({
  message,
}: ChatMessageProps) {
  // Determine whether the message belongs to the user.
  const isUser = message.role === "user";

  return (
    <div
      className={`chat-message ${isUser ? "user" : "assistant"}`}
    >
      {/* Display the sender avatar */}
      <div className="message-avatar">
        {isUser ? "You" : "AI"}
      </div>

      <div className="message-body">
        {/* Display the sender name */}
        <span className="message-author">
          {isUser ? "You" : "AI Assistant"}
        </span>

        {/* Render message content with Markdown support */}
        <div className="message-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
