export type PolicyCategory = "교육" | "주거" | "복지·문화" | "일자리" | "참여·권리";

export interface BusanPolicy {
  id: number;
  name: string;
  keywords: string[];
  category: PolicyCategory;
  agency: string;
  description: string;
  targetSummary: string;
  ageMin: number;
  ageMax: number;
  employmentTypes: string[];
  maxIncomePct: number;
  amount: string;
  deadline: string | null;
  tip?: string;
}

export interface PolicyFilter {
  ageRange: string;
  district: string;
  employment: string;
  income: string;
}
