
/**

 * Purpose:
 * Validates project configuration before it can
 * be confirmed or sent to the KRANE API.
 */

export interface ProjectConfig {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  selfEnrollment: boolean | null;
}

export type ProjectValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Checks whether a string is a real ISO calendar date.
 */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

/**
 * Validates required project fields and dates.
 */
export function validateProject(
  project: ProjectConfig
): ProjectValidationResult {
  const errors: string[] = [];

  if (!project.name.trim()) {
    errors.push("Project name is required.");
  }

  const startValid = isValidDate(project.startDate);
  const endValid = isValidDate(project.endDate);

  if (!startValid) {
    errors.push("A valid start date is required.");
  }

  if (!endValid) {
    errors.push("A valid end date is required.");
  }

  // Current date in the Netherlands.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (startValid && project.startDate < today) {
    errors.push("Start date cannot be in the past.");
  }

  if (
    startValid &&
    endValid &&
    project.endDate <= project.startDate
  ) {
    errors.push("End date must be after start date.");
  }

  if (typeof project.selfEnrollment !== "boolean") {
    errors.push("Self-enrollment must be enabled or disabled.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
