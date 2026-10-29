
/**
* Purpose:
 * Reusable navigation for the Orikami AI Builder.
 */

import "../style/navigation.css";

export type Page =
  | "chat"
  | "project"
  | "schedule"
  | "reminders"
  | "review";

type AppNavigationProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
};

const navigationItems: {
  id: Page;
  label: string;
  number: number;
}[] = [
  { id: "chat", label: "AI Chat", number: 1 },
  { id: "project", label: "Project", number: 2 },
  { id: "schedule", label: "Schedule", number: 3 },
  { id: "reminders", label: "Reminders", number: 4 },
  { id: "review", label: "Review", number: 5 },
];

export default function AppNavigation({
  currentPage,
  onNavigate,
}: AppNavigationProps) {
  return (
    <header className="app-navigation">
      <div className="navigation-brand">
        <div className="navigation-logo">AI</div>

        <div>
          <strong>Orikami AI Builder</strong>
          <span>Project configuration</span>
        </div>
      </div>

      <nav
        className="navigation-steps"
        aria-label="Project configuration steps"
      >
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`navigation-step ${
              currentPage === item.id ? "active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
            aria-current={
              currentPage === item.id ? "step" : undefined
            }
          >
            <span className="navigation-number">
              {item.number}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
