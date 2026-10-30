
/**
 * File: QuestionnairePage.tsx
 *
 * Purpose:
 * Automatically generates and previews a FHIR Questionnaire
 * from the AI Chat conversation.
 *
 * The AI creates the questionnaire.
 * The user reviews the generated result.
 *
 * Nothing is saved to KRANE.
 */

import { useEffect, useRef, useState } from "react";

import {
  generateQuestionnaire,
  type ChatMessage,
  type FhirQuestionnaire,
} from "../services/api";

import "../style/projectPage.css";

type QuestionnairePageProps = {
  messages: ChatMessage[];
  questionnaire: FhirQuestionnaire | null;
  onQuestionnaireChange: (
    questionnaire: FhirQuestionnaire | null
  ) => void;
  lastGeneratedHistory: string;
  onHistoryGenerated: (history: string) => void;
};

export default function QuestionnairePage({
  messages,
  questionnaire,
  onQuestionnaireChange,
  lastGeneratedHistory,
  onHistoryGenerated,
}: QuestionnairePageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  const pendingHistory = useRef("");
  const historyKey = JSON.stringify(messages);

  /**
   * Automatically generate a questionnaire when:
   * - The user has sent a chat message.
   * - The conversation has changed since generation.
   *
   * Previously generated questionnaires are preserved
   * when navigating between pages.
   */
  useEffect(() => {
    const hasUserMessage = messages.some(
      (message) => message.role === "user"
    );

    if (!hasUserMessage) return;

    if (
      historyKey === lastGeneratedHistory ||
      historyKey === pendingHistory.current
    ) {
      return;
    }

    pendingHistory.current = historyKey;
    let cancelled = false;

    async function loadQuestionnaire() {
      setLoading(true);
      setError("");
      setSuccess("");
      setQuestions([]);

      try {
        const result = await generateQuestionnaire(
          JSON.parse(historyKey) as ChatMessage[]
        );

        if (cancelled) return;

        if (result.status === "needs_information") {
          setQuestions(result.questions);
          onQuestionnaireChange(null);
        } else {
          onQuestionnaireChange(result.questionnaire);
          setSuccess(
            "FHIR Questionnaire generated and validated."
          );
        }

        onHistoryGenerated(historyKey);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate questionnaire."
        );
      } finally {
        if (!cancelled) {
          pendingHistory.current = "";
          setLoading(false);
        }
      }
    }

    void loadQuestionnaire();

    return () => {
      cancelled = true;
      pendingHistory.current = "";
    };
  }, [
    historyKey,
    lastGeneratedHistory,
    onQuestionnaireChange,
    onHistoryGenerated,
  ]);

/**
 * Downloads the AI-generated FHIR Questionnaire
 * as a JSON file.
 *
 * Does not upload anything to KRANE.
 */
function handleDownloadJson() {
  if (!questionnaire) return;

  const json = JSON.stringify(questionnaire, null, 2);

  const blob = new Blob([json], {
    type: "application/fhir+json",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "questionnaire.json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}


  return (
    <div className="project-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            ORIKAMI AI BUILDER
          </span>

          <h1>AI Questionnaire Generator</h1>

          <p>
            Generate a FHIR Questionnaire automatically
            from your AI Chat conversation.
          </p>
        </div>
      </header>

      <main className="project-panel">
        <div className="project-panel-header">
          <div>
            <h2>Generated Questionnaire</h2>
            <p>
              Review the questions created by the AI.
            </p>
          </div>
        </div>

        {loading && (
          <p role="status">
            AI is generating your FHIR Questionnaire...
          </p>
        )}

        {error && (
          <p className="project-error" role="alert">
            {error}
          </p>
        )}

        {!loading && questions.length > 0 && (
          <div>
            <h3>Additional information required</h3>
            <p>
              Please answer these questions in AI Chat:
            </p>

            <ul>
              {questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        )}

        {success && (
          <p className="project-success" role="status">
            {success}
          </p>
        )}

        {!loading && questionnaire && (
          <div>
            <h3>{questionnaire.title}</h3><button
  type="button"
  onClick={handleDownloadJson}
>
  Download FHIR JSON
</button>
            

            <p>
              Total questions: {questionnaire.item.length}
            </p>

            <div>
              {questionnaire.item.map((item) => (
                <div
                  key={item.linkId}
                  className="project-field"
                >
                  <strong>{item.text}</strong>

                  <p>Answer type: {item.type}</p>

                  {item.answerOption && (
                    <ul>
                      {item.answerOption.map(
                        (option, index) => (
                          <li key={index}>
                            {option.valueString ??
                              option.valueCoding?.display ??
                              option.valueCoding?.code ??
                              option.valueInteger ??
                              "Option"}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <h3>FHIR JSON Preview</h3>

            <pre
              style={{
                overflowX: "auto",
                padding: "16px",
                background: "#f5f5f5",
                borderRadius: "8px",
              }}
            >
              {JSON.stringify(questionnaire, null, 2)}
            </pre>
          </div>
        )}

        {!loading &&
          !questionnaire &&
          questions.length === 0 &&
          !error && (
            <p>
              Describe your questionnaire in AI Chat
              to generate a FHIR Questionnaire.
            </p>
          )}
      </main>
    </div>
  );
}
