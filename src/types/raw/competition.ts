export interface WevityCompetitionRaw {
  title: string;
  organizer: string;
  url: string;
  d_day: number;
  status: "접수중" | "접수예정" | "마감임박" | "마감";
  badges: string[];
  fields: string[];
  views: number;
}
