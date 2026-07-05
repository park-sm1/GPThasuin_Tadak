export interface SaraminJobRaw {
  id: string;
  companyName: string;
  title: string;
  url: string;
  parentCompany: string | null;
  sectorTags: string[];
  location: string;
  career: {
    raw: string;
    employmentType: string[];
    minYears: number;
    careerLabel: string;
  };
  education: string;
  deadlineLabel: string;
  registeredRecency: string;
  source: string;
  requiredCompetency: {
    technical: number;
    communication: number;
    problemSolving: number;
    initiative: number;
    adaptability: number;
  };
}
