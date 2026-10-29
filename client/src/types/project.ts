/**
 * File: project.ts
 *
 * Purpose:
 * Defines the data structure used for project configuration.
 *
 * Used by:
 * - ChatPage: Collects project details through AI.
 * - ProjectPage: Displays and edits project details.
 * - ReviewPage: Shows the final configuration.
 */

export interface ProjectConfig {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  selfEnrollment: boolean | null;
}

export const initialProjectConfig: ProjectConfig = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  selfEnrollment: null,
};