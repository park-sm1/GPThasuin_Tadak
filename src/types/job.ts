import type { CompetencyScores } from "./community";

export interface Job {
  id: number;
  company: string;
  title: string;
  url: string;
  industry: string;
  salary: string;
  location: string;
  deadline: string | null;
  tags: string[];
  description: string;
  requiredCompetency: CompetencyScores;
}
