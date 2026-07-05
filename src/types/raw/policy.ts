export interface BusanPolicyRaw {
  id: string;
  title: string;
  category: "교육" | "주거" | "복지문화" | "일자리" | "참여권리";
  summary: string;
  ageMin: number | null;
  ageMax: number | null;
  studentStatus: "학생" | "비학생" | "무관";
  employmentStatus: "무관" | "취업청년" | "취업준비" | "예비창업청년";
  lowIncomeOnly: boolean;
  vulnerableGroupOnly: boolean;
  vulnerableGroupType: "저소득" | "보호종료아동" | "후기청소년" | null;
  supportType: "서비스지원" | "혼합형" | "현금성지원" | "인프라지원" | "제도운영" | "대출지원";
  relatedLaw: string;
  budgetThousandKRW: number;
}
