export type ActivityItemType = "policy" | "competition" | "job";

export interface AuthUser {
  name: string;
  email: string;
}

export interface SavedItem {
  id: number;
  type: ActivityItemType;
  title: string;
  org: string;
  deadline: string | null;
}

export interface AppliedItem {
  id: number;
  type: ActivityItemType;
  title: string;
  org: string;
  deadline: string | null;
  status: string;
}
