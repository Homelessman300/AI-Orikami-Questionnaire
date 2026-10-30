
/**
 * Purpose:
 * Main application component.
 *
 * Features:
 * - Navigation between AI Chat, Project and Questionnaire.
 * - Shared conversation history.
 * - Shared project configuration.
 * - Shared AI-generated FHIR Questionnaire.
 * - Tracks which conversation has been processed.
 * - Preserves information when switching pages.
 *
 */

import { useState } from "react";

import ChatPage from "./pages/ChatPage";
import ProjectPage from "./pages/ProjectPage";
import QuestionnairePage from "./pages/QuestionnairePage";

import AppNavigation, {
  type Page,
} from "./components/Appnavigation";

import type { Message } from "./components/ChatMessage";

import {
  initialProjectConfig,
  type ProjectConfig,
} from "./types/project";

import type { FhirQuestionnaire } from "./services/api";
import NotificationBell from "./components/NotificationBell";
/**
 * Initial AI greeting.
 */
const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I can help you create a project and a FHIR questionnaire. What would you like to create?",
  },
];

export default function App() {
  /**
   * Current navigation page.
   */
  const [page, setPage] = useState<Page>("chat");

  /**
   * Stores the AI Chat conversation.
   * Messages are preserved when navigating between pages.
   */
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  /**
   * Stores the project configuration.
   */
  const [project, setProject] =
    useState<ProjectConfig>(initialProjectConfig);

  /**
   * Remembers which conversation was last used
   * to extract project information.
   */
  const [
    lastExtractedHistory,
    setLastExtractedHistory,
  ] = useState("");

  /**
   * Stores the AI-generated FHIR Questionnaire.
   */
  const [questionnaire, setQuestionnaire] =
    useState<FhirQuestionnaire | null>(null);

  /**
   * Remembers which conversation was last used
   * to generate a questionnaire.
   */
  const [
    lastGeneratedHistory,
    setLastGeneratedHistory,
  ] = useState("");

  /**
   * Convert chat messages into the format
   * expected by the backend.
   *
   * Exclude the initial AI greeting.
   */
  const conversation = messages
    .filter((message) => message.id !== 1)
    .map(({ role, content }) => ({
      role,
      content,
    }));

  return (
    <>
    <div className="notification-header">
  <NotificationBell />
</div>
    <div>
      {/* Main navigation */}
      <AppNavigation
        currentPage={page}
        onNavigate={setPage}
      />

      {/* AI Chat */}
      {page === "chat" && (
        <ChatPage
          messages={messages}
          onMessagesChange={setMessages}
        />
      )}

      {/* Project Configuration */}
      {page === "project" && (
        <ProjectPage
          messages={conversation}
          project={project}
          onProjectChange={setProject}
          lastExtractedHistory={lastExtractedHistory}
          onHistoryExtracted={setLastExtractedHistory}
        />
      )}

      {/* AI-generated FHIR Questionnaire */}
      {page === "questionnaire" && (
        <QuestionnairePage
          messages={conversation}
          questionnaire={questionnaire}
          onQuestionnaireChange={setQuestionnaire}
          lastGeneratedHistory={lastGeneratedHistory}
          onHistoryGenerated={setLastGeneratedHistory}
        />
      )}
    </div>
    </>
  );
}
