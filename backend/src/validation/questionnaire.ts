
/**
 * File: questionnaire.ts
 *
 * Purpose:
 * Perform basic structural validation of an
 * AI-generated FHIR R4 Questionnaire.
 *
 * This is PoC-level validation, not full FHIR
 * profile or terminology validation.
 */

export type QuestionnaireValidationResult = {
  valid: boolean;
  errors: string[];
};

const validItemTypes = new Set([
  "group",
  "display",
  "boolean",
  "decimal",
  "integer",
  "date",
  "dateTime",
  "time",
  "string",
  "text",
  "url",
  "choice",
  "open-choice",
  "attachment",
  "reference",
  "quantity",
]);

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateQuestionnaire(
  questionnaire: unknown
): QuestionnaireValidationResult {
  const errors: string[] = [];

  if (!isRecord(questionnaire)) {
    return {
      valid: false,
      errors: ["Questionnaire must be a JSON object."],
    };
  }

  if (questionnaire.resourceType !== "Questionnaire") {
    errors.push(
      'resourceType must be "Questionnaire".'
    );
  }

  if (questionnaire.status !== "draft") {
    errors.push('status must be "draft".');
  }

  if (
    typeof questionnaire.title !== "string" ||
    !questionnaire.title.trim()
  ) {
    errors.push("Questionnaire title is required.");
  }

  if (
    !Array.isArray(questionnaire.item) ||
    questionnaire.item.length === 0
  ) {
    errors.push(
      "Questionnaire must contain at least one question."
    );
  }

  const linkIds = new Set<string>();

  function validateItems(
    items: unknown[],
    location: string
  ) {
    items.forEach((item, index) => {
      const path = `${location}[${index}]`;

      if (!isRecord(item)) {
        errors.push(`${path} must be an object.`);
        return;
      }

      if (
        typeof item.linkId !== "string" ||
        !item.linkId.trim()
      ) {
        errors.push(`${path}.linkId is required.`);
      } else if (linkIds.has(item.linkId)) {
        errors.push(
          `${path}.linkId must be unique.`
        );
      } else {
        linkIds.add(item.linkId);
      }

      if (
        typeof item.text !== "string" ||
        !item.text.trim()
      ) {
        errors.push(`${path}.text is required.`);
      }

      if (
        typeof item.type !== "string" ||
        !validItemTypes.has(item.type)
      ) {
        errors.push(`${path}.type is invalid.`);
      }

      if (
        item.type === "choice" ||
        item.type === "open-choice"
      ) {
        if (
          !Array.isArray(item.answerOption) ||
          item.answerOption.length === 0
        ) {
          errors.push(
            `${path} requires answerOption.`
          );
        } else {
          item.answerOption.forEach((option, optionIndex) => {
            if (
              !isRecord(option) ||
              !Object.keys(option).some(
                (key) =>
                  key.startsWith("value") &&
                  option[key] !== undefined
              )
            ) {
              errors.push(
                `${path}.answerOption[${optionIndex}] is invalid.`
              );
            }
          });
        }
      }

      if (item.item !== undefined) {
        if (!Array.isArray(item.item)) {
          errors.push(`${path}.item must be an array.`);
        } else {
          validateItems(item.item, `${path}.item`);
        }
      }
    });
  }

  if (Array.isArray(questionnaire.item)) {
    validateItems(questionnaire.item, "item");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
