
/**
 * File: App.tsx
 *
 * Purpose:
 * Main application component.
 *
 * Features:
 * - Navigation between AI Chat and Project Configuration.
 * - Shared conversation history.
 * - Shared project configuration.
 * - Tracks which conversation has been extracted.
 * - Preserves manually edited project information.
 */

import { useState } from "react";

import ChatPage from "./pages/ChatPage";
import ProjectPage from "./pages/ProjectPage";

import type { Message } from "./components/ChatMessage";

import {
  initialProjectConfig,
  type ProjectConfig,
} from "./types/project";
import AppNavigation, {
  type Page,
} from "./components/Appnavigation.tsx";
const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I can help you create a project and a FHIR questionnaire. What would you like to create?",
  },
];

export default function App() {
  // Controls which page is visible.
  const [page, setPage] = useState<Page>("chat");

  // Stores the conversation between page changes.
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  // Stores project configuration between page changes.
  const [project, setProject] =
    useState<ProjectConfig>(initialProjectConfig);

  // Remembers the conversation used for the last extraction.
  const [
    lastExtractedHistory,
    setLastExtractedHistory,
  ] = useState("");

  // Exclude the initial greeting from AI extraction.
  const conversation = messages
    .filter((message) => message.id !== 1)
    .map(({ role, content }) => ({
      role,
      content,
    }));

  return (
    <div>
  <AppNavigation
  currentPage={page}
  onNavigate={setPage}
/>

      {page === "chat" && (
        <ChatPage
          messages={messages}
          onMessagesChange={setMessages}
        />
      )}

      {page === "project" && (
        <ProjectPage
          messages={conversation}
          project={project}
          onProjectChange={setProject}
          lastExtractedHistory={lastExtractedHistory}
          onHistoryExtracted={setLastExtractedHistory}
        />
      )}
    </div>
  );
}
