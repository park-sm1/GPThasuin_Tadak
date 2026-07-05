export interface Competition {
  id: number;
  name: string;
  organizer: string;
  url: string;
  categories: string[];
  description: string;
  prize: string;
  startDate: string;
  deadline: string;
  isBusan: boolean;
  eligibility: string;
}
