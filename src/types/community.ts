export interface CompetencyScores {
  technical: number;
  communication: number;
  problemSolving: number;
  initiative: number;
  adaptability: number;
}

export type CharacterType = "전공형" | "소통형" | "해결형" | "도전형" | "적응형";

export interface CommunityPost {
  id: number;
  authorType: CharacterType;
  authorName: string;
  authorColor: string;
  authorIcon: string;
  competencies: CompetencyScores;
  title: string;
  content: string;
  lookingFor: CharacterType[];
  skills: string[];
  deadline: string;
  applicants: number;
}
