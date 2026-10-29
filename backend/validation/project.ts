/**
 * project.ts
 *
 * Validates project dates before a project is created.
 * Prevents past start dates and invalid date ranges.
 */

function getToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function validateProjectDates(
  startDate: string,
  endDate: string
): string[] {
  const errors: string[] = [];

  if (!isValidDate(startDate)) {
    errors.push("Start date must be a valid YYYY-MM-DD date.");
  }

  if (!isValidDate(endDate)) {
    errors.push("End date must be a valid YYYY-MM-DD date.");
  }

  if (errors.length > 0) return errors;

  if (startDate < getToday()) {
    errors.push("Project start date cannot be in the past.");
  }

  if (endDate <= startDate) {
    errors.push("Project end date must be after the start date.");
  }

  return errors;
}