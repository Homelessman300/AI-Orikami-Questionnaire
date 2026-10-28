
export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`chat-message ${isUser ? "user" : "assistant"}`}
    >
      <div className="message-avatar">
        {isUser ? "You" : "AI"}
      </div>

      <div className="message-body">
        <span className="message-author">
          {isUser ? "You" : "AI Assistant"}
        </span>
        <p>{message.content}</p>
      </div>
    </div>
  );
}
