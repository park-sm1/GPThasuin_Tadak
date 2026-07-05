import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  Sparkles, Search, MapPin, Calendar, Briefcase, ExternalLink,
  ChevronDown, ArrowRight, Users, Clock, CheckCircle, Target, Zap, Star, X,
  RefreshCw, Layers, UserPlus, Send, Heart, ChevronRight, ChevronLeft, Trophy, FileText,
  Award, BookOpen, Building2, Bookmark, BookmarkCheck, TrendingUp, Bell,
  SlidersHorizontal, RotateCcw, Home, Palette,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from "recharts";
import { POLICIES } from "../data/processed/policies";
import { COMPETITIONS } from "../data/processed/competitions";
import { JOBS } from "../data/processed/jobs";
import { AuthScreen } from "../pages/auth/AuthScreen";
import { WritePostModal } from "../pages/community/WritePostModal";
import { HomePage } from "../pages/home/HomePage";
import * as authService from "../services/authService";
import type { AuthUser } from "../types/user";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "home" | "competition" | "competency" | "jobs" | "policy" | "community" | "mypage";
type MypageTab = "saved" | "applied" | "recent";

interface CompetencyScores { technical: number; communication: number; problemSolving: number; initiative: number; adaptability: number }
interface PolicyFilter { ageRange: string; district: string; employment: string; income: string }

interface Competition {
  id: number; name: string; organizer: string; url: string; categories: string[];
  description: string; prize: string; startDate: string; deadline: string;
  isBusan: boolean; eligibility: string;
}
interface BusanPolicy {
  id: number; name: string; keywords: string[]; category: "교육" | "주거" | "복지·문화" | "일자리" | "참여·권리";
  agency: string; description: string; targetSummary: string; ageMin: number; ageMax: number;
  employmentTypes: string[]; maxIncomePct: number; amount: string; deadline: string | null; tip?: string;
}
interface Job {
  id: number; company: string; title: string; url: string; industry: string; salary: string;
  location: string; deadline: string | null; tags: string[]; description: string;
  requiredCompetency: CompetencyScores;
}
interface CommunityPost {
  id: number; authorType: string; authorName: string; authorColor: string; authorIcon: string;
  competencies: CompetencyScores; title: string; recruitField: string; projectName: string; content: string; lookingFor: string[];
  skills: string[]; recruitCount: number; contact: string; createdAt: string; deadline: string; applicants: number;
}
interface SavedItem { id: number; type: "policy" | "competition" | "job"; title: string; org: string; deadline: string | null }
interface AppliedItem { id: number; type: "policy" | "competition" | "job"; title: string; org: string; deadline: string | null; status: string }

// ── Constants ──────────────────────────────────────────────────────────────────
const COMP_QUICK_FILTERS = ["전체", "디자인", "IT·개발", "영상·콘텐츠", "아이디어", "창업", "부산지역", "마감임박"];
const COMP_PAGE_SIZE = 12;
const POLICY_PAGE_SIZE = 10;
const JOB_PAGE_SIZE = 12;
// 실제 processed 데이터의 카테고리 값(기획·아이디어/창업·취업 등)은 그대로 두고, 화면에 보여줄
// 필터 칩 라벨만 요청된 표현으로 매핑한다 — raw→processed 변환 결과에는 손대지 않기 위함.
const COMP_FILTER_CATEGORY_MAP: Record<string, string> = { "아이디어": "기획·아이디어", "창업": "창업·취업" };
const TEAM_RECRUIT_FIELDS = ["공모전", "해커톤", "프로젝트", "스터디", "기타"];
const COMP_SORT_OPTIONS: [string, string][] = [["deadline","마감임박순"],["latest","최신순"],["prize","상금순"]];
const POLICY_SORT_OPTIONS: [string, string][] = [["match","추천순"],["deadline","마감임박순"],["latest","최신순"]];
const JOB_SORT_OPTIONS: [string, string][] = [["latest","최신순"],["deadline","마감임박순"],["salary","급여순"]];
const AGE_RANGES = ["만 18~24세", "만 25~29세", "만 30~34세"];
const DISTRICTS = ["강서구","금정구","기장군","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"];
const EMPLOYMENT_TYPES = ["대학생(휴학생)", "취업준비생", "재직자", "자영업자"];
const JOB_INDUSTRIES = [...new Set(JOBS.map(j => j.industry))].sort((a, b) => a.localeCompare(b, "ko"));
const JOB_QUICK_FILTERS = ["전체", "신입 가능", "정규직", "부산지역"];
const INCOME_LEVELS = [{ label: "중위소득 100% 이하", value: 100 }, { label: "중위소득 120% 이하", value: 120 }, { label: "중위소득 150% 이하", value: 150 }, { label: "상관없음", value: 999 }];
const POLICY_KEYWORDS = {
  "교육":     { icon:BookOpen, color:{ chip:"bg-violet-50 text-violet-700 border-violet-200",   active:"bg-violet-600 text-white" },  kws:["#지역인재","#등록금지원","#장학금","#역량개발"] },
  "주거":     { icon:Home,     color:{ chip:"bg-emerald-50 text-emerald-700 border-emerald-200", active:"bg-emerald-600 text-white" }, kws:["#월세지원","#보증금대출","#공공임대","#주거환경"] },
  "복지·문화": { icon:Palette,  color:{ chip:"bg-rose-50 text-rose-700 border-rose-200",         active:"bg-rose-600 text-white" },    kws:["#문화예술","#여가활동","#청년공간","#생활지원"] },
  "일자리":   { icon:Briefcase,color:{ chip:"bg-sky-50 text-sky-700 border-sky-200",             active:"bg-sky-600 text-white" },     kws:["#취업연계","#창업지원","#인턴십","#구직수당"] },
  "참여·권리": { icon:Users,    color:{ chip:"bg-amber-50 text-amber-700 border-amber-200",       active:"bg-amber-600 text-white" },   kws:["#청년참여","#권익보호","#네트워킹","#정책제안"] },
} as const;
const ALL_POLICY_KWS = Object.values(POLICY_KEYWORDS).flatMap(v => v.kws);
const POLICY_CATEGORY_LIST = [
  { key: "" as const, label: "전체", icon: Layers },
  ...(Object.keys(POLICY_KEYWORDS) as (keyof typeof POLICY_KEYWORDS)[]).map(cat => ({ key: cat, label: cat, icon: POLICY_KEYWORDS[cat].icon })),
];
const COMPETENCY_LABELS: { key: keyof CompetencyScores; label: string; sub: string; color: string }[] = [
  { key:"technical",     label:"전공역량",   sub:"Technical Skill",  color:"bg-indigo-500" },
  { key:"communication", label:"글로벌/소통", sub:"Communication",    color:"bg-blue-500"   },
  { key:"problemSolving",label:"문제해결력",  sub:"Problem Solving",  color:"bg-violet-500" },
  { key:"initiative",    label:"도전정신",   sub:"Initiative",       color:"bg-amber-500"  },
  { key:"adaptability",  label:"조직적응력",  sub:"Adaptability",     color:"bg-emerald-500"},
];
const CHARACTER_MAP: Record<keyof CompetencyScores, { type:string; icon:string; colorClass:string; bgClass:string; names:string[] }> = {
  technical:      { type:"전공형",  icon:"🔬", colorClass:"text-indigo-700", bgClass:"bg-indigo-50 border-indigo-200",   names:["익명의 갈매기","익명의 고등어","익명의 낙동강"] },
  communication:  { type:"소통형",  icon:"💬", colorClass:"text-blue-700",   bgClass:"bg-blue-50 border-blue-200",       names:["익명의 동백꽃","익명의 해운대","익명의 광안리"] },
  problemSolving: { type:"해결형",  icon:"🧩", colorClass:"text-violet-700", bgClass:"bg-violet-50 border-violet-200",   names:["익명의 영도다리","익명의 자갈치","익명의 태종대"] },
  initiative:     { type:"도전형",  icon:"⚡", colorClass:"text-amber-700",  bgClass:"bg-amber-50 border-amber-200",     names:["익명의 부산포","익명의 범어사","익명의 금정산"] },
  adaptability:   { type:"적응형",  icon:"🌊", colorClass:"text-emerald-700",bgClass:"bg-emerald-50 border-emerald-200", names:["익명의 오륙도","익명의 송도","익명의 다대포"] },
};
const VERTEX_TIPS: Record<keyof CompetencyScores, string> = {
  technical:"직무 관련 프로젝트 경험과 전문 기술 보유가 우수합니다.", communication:"협업·발표·의사소통 경험이 풍부하게 드러납니다.",
  problemSolving:"위기 대처 및 논리적 문제 해결 역량이 강합니다.", initiative:"새로운 환경에 도전하는 주도적 학습 의지가 돋보입니다.",
  adaptability:"조직 문화 이해도와 유연한 업무 태도가 확인됩니다.",
};
const TYPE_META = {
  policy:      { label:"정책",  icon: FileText,  badgeClass:"bg-emerald-50 text-emerald-700 border-emerald-200" },
  competition: { label:"공모전", icon: Trophy,    badgeClass:"bg-amber-50 text-amber-700 border-amber-200" },
  job:         { label:"채용",  icon: Briefcase, badgeClass:"bg-blue-50 text-blue-700 border-blue-200" },
};

// ── Mock Data ──────────────────────────────────────────────────────────────────
// COMPETITIONS/POLICIES/JOBS all come from src/data/processed/*.ts, generated by
// scripts/transform*.js from the raw JSON datasets in src/data/raw/.

const COMMUNITY_POSTS = [
  { id:1, authorType:"전공형", authorName:"익명의 갈매기",  authorColor:"text-indigo-700", authorIcon:"🔬", competencies:{technical:88,communication:62,problemSolving:75,initiative:71,adaptability:68}, title:"[부산 스마트시티] 데이터 분석 팀원 구합니다", recruitField:"공모전", projectName:"부산 스마트시티 공모전", content:"부산시 공모전 참가 예정입니다. Python·데이터 분석 중심이며 기획 1명, 개발 1명 더 필요해요!", lookingFor:["소통형","해결형"], skills:["Python","기획"], recruitCount:4, contact:"오픈카톡 bit.ly/tadak-team1", createdAt:"2026-07-02", deadline:"2026-08-01", applicants:3 },
  { id:2, authorType:"소통형", authorName:"익명의 동백꽃",  authorColor:"text-blue-700",   authorIcon:"💬", competencies:{technical:55,communication:91,problemSolving:72,initiative:80,adaptability:86}, title:"[청년 창업 공모전] UX·마케팅 팀 구성 중",     recruitField:"공모전", projectName:"부산 청년 창업 경진대회", content:"서비스 기획부터 마케팅까지 함께할 분 찾습니다. 부산 청년 창업 경진대회 출전 목표입니다.", lookingFor:["전공형","도전형"], skills:["UX","마케팅"], recruitCount:5, contact:"이메일 dongbaek@example.com", createdAt:"2026-07-03", deadline:"2026-08-10", applicants:5 },
  { id:3, authorType:"도전형", authorName:"익명의 금정산",  authorColor:"text-amber-700",  authorIcon:"⚡", competencies:{technical:72,communication:68,problemSolving:80,initiative:93,adaptability:74}, title:"[AI 헬스케어 해커톤] 팀원 급구",             recruitField:"해커톤", projectName:"AI 헬스케어 해커톤", content:"24시간 해커톤. 아이디어는 있고 개발자·디자이너 필요합니다!", lookingFor:["전공형","적응형"], skills:["기획","의료지식"], recruitCount:4, contact:"오픈카톡 bit.ly/tadak-team3", createdAt:"2026-07-04", deadline:"2026-07-25", applicants:7 },
  { id:4, authorType:"해결형", authorName:"익명의 자갈치",  authorColor:"text-violet-700", authorIcon:"🧩", competencies:{technical:80,communication:74,problemSolving:90,initiative:68,adaptability:77}, title:"[부산시 앱 공모전] 풀스택 팀 구성",          recruitField:"공모전", projectName:"부산시 앱 공모전", content:"지역 청년 교통 문제 해결 앱 개발. React·Spring 스택, 원정대도 환영합니다!", lookingFor:["소통형","전공형"], skills:["React","Spring"], recruitCount:4, contact:"이메일 jagalchi@example.com", createdAt:"2026-07-01", deadline:"2026-08-20", applicants:2 },
];

const SAMPLE_ESSAY = `저는 부산대학교 컴퓨터공학과 4학년으로 졸업을 앞두고 있습니다. Python과 Java를 활용한 백엔드 개발을 전공하며 데이터 분석과 알고리즘 설계에 깊은 관심을 가져왔습니다.\n\n팀 프로젝트에서는 항상 소통과 협업을 최우선으로 여겼습니다. 5인 팀의 팀장으로서 정기 회의를 주도하고, 팀원 간 의견 충돌 시 논리적으로 조율하여 최적의 결론을 도출했습니다.\n\n졸업 프로젝트에서 서비스 응답속도 문제를 발견했을 때, DB 쿼리 최적화 솔루션을 직접 개발·적용해 응답속도를 60% 향상시켰습니다.\n\n새로운 기술을 배우는 것을 두려워하지 않습니다. 혼자 도전하여 AWS 자격증을 취득했고, 머신러닝 스터디를 만들어 주도적으로 운영 중입니다.`;

// ── Utilities ──────────────────────────────────────────────────────────────────
function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function parseAgeRange(r: string): [number, number] {
  if (r === "만 18~24세") return [18, 24];
  if (r === "만 25~29세") return [25, 29];
  if (r === "만 30~34세") return [30, 34];
  return [15, 69];
}
function analyzeEssay(text: string): CompetencyScores {
  const lower = text.toLowerCase();
  const count = (words: string[]) => words.reduce((s, w) => s + (lower.split(w).length - 1), 0);
  return {
    technical: Math.min(97, 52 + count(["개발","프로그래밍","설계","python","java","sql","데이터","알고리즘","aws","클라우드"]) * 6),
    communication: Math.min(97, 48 + count(["팀","협업","소통","발표","커뮤니케이션","리더","조율","협력"]) * 6),
    problemSolving: Math.min(97, 50 + count(["문제","해결","개선","최적화","극복","전략","효율","솔루션"]) * 6),
    initiative: Math.min(97, 46 + count(["도전","주도","혁신","새로운","시도","창의","아이디어","추진"]) * 6),
    adaptability: Math.min(97, 48 + count(["적응","유연","변화","다양","경험","배우","성장","조화"]) * 6),
  };
}
function getDominantKey(s: CompetencyScores): keyof CompetencyScores {
  return (Object.keys(s) as (keyof CompetencyScores)[]).reduce((a, b) => s[a] > s[b] ? a : b);
}
function getCharacter(s: CompetencyScores) {
  const k = getDominantKey(s);
  const c = CHARACTER_MAP[k];
  return { ...c, name: c.names[0] };
}
function decomposeKeywords(query: string, pool: readonly string[]): string[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const chips: string[] = words.map(w => `#${w}`);
  if (words.length > 1) chips.push(`#${query.trim()}`);
  pool.filter(k => words.some(w => k.toLowerCase().includes(w.toLowerCase()))).forEach(k => { if (!chips.includes(k)) chips.push(k); });
  return chips.slice(0, 6);
}
function getJobMatchScore(job: Job, scores: CompetencyScores): number {
  const keys = Object.keys(scores) as (keyof CompetencyScores)[];
  const avgDiff = keys.reduce((sum, k) => sum + Math.abs(scores[k] - job.requiredCompetency[k]), 0) / keys.length;
  return Math.round(100 - avgDiff);
}
function getJobMatchReasons(job: Job, searchQuery: string, scores?: CompetencyScores | null): string[] {
  const reasons: string[] = [];
  if (scores) {
    const dominant = getDominantKey(scores);
    if (job.requiredCompetency[dominant] >= 60) {
      const label = COMPETENCY_LABELS.find(c => c.key === dominant)?.label;
      reasons.push(`내 강점인 ${label}이 이 공고의 요구 역량과 잘 맞아요`);
    }
  }
  if (job.location.includes("부산")) reasons.push("부산 지역에서 근무 가능한 공고예요");
  if (job.tags.includes("신입") || job.tags.includes("경력무관")) reasons.push("신입 또는 경력 무관 조건에 해당해요");
  if (job.tags.includes("정규직")) reasons.push("정규직 채용 공고예요");
  if (searchQuery.trim() && (job.title.includes(searchQuery) || job.industry.toLowerCase().includes(searchQuery.toLowerCase()))) {
    reasons.push(`${job.industry} 분야와 관련 있는 공고예요`);
  }
  if (reasons.length === 0) reasons.push(`${job.industry} 분야의 채용 공고예요`);
  return reasons.slice(0, 3);
}
function getPolicyAIReasons(policy: BusanPolicy, filter: PolicyFilter): string[] {
  const reasons: string[] = [];
  if (filter.district) reasons.push(`거주지역: ${filter.district} 거주 조건과 일치합니다`);
  if (filter.employment && policy.employmentTypes.includes(filter.employment)) reasons.push(`현재 상태: ${filter.employment} 조건에 해당합니다`);
  if (filter.ageRange) reasons.push(`연령 조건: ${filter.ageRange} 범위에 포함됩니다`);
  if (policy.maxIncomePct === 999) reasons.push("소득 조건과 무관하게 신청할 수 있어요");
  if (reasons.length === 0) {
    reasons.push("지원 대상 조건을 확인해보세요");
    reasons.push(`혜택: ${policy.amount}`);
  }
  return reasons.slice(0, 3);
}
function getCompetitionReasons(comp: Competition): string[] {
  const reasons: string[] = [];
  if (comp.isBusan) reasons.push("부산 지역 공모전이에요");
  if (comp.categories[0]) reasons.push(`${comp.categories[0]} 분야 공모전이에요`);
  const d = daysUntil(comp.deadline);
  if (d >= 0) reasons.push(d === 0 ? "오늘이 접수 마감일이에요" : `마감까지 ${d}일 남았어요`);
  if (reasons.length === 0) reasons.push(`주최: ${comp.organizer}`);
  return reasons.slice(0, 3);
}
function getRelatedPolicies(policy: BusanPolicy, all: BusanPolicy[]): BusanPolicy[] {
  return all.filter(p => p.id !== policy.id && (p.category === policy.category || p.keywords.some(k => policy.keywords.includes(k)))).slice(0, 3);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DayBadge({ deadline }: { deadline: string | null }) {
  const base = "inline-flex items-center justify-center min-w-[72px] px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0";
  if (!deadline) return <span className={`${base} bg-emerald-50 text-emerald-700`}>상시신청</span>;
  const d = daysUntil(deadline);
  if (d < 0) return <span className={`${base} bg-muted text-muted-foreground font-medium line-through`}>마감</span>;
  if (d === 0) return <span className={`${base} bg-rose-500 text-white`}>오늘 마감</span>;
  if (d <= 3) return <span className={`${base} bg-rose-500 text-white`}>D-{d}</span>;
  if (d <= 7) return <span className={`${base} bg-amber-50 text-amber-700`}>D-{d}</span>;
  return <span className={`${base} bg-muted text-muted-foreground font-medium`}>D-{d}</span>;
}

function BookmarkBtn({ saved, onClick }: { saved: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(e); }}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${saved ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-muted text-muted-foreground border-border hover:border-rose-200 hover:text-rose-500"}`}>
      <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
      {saved ? "관심등록됨" : "관심등록"}
    </button>
  );
}

function AIReasonCard({ reasons, summary, onEdit }: { reasons: string[]; summary: string; onEdit?: () => void }) {
  return (
    <div className="bg-secondary border border-primary/15 rounded-xl p-4 space-y-2.5">
      <p className="text-xs font-bold text-primary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> 이 항목이 추천된 이유</p>
      <div className="space-y-1.5">
        {reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-foreground">
            <CheckCircle className="w-3.5 h-3.5 text-primary/60 flex-shrink-0 mt-0.5" />{r}
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-foreground pt-2 border-t border-primary/15">{summary}</p>
      {onEdit && <button onClick={onEdit} className="text-xs text-primary hover:underline flex items-center gap-1">조건 수정하기 <ArrowRight className="w-3 h-3" /></button>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex justify-between"><div className="h-5 bg-muted rounded-full w-20" /><div className="h-5 bg-muted rounded-full w-12" /></div>
      <div className="h-5 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-10 bg-muted rounded-xl" />
      <div className="space-y-1.5"><div className="h-3 bg-muted rounded" /><div className="h-3 bg-muted rounded w-4/5" /></div>
      <div className="flex gap-2"><div className="h-7 bg-muted rounded-lg w-24" /><div className="h-7 bg-muted rounded-lg w-16 ml-auto" /></div>
    </div>
  );
}

function CompetitionCard({ comp, saved, onSave, onDetail }: { comp: Competition; saved: boolean; onSave: () => void; onDetail: () => void }) {
  const catColor: Record<string, string> = { "기획·아이디어":"bg-emerald-50 text-emerald-700","IT·개발":"bg-blue-50 text-blue-700","디자인":"bg-violet-50 text-violet-700","영상·콘텐츠":"bg-rose-50 text-rose-700","마케팅·홍보":"bg-amber-50 text-amber-700","창업·취업":"bg-cyan-50 text-cyan-700","사회공헌":"bg-teal-50 text-teal-700" };
  return (
    <div onClick={onDetail} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1"><Trophy className="w-3 h-3" /> 공모전</span>
          {comp.categories.slice(0,1).map(c => <span key={c} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${catColor[c] || "bg-muted text-muted-foreground"}`}>{c}</span>)}
          {comp.isBusan && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">부산지역</span>}
        </div>
        <DayBadge deadline={comp.deadline} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">{comp.name}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{comp.organizer}</p>
      </div>
      <div className="bg-muted rounded-xl px-3.5 py-2.5">
        <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">상금·혜택</p>
        <p className="text-sm font-bold text-foreground">{comp.prize}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{comp.description}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3 h-3" /><span className="text-foreground/70">{comp.eligibility}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />접수: {comp.startDate} ~ {comp.deadline}
      </div>
      <div className="flex gap-2 pt-2 border-t border-border">
        <BookmarkBtn saved={saved} onClick={() => onSave()} />
        <button onClick={e => { e.stopPropagation(); onDetail(); }} className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          상세보기 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PolicyCard({ policy, saved, onSave, onDetail, filter, onConditionEdit }: {
  policy: BusanPolicy; saved: boolean; onSave: () => void; onDetail: () => void;
  filter: PolicyFilter; onConditionEdit?: () => void;
}) {
  const catMeta = POLICY_KEYWORDS[policy.category];
  const dl = policy.deadline ? daysUntil(policy.deadline) : null;
  const hasFilter = !!(filter.ageRange || filter.district || filter.employment || filter.income);
  const aiReasons = hasFilter ? getPolicyAIReasons(policy, filter) : [];
  return (
    <div onClick={onDetail} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1"><FileText className="w-3 h-3" /> 정책</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${catMeta.color.chip}`}><catMeta.icon className="w-3 h-3" />{policy.category}</span>
        </div>
        <DayBadge deadline={policy.deadline} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">{policy.name}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{policy.agency}</p>
      </div>
      {/* Key benefit + target — most visible */}
      <div className="bg-muted rounded-xl px-3.5 py-2.5 space-y-1">
        <p className="text-[11px] text-muted-foreground font-medium">지원금·혜택</p>
        <p className="text-sm font-bold text-foreground">{policy.amount}</p>
        <p className="text-xs text-muted-foreground mt-0.5">대상: {policy.targetSummary}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{policy.description}</p>
      {policy.tip && (
        <div className="flex gap-1.5 text-xs text-foreground bg-muted rounded-lg px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary/70" />{policy.tip}
        </div>
      )}
      {aiReasons.length > 0 && (
        <AIReasonCard reasons={aiReasons} summary="내 상황에 맞는 지원 가능성이 높아요." onEdit={onConditionEdit} />
      )}
      <div className="flex gap-2 pt-2 border-t border-border">
        <BookmarkBtn saved={saved} onClick={() => onSave()} />
        <button onClick={e => { e.stopPropagation(); onDetail(); }} className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          상세보기 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function JobCard({ job, saved, onSave, onDetail, searchQuery, scores }: { job: Job; saved: boolean; onSave: () => void; onDetail: () => void; searchQuery: string; scores?: CompetencyScores | null }) {
  const reasons = getJobMatchReasons(job, searchQuery, scores);
  return (
    <div onClick={onDetail} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1"><Briefcase className="w-3 h-3" /> 채용</span>
          <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{job.industry}</span>
        </div>
        <DayBadge deadline={job.deadline} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">{job.title}</h3>
        <p className="text-xs font-semibold text-primary">{job.company}</p>
      </div>
      <div className="bg-muted rounded-xl px-3.5 py-2.5">
        <p className="text-[11px] text-muted-foreground font-medium mb-0.5">근무 정보</p>
        <div className="flex flex-wrap gap-2 text-xs text-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
          <span>{job.salary}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{job.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {job.tags.map(t => <span key={t} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{t}</span>)}
      </div>
      {/* Realistic match reasons */}
      <div className="bg-secondary border border-primary/15 rounded-xl px-3 py-2.5 space-y-1.5">
        <p className="text-[11px] font-bold text-primary">조건 일치 항목</p>
        {reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
            <CheckCircle className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />{r}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2 border-t border-border">
        <BookmarkBtn saved={saved} onClick={() => onSave()} />
        <button onClick={e => { e.stopPropagation(); onDetail(); }} className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          상세보기 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, saved, onSave, onSwitchTab, policyFilter, onOpenPolicy, scores }: {
  item: { type: "competition" | "policy" | "job"; id: number } | null;
  onClose: () => void; saved: boolean; onSave: () => void; onSwitchTab: (t: Tab) => void;
  policyFilter: PolicyFilter; onOpenPolicy: (id: number) => void; scores: CompetencyScores | null;
}) {
  const comp = item?.type === "competition" ? COMPETITIONS.find(c => c.id === item.id) : null;
  const policy = item?.type === "policy" ? POLICIES.find(p => p.id === item.id) : null;
  const job = item?.type === "job" ? JOBS.find(j => j.id === item.id) : null;
  const isExpired = (deadline: string | null) => deadline ? daysUntil(deadline) < 0 : false;
  const externalUrl = comp?.url ?? job?.url ?? null;

  return (
    <AnimatePresence>
      {item && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-background w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                {comp && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Trophy className="w-3 h-3" /> 공모전</span>}
                {policy && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><FileText className="w-3 h-3" /> 정책</span>}
                {job && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Briefcase className="w-3 h-3" /> 채용</span>}
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {comp && (
                <>
                  <div><h2 className="text-lg font-black text-foreground leading-snug mb-1">{comp.name}</h2><p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{comp.organizer}</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground font-medium mb-1">상금·혜택</p><p className="text-sm font-bold text-foreground">{comp.prize}</p></div>
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">접수 기간</p><p className="text-sm font-bold text-foreground">{comp.startDate} ~<br/>{comp.deadline}</p></div>
                  </div>
                  <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase">지원 대상</p><p className="text-sm text-foreground bg-muted rounded-xl p-3">{comp.eligibility}</p></div>
                  <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase">공모전 소개</p><p className="text-sm text-muted-foreground leading-relaxed">{comp.description}</p></div>
                  <div className="flex flex-wrap gap-1.5">
                    {comp.categories.map(c => <span key={c} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md">{c}</span>)}
                    {comp.isBusan && <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">부산지역</span>}
                  </div>
                  <AIReasonCard reasons={getCompetitionReasons(comp)} summary="지금 바로 공모전을 확인해보세요!" />
                </>
              )}
              {policy && (
                <>
                  <div><h2 className="text-lg font-black text-foreground leading-snug mb-1">{policy.name}</h2><p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{policy.agency}</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground font-medium mb-1">지원금·혜택</p><p className="text-sm font-bold text-foreground">{policy.amount}</p></div>
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">신청 마감</p><p className="text-sm font-bold text-foreground">{policy.deadline ?? "상시신청"}</p></div>
                  </div>
                  <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase">지원 대상</p><p className="text-sm text-foreground bg-muted rounded-xl p-3">{policy.targetSummary}</p></div>
                  <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase">정책 내용</p><p className="text-sm text-muted-foreground leading-relaxed">{policy.description}</p></div>
                  {policy.tip && <div className="bg-muted rounded-xl p-3 text-xs text-foreground flex gap-2"><Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary/70" />{policy.tip}</div>}
                  {isExpired(policy.deadline) ? (
                    <div className="bg-muted rounded-xl p-4 text-center space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">마감된 정책입니다</p>
                    </div>
                  ) : (
                    <AIReasonCard reasons={getPolicyAIReasons(policy, policyFilter)} summary="내 상황에 맞는 지원 가능성이 높아요." onEdit={() => { onClose(); onSwitchTab("policy"); }} />
                  )}
                  {getRelatedPolicies(policy, POLICIES).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">비슷한 정책 보기</p>
                      <p className="text-[11px] text-muted-foreground -mt-1">같은 카테고리·키워드 기준으로 골라봤어요 (유사도 계산 아님)</p>
                      <div className="space-y-2">
                        {getRelatedPolicies(policy, POLICIES).map(rp => (
                          <button key={rp.id} onClick={() => onOpenPolicy(rp.id)}
                            className="w-full text-left bg-muted hover:bg-secondary rounded-xl px-3.5 py-2.5 transition-colors">
                            <p className="text-sm font-semibold text-foreground truncate">{rp.name}</p>
                            <p className="text-xs text-muted-foreground">{rp.category} · {rp.agency}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {job && (
                <>
                  <div><h2 className="text-lg font-black text-foreground leading-snug mb-1">{job.title}</h2><p className="text-sm font-semibold text-primary mb-0.5">{job.company}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.industry}</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground font-medium mb-1">근무지</p><p className="text-sm font-bold text-foreground">{job.location}</p></div>
                    <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">연봉</p><p className="text-sm font-bold text-foreground">{job.salary}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{job.tags.map(t => <span key={t} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md">{t}</span>)}</div>
                  <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase">채용 내용</p><p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p></div>
                  <div className="bg-secondary border border-primary/15 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-primary">내 조건과 맞는 이유</p>
                    {getJobMatchReasons(job, "", scores).map((r, i) => <div key={i} className="flex items-start gap-2 text-xs text-foreground"><CheckCircle className="w-3 h-3 text-primary/60 mt-0.5 flex-shrink-0" />{r}</div>)}
                  </div>
                </>
              )}
            </div>

            {/* Sticky footer */}
            <div className="p-4 border-t border-border bg-background space-y-3 sticky bottom-0">
              {isExpired(comp?.deadline ?? null) || isExpired(policy?.deadline ?? null) ? (
                <div className="text-center text-sm font-semibold text-muted-foreground py-2">마감된 공고입니다</div>
              ) : (
                <a href={externalUrl ?? "#"} target={externalUrl ? "_blank" : undefined} rel={externalUrl ? "noopener noreferrer" : undefined}
                  onClick={e => { if (!externalUrl) e.preventDefault(); }}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors">
                  {comp && "공모전 공식 페이지 바로가기"}{policy && "공식 공고 보기"}{job && "채용 공고 원문 보기"}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <div className="flex gap-2">
                <BookmarkBtn saved={saved} onClick={() => onSave()} />
                {!isExpired(comp?.deadline ?? null) && !isExpired(policy?.deadline ?? null) && (
                  <a href={externalUrl ?? "#"} target={externalUrl ? "_blank" : undefined} rel={externalUrl ? "noopener noreferrer" : undefined}
                    onClick={e => { if (!externalUrl) e.preventDefault(); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-secondary text-primary text-sm font-semibold py-3 rounded-xl hover:bg-secondary/70 transition-colors">
                    {comp && "응모 페이지로 이동"}{policy && "신청 사이트 바로가기"}{job && "지원 사이트로 이동"}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── DualRadarPanel (for competency tab) ────────────────────────────────────────
function DualRadarPanel({ scores, onClose }: { scores: CompetencyScores; onClose: () => void }) {
  const data = COMPETENCY_LABELS.map(c => ({ subject: c.label, value: scores[c.key], fullMark: 100 }));
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }} transition={{ duration:0.25 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> 나의 역량 오각형</p>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(15,23,42,0.08)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:"#64748b", fontFamily:"'Noto Sans KR',sans-serif" }} />
          <PolarRadiusAxis angle={90} domain={[0,100]} tick={false} axisLine={false} />
          <Radar name="역량" dataKey="value" stroke="#4338ca" fill="#4338ca" fillOpacity={0.18} strokeWidth={2} dot={{ r:4, fill:"#4338ca" }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
          <Tooltip formatter={(v: number, _: string, e: {payload?: {subject?: string}}) => {
            const key = COMPETENCY_LABELS.find(c => c.label === e?.payload?.subject)?.key;
            return [<span key="v">{v}점 — {key ? VERTEX_TIPS[key] : ""}</span>, ""];
          }} contentStyle={{ borderRadius:"0.75rem", border:"1px solid rgba(15,23,42,0.08)", fontSize:11, maxWidth:220 }} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Defined at module scope (not inside App()) so its identity stays stable across
// re-renders — declaring it inside App() made React remount the <input> on every
// keystroke (new setState → new App render → new SearchSection reference), which
// broke focus and Korean IME composition after the first character.
function SearchSection({ value, onChange, onSearch, onKeyDown, placeholder, chips, onApplyChip, isSearching }: {
  value: string; onChange: (v: string) => void; onSearch: () => void; onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string; chips: string[]; onApplyChip: (c: string) => void; isSearching: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder}
            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        </div>
        <button onClick={onSearch} disabled={isSearching}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all">
          {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="hidden sm:block">검색</span>
        </button>
      </div>
      <AnimatePresence>
        {chips.length > 0 && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-muted-foreground self-center flex items-center gap-1"><Sparkles className="w-3 h-3" />자동 파싱:</span>
              {chips.map((chip, i) => (
                <motion.button key={chip} initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:"spring", stiffness:400, damping:15, delay:i*0.08 }}
                  onClick={() => onApplyChip(chip)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-secondary text-primary border-primary/30 hover:bg-primary hover:text-white transition-colors">
                  {chip}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PAGINATION_GROUP_SIZE = 5;

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const groupStart = Math.floor((page - 1) / PAGINATION_GROUP_SIZE) * PAGINATION_GROUP_SIZE + 1;
  const groupEnd = Math.min(groupStart + PAGINATION_GROUP_SIZE - 1, totalPages);
  const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  const hasPrevGroup = groupStart > 1;
  const hasNextGroup = groupEnd < totalPages;
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button onClick={() => onChange(Math.max(1, groupStart - PAGINATION_GROUP_SIZE))} disabled={!hasPrevGroup}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${p === page ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(totalPages, groupStart + PAGINATION_GROUP_SIZE))} disabled={!hasNextGroup}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Auth (dummy — src/services/authService.ts, localStorage-backed until a real backend exists)
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);

  // Bookmarks & activity
  const [savedPolicies, setSavedPolicies]           = useState<Set<number>>(new Set([1, 3]));
  const [savedCompetitions, setSavedCompetitions]   = useState<Set<number>>(new Set([1, 6]));
  const [savedJobs, setSavedJobs]                   = useState<Set<number>>(new Set([2]));
  const [appliedItems, setAppliedItems]             = useState<AppliedItem[]>([
    { id:2, type:"competition", title:"K-콘텐츠 청년 크리에이터 공모전", org:"문화체육관광부", deadline:"2026-07-31", status:"응모완료" },
    { id:7, type:"policy", title:"청년 구직활동 지원금", org:"고용노동부", deadline:"2026-08-31", status:"신청완료" },
  ]);

  // Detail modal
  const [detailItem, setDetailItem] = useState<{ type: "competition" | "policy" | "job"; id: number } | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<{ type: "competition" | "policy" | "job"; id: number }[]>([]);

  // Tab 1: 공모전
  const [compQuery, setCompQuery]                   = useState("");
  const [compChips, setCompChips]                   = useState<string[]>([]);
  const [compIsSearching, setCompIsSearching]       = useState(false);
  const [compIsLoading, setCompIsLoading]           = useState(false);
  const [compFilters, setCompFilters]               = useState<Set<string>>(new Set());
  const [compSortMode, setCompSortMode]             = useState<string>("deadline");
  const [compPage, setCompPage]                     = useState(1);

  // Tab 3: 채용매칭
  const [jobQuery, setJobQuery]                     = useState("");
  const [jobSortMode, setJobSortMode]               = useState<string>("latest");
  const [jobIndustryFilter, setJobIndustryFilter]   = useState("");
  const [jobQuickFilters, setJobQuickFilters]       = useState<Set<string>>(new Set());
  const [jobPage, setJobPage]                       = useState(1);

  // Tab 4: 정책찾기
  const [psQuery, setPsQuery]                       = useState("");
  const [psChips, setPsChips]                       = useState<string[]>([]);
  const [psIsSearching, setPsIsSearching]           = useState(false);
  const [psIsLoading, setPsIsLoading]               = useState(false);
  const [psSelectedKws, setPsSelectedKws]           = useState<Set<string>>(new Set());
  const [psFilter, setPsFilter]                     = useState<PolicyFilter>({ ageRange:"", district:"", employment:"", income:"" });
  const [psCategoryFilter, setPsCategoryFilter]     = useState<BusanPolicy["category"] | "">("");
  const [psKeywordShowAll, setPsKeywordShowAll]     = useState(false);
  const [psSortMode, setPsSortMode]                 = useState<string>("match");
  const [psPage, setPsPage]                         = useState(1);

  // Tab 2: 역량진단
  const [essayText, setEssayText]                   = useState("");
  const [analyzing, setAnalyzing]                   = useState(false);
  const [analyzeStep, setAnalyzeStep]               = useState(0);
  const [scores, setScores]                         = useState<CompetencyScores | null>(null);
  const [animatedScores, setAnimatedScores]         = useState<CompetencyScores | null>(null);
  const [showRadar, setShowRadar]                   = useState(false);

  // Tab 5: 팀빌딩
  const [posts, setPosts]                           = useState<CommunityPost[]>(COMMUNITY_POSTS);
  const [showWriteModal, setShowWriteModal]         = useState(false);
  const [applyingPost, setApplyingPost]             = useState<number | null>(null);

  // Tab 6: 마이페이지
  const [mypageTab, setMypageTab]                   = useState<MypageTab>("saved");
  const [showAllSaved, setShowAllSaved]             = useState(false);
  const [savedSortMode, setSavedSortMode]           = useState<"recent" | "deadline" | "type">("recent");
  const [savedAt, setSavedAt]                       = useState<Record<string, number>>({});

  // ── Computed ──
  const filteredCompetitions = useMemo(() => {
    return COMPETITIONS.filter(comp => {
      if (compQuery.trim() && !comp.name.toLowerCase().includes(compQuery.toLowerCase()) && !comp.description.toLowerCase().includes(compQuery.toLowerCase()) && !comp.categories.some(c => c.toLowerCase().includes(compQuery.toLowerCase()))) return false;
      for (const f of compFilters) {
        if (f === "전체") continue;
        if (f === "부산지역" && !comp.isBusan) return false;
        if (f === "마감임박" && daysUntil(comp.deadline) > 7) return false;
        if (!["부산지역","마감임박"].includes(f) && !comp.categories.includes(COMP_FILTER_CATEGORY_MAP[f] ?? f)) return false;
      }
      return daysUntil(comp.deadline) >= 0;
    }).sort((a, b) => {
      if (compSortMode === "deadline") return daysUntil(a.deadline) - daysUntil(b.deadline);
      return b.id - a.id;
    });
  }, [compQuery, compFilters, compSortMode]);

  const compTotalPages = Math.max(1, Math.ceil(filteredCompetitions.length / COMP_PAGE_SIZE));
  const pagedCompetitions = filteredCompetitions.slice((compPage - 1) * COMP_PAGE_SIZE, compPage * COMP_PAGE_SIZE);

  // Reset to page 1 whenever the underlying result set changes
  useEffect(() => { setCompPage(1); }, [compQuery, compFilters, compSortMode]);

  const filteredJobs = useMemo(() => {
    return JOBS.filter(j => {
      if (jobQuery.trim() && !j.title.toLowerCase().includes(jobQuery.toLowerCase()) && !j.industry.toLowerCase().includes(jobQuery.toLowerCase()) && !j.company.toLowerCase().includes(jobQuery.toLowerCase())) return false;
      if (jobIndustryFilter && j.industry !== jobIndustryFilter) return false;
      for (const f of jobQuickFilters) {
        if (f === "전체") continue;
        if (f === "신입 가능" && !j.tags.includes("신입") && !j.tags.includes("경력무관")) return false;
        if (f === "정규직" && !j.tags.includes("정규직")) return false;
        if (f === "부산지역" && !j.location.includes("부산")) return false;
      }
      return true;
    }).sort((a, b) => {
      if (jobSortMode === "match" && scores) return getJobMatchScore(b, scores) - getJobMatchScore(a, scores);
      if (jobSortMode === "deadline") return (a.deadline ? daysUntil(a.deadline) : 9999) - (b.deadline ? daysUntil(b.deadline) : 9999);
      return b.id - a.id;
    });
  }, [jobQuery, jobSortMode, jobIndustryFilter, jobQuickFilters, scores]);

  const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / JOB_PAGE_SIZE));
  const pagedJobs = filteredJobs.slice((jobPage - 1) * JOB_PAGE_SIZE, jobPage * JOB_PAGE_SIZE);

  // Reset to page 1 whenever the underlying result set changes
  useEffect(() => { setJobPage(1); }, [jobQuery, jobSortMode, jobIndustryFilter, jobQuickFilters]);

  // Once competency diagnosis completes, switch jobs to match-based sorting automatically
  useEffect(() => { if (scores) setJobSortMode("match"); }, [scores]);

  const matchedPolicies = useMemo(() => {
    const [minAge, maxAge] = psFilter.ageRange ? parseAgeRange(psFilter.ageRange) : [15, 69];
    const maxIncome = psFilter.income ? (INCOME_LEVELS.find(l => l.label === psFilter.income)?.value ?? 999) : 999;
    const hasFilters = psSelectedKws.size > 0 || !!psFilter.ageRange || !!psFilter.employment || !!psFilter.income;
    return POLICIES.filter(p => {
      if (psCategoryFilter && p.category !== psCategoryFilter) return false;
      if (psQuery.trim() && !p.name.includes(psQuery) && !p.description.includes(psQuery) && !p.targetSummary.includes(psQuery)) return false;
      if (psFilter.ageRange && (minAge > p.ageMax || maxAge < p.ageMin)) return false;
      if (psFilter.employment && !p.employmentTypes.includes(psFilter.employment)) return false;
      if (psFilter.income && p.maxIncomePct !== 999 && p.maxIncomePct > maxIncome + 30) return false;
      if (psSelectedKws.size > 0 && !p.keywords.some(k => psSelectedKws.has(k))) return false;
      return true;
    }).map(p => {
      const kwMatch = psSelectedKws.size > 0 ? p.keywords.filter(k => psSelectedKws.has(k)).length / Math.max(psSelectedKws.size, 1) : 0.7;
      const ageMatch = psFilter.ageRange ? (minAge >= p.ageMin && maxAge <= p.ageMax ? 1 : 0.7) : 0.8;
      const score = Math.min(98, Math.round((kwMatch * 0.6 + ageMatch * 0.4) * 40 + (hasFilters ? 55 : 60 + p.id % 20)));
      return { policy: p, score };
    }).sort((a, b) => {
      if (psSortMode === "match") return b.score - a.score;
      if (psSortMode === "deadline") { const dA = a.policy.deadline ? daysUntil(a.policy.deadline) : 9999; const dB = b.policy.deadline ? daysUntil(b.policy.deadline) : 9999; return dA - dB; }
      return b.policy.id - a.policy.id;
    });
  }, [psQuery, psSelectedKws, psFilter, psSortMode, psCategoryFilter]);

  const psTotalPages = Math.max(1, Math.ceil(matchedPolicies.length / POLICY_PAGE_SIZE));
  const pagedPolicies = matchedPolicies.slice((psPage - 1) * POLICY_PAGE_SIZE, psPage * POLICY_PAGE_SIZE);

  // Reset to page 1 whenever the underlying result set changes
  useEffect(() => { setPsPage(1); }, [psQuery, psSelectedKws, psFilter, psSortMode, psCategoryFilter]);

  // Analysis simulation
  useEffect(() => {
    if (!analyzing) return;
    if (analyzeStep < 4) { const t = setTimeout(() => setAnalyzeStep(s => s + 1), 480); return () => clearTimeout(t); }
    const result = analyzeEssay(essayText);
    setAnimatedScores(null);
    setTimeout(() => { setAnimatedScores(result); setScores(result); setAnalyzing(false); setShowRadar(true); }, 80);
  }, [analyzing, analyzeStep, essayText]);

  // Track recently viewed items whenever a detail modal is opened
  useEffect(() => {
    if (!detailItem) return;
    setRecentlyViewed(prev => [detailItem, ...prev.filter(v => !(v.type === detailItem.type && v.id === detailItem.id))].slice(0, 20));
  }, [detailItem]);

  const radarData = COMPETENCY_LABELS.map(c => ({ subject: c.label, value: animatedScores?.[c.key] ?? 0, fullMark: 100 }));
  const myCharacter = scores ? getCharacter(scores) : null;

  // Handlers
  function toggleSave(type: "competition" | "policy" | "job", id: number) {
    const key = `${type}-${id}`;
    const willSave = !isSaved(type, id);
    if (type === "competition") setSavedCompetitions(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (type === "policy") setSavedPolicies(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (type === "job") setSavedJobs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setSavedAt(prev => {
      if (!willSave) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: Date.now() };
    });
  }
  function isSaved(type: "competition" | "policy" | "job", id: number) {
    if (type === "competition") return savedCompetitions.has(id);
    if (type === "policy") return savedPolicies.has(id);
    return savedJobs.has(id);
  }
  function detailSaved() { if (!detailItem) return false; return isSaved(detailItem.type, detailItem.id); }
  function goToTab(tab: Tab, query?: string) {
    setActiveTab(tab);
    if (query === undefined) return;
    if (tab === "competition") setCompQuery(query);
    if (tab === "policy") setPsQuery(query);
    if (tab === "jobs") setJobQuery(query);
  }
  function handleCompSearch() {
    if (!compQuery.trim()) return;
    setCompIsSearching(true); setCompChips([]); setCompIsLoading(true);
    setTimeout(() => { setCompChips(decomposeKeywords(compQuery, [])); setCompIsSearching(false); }, 550);
    setTimeout(() => setCompIsLoading(false), 900);
  }
  function handlePsSearch() {
    if (!psQuery.trim()) return;
    setPsIsSearching(true); setPsChips([]); setPsIsLoading(true);
    setTimeout(() => { setPsChips(decomposeKeywords(psQuery, ALL_POLICY_KWS)); setPsIsSearching(false); }, 550);
    setTimeout(() => setPsIsLoading(false), 900);
  }
  function applyPsChip(chip: string) {
    const clean = chip.replace(/^#/, "");
    const matched = ALL_POLICY_KWS.filter(k => k.toLowerCase().includes(clean.toLowerCase()));
    setPsSelectedKws(prev => { const n = new Set(prev); if (matched.length > 0) matched.forEach(m => n.add(m)); else n.add(chip); return n; });
  }
  function toggleCompFilter(f: string) { setCompFilters(p => { const n = new Set(p); n.has(f) ? n.delete(f) : n.add(f); return n; }); }
  function toggleJobFilter(f: string) { setJobQuickFilters(p => { const n = new Set(p); n.has(f) ? n.delete(f) : n.add(f); return n; }); }
  function togglePsKw(kw: string) { setPsSelectedKws(p => { const n = new Set(p); n.has(kw) ? n.delete(kw) : n.add(kw); return n; }); }

  // My page saved items
  const savedList: SavedItem[] = [
    ...[...savedCompetitions].map(id => { const c = COMPETITIONS.find(x => x.id === id); return c ? { id, type:"competition" as const, title:c.name, org:c.organizer, deadline:c.deadline } : null; }).filter(Boolean) as SavedItem[],
    ...[...savedPolicies].map(id => { const p = POLICIES.find(x => x.id === id); return p ? { id, type:"policy" as const, title:p.name, org:p.agency, deadline:p.deadline } : null; }).filter(Boolean) as SavedItem[],
    ...[...savedJobs].map(id => { const j = JOBS.find(x => x.id === id); return j ? { id, type:"job" as const, title:j.title, org:j.company, deadline:j.deadline } : null; }).filter(Boolean) as SavedItem[],
  ];
  const sortedSavedList: SavedItem[] = [...savedList].sort((a, b) => {
    if (savedSortMode === "deadline") return (a.deadline ? daysUntil(a.deadline) : 9999) - (b.deadline ? daysUntil(b.deadline) : 9999);
    if (savedSortMode === "type") return a.type.localeCompare(b.type);
    return (savedAt[`${b.type}-${b.id}`] ?? 0) - (savedAt[`${a.type}-${a.id}`] ?? 0); // recent
  });
  const recentList: SavedItem[] = recentlyViewed.map(({ type, id }) => {
    if (type === "competition") { const c = COMPETITIONS.find(x => x.id === id); return c ? { id, type, title:c.name, org:c.organizer, deadline:c.deadline } : null; }
    if (type === "policy") { const p = POLICIES.find(x => x.id === id); return p ? { id, type, title:p.name, org:p.agency, deadline:p.deadline } : null; }
    const j = JOBS.find(x => x.id === id); return j ? { id, type, title:j.title, org:j.company, deadline:j.deadline } : null;
  }).filter(Boolean) as SavedItem[];
  const MYPAGE_LIMIT = 6;

  const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id:"competition", label:"공모전",  icon:Trophy },
    { id:"competency",  label:"역량진단", icon:Target },
    { id:"jobs",        label:"채용매칭", icon:Briefcase },
    { id:"policy",      label:"정책찾기", icon:FileText },
    { id:"community",   label:"팀빌딩",  icon:Users },
    { id:"mypage",      label:"마이페이지",icon:BookOpen },
  ];

  // Policy sidebar: keywords scope to the selected category (all 4 fit); when no
  // category is picked, pool all keywords and cap the visible set with a toggle.
  const psVisibleKeywords = psCategoryFilter ? POLICY_KEYWORDS[psCategoryFilter].kws : (psKeywordShowAll ? ALL_POLICY_KWS : ALL_POLICY_KWS.slice(0, 6));
  const psHasMoreKeywords = !psCategoryFilter && ALL_POLICY_KWS.length > 6;
  const psHasQuickFilter = !!(psFilter.ageRange || psFilter.district || psFilter.employment || psFilter.income);
  const psHasAnyFilter = psHasQuickFilter || psCategoryFilter !== "" || psSelectedKws.size > 0;
  function clearAllPolicyFilters() {
    setPsSelectedKws(new Set());
    setPsFilter({ ageRange:"", district:"", employment:"", income:"" });
    setPsCategoryFilter("");
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily:"'Noto Sans KR','Plus Jakarta Sans',sans-serif" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => { setAuthView(null); setActiveTab("home"); }} className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4 text-white" /></div>
              <div className="leading-tight">
                <span className="block font-black text-foreground tracking-tight text-base" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Tadak</span>
                <span className="hidden sm:block text-[11px] text-muted-foreground">부산 청년을 위한 공모전·커리어 이벤트·청년정책 통합 탐색 서비스</span>
              </div>
            </button>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" />최근 업데이트 2시간 전</span>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{user.name.slice(0,1).toUpperCase()}</div>
                  <span className="text-xs font-medium text-foreground hidden sm:block">{user.name}님</span>
                  <button onClick={() => { authService.logout(); setUser(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">로그아웃</button>
                </div>
              ) : (
                <button onClick={() => setAuthView("login")} className="text-xs font-semibold bg-secondary text-primary px-3.5 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors">로그인</button>
              )}
            </div>
          </div>
          {!authView && (
            <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === id ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4" />{label}
                  {id === "mypage" && savedList.length > 0 && <span className="w-4 h-4 text-[10px] font-bold bg-primary text-white rounded-full flex items-center justify-center">{savedList.length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        {authView ? (
          <AuthScreen mode={authView} onSwitchMode={setAuthView} onClose={() => setAuthView(null)}
            onSuccess={u => { setUser(u); setAuthView(null); }} />
        ) : (
        <>

        {/* ══ 홈 ══════════════════════════════════════════════════════════════ */}
        {activeTab === "home" && (
          <HomePage
            competitions={COMPETITIONS} policies={POLICIES} jobs={JOBS} posts={posts}
            isSaved={isSaved} onToggleSave={toggleSave}
            onOpenDetail={(type, id) => setDetailItem({ type, id })}
            onNavigate={goToTab}
            onWritePost={() => setShowWriteModal(true)}
            canWritePost={!!myCharacter}
          />
        )}

        {/* ══ 공모전 탭 ════════════════════════════════════════════════════════ */}
        {activeTab === "competition" && (
          <div className="pt-8 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>공모전 찾기</h1>
              <p className="text-sm text-muted-foreground">관심 있는 공모전이나 분야를 검색하거나 빠른 필터로 찾아보세요</p>
            </div>
            <SearchSection value={compQuery} onChange={setCompQuery} onSearch={handleCompSearch} onKeyDown={e => e.key === "Enter" && handleCompSearch()}
              placeholder="관심 있는 공모전이나 분야를 검색해보세요" chips={compChips}
              onApplyChip={chip => { const c = chip.replace(/^#/,""); toggleCompFilter(c); }} isSearching={compIsSearching} />
            {/* Quick filter chips */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-1 min-w-max">
                {COMP_QUICK_FILTERS.map(f => {
                  const active = f === "전체" ? compFilters.size === 0 : compFilters.has(f);
                  const urgentClass = f === "마감임박" ? (active ? "bg-rose-500 text-white border-rose-500" : "bg-rose-50 text-rose-700 border-rose-200") : "";
                  const defaultClass = active ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground";
                  return (
                    <button key={f} onClick={() => f === "전체" ? setCompFilters(new Set()) : toggleCompFilter(f)}
                      className={`text-sm font-medium px-4 py-2 rounded-full border whitespace-nowrap transition-all ${f === "마감임박" ? urgentClass : defaultClass}`}>
                      {f === "마감임박" ? "🔥 " : ""}{f}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Active filter pills */}
            <AnimatePresence>
              {compFilters.size > 0 && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">적용된 필터:</span>
                  {[...compFilters].map(f => (
                    <span key={f} className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">
                      {f}<button onClick={() => toggleCompFilter(f)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <button onClick={() => setCompFilters(new Set())} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RotateCcw className="w-3 h-3" />초기화</button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Sort + count */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-semibold text-foreground">총 <span className="text-primary">{filteredCompetitions.length}개</span>의 공모전</p>
              <div className="flex bg-muted rounded-xl p-1 gap-0.5">
                {COMP_SORT_OPTIONS.map(([mode, label]) => (
                  <button key={mode} onClick={() => setCompSortMode(mode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${compSortMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                ))}
              </div>
            </div>
            {/* Cards */}
            {compIsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(COMP_PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : filteredCompetitions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pagedCompetitions.map(c => (
                    <CompetitionCard key={c.id} comp={c} saved={savedCompetitions.has(c.id)}
                      onSave={() => toggleSave("competition", c.id)} onDetail={() => setDetailItem({ type:"competition", id:c.id })} />
                  ))}
                </div>
                <Pagination page={compPage} totalPages={compTotalPages} onChange={setCompPage} />
              </>
            ) : (
              <div className="text-center py-16 space-y-4">
                <p className="text-foreground font-semibold">검색 결과가 없어요.</p>
                <p className="text-sm text-muted-foreground">다른 분야나 키워드로 다시 찾아보세요.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["창업","IT·개발","디자인"].map(k => (
                    <button key={k} onClick={() => { setCompFilters(new Set([k])); }} className="text-xs bg-secondary text-primary px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-colors">{k}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ 역량진단 탭 ══════════════════════════════════════════════════════ */}
        {activeTab === "competency" && (
          <div className="pt-8 space-y-8">
            <div>
              <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>역량 진단</h1>
              <p className="text-sm text-muted-foreground">자기소개서나 경험을 입력하면 입력 내용 기반의 간단 진단 결과를 보여드려요</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COMPETENCY_LABELS.map(c => (
                <div key={c.key} className="text-center">
                  <div className={`w-2 h-2 rounded-full ${c.color} mx-auto mb-1`} />
                  <p className="text-xs font-semibold text-foreground leading-tight">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">자기소개서 / 경험 기술서</label>
                <button onClick={() => setEssayText(SAMPLE_ESSAY)} className="text-xs text-primary hover:underline">예시 불러오기</button>
              </div>
              <textarea value={essayText} onChange={e => setEssayText(e.target.value)} placeholder="자기소개서, 경험 기술서, 또는 간단한 자기평가 내용을 입력해주세요."
                className="w-full min-h-44 bg-muted border border-border rounded-2xl px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none leading-relaxed transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{essayText.length}자</span>
                <button disabled={essayText.trim().length < 30 || analyzing} onClick={() => { setAnalyzeStep(0); setScores(null); setAnimatedScores(null); setShowRadar(false); setAnalyzing(true); }}
                  className={`flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl transition-all ${essayText.trim().length >= 30 && !analyzing ? "bg-primary text-primary-foreground hover:bg-indigo-700 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <Sparkles className="w-4 h-4" />{analyzing ? "분석 중..." : "간단 진단 시작"}
                </button>
              </div>
            </div>
            {analyzing && (
              <div className="bg-muted rounded-2xl p-5 space-y-3">
                {["텍스트 전처리 및 키워드 추출","다차원 역량 마이닝","5개 지표 점수 산출","레이더 차트 생성"].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm transition-opacity ${i <= analyzeStep ? "opacity-100" : "opacity-30"}`}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${i < analyzeStep ? "bg-emerald-500" : i === analyzeStep ? "bg-primary animate-pulse" : "bg-border"}`} />
                    <span className={i <= analyzeStep ? "text-foreground" : "text-muted-foreground"}>{step}</span>
                  </div>
                ))}
              </div>
            )}
            {animatedScores && !analyzing && (
              <div className="space-y-5">
                <AnimatePresence>
                  {showRadar && <DualRadarPanel scores={animatedScores} onClose={() => setShowRadar(false)} />}
                </AnimatePresence>
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-semibold text-foreground">세부 역량 점수</p>
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">데모 결과 · 입력 내용 기반 참고용</span>
                  </div>
                  {COMPETENCY_LABELS.map(c => {
                    const val = animatedScores[c.key];
                    const grade = val >= 85 ? "상" : val >= 70 ? "중" : "하";
                    const gColor = val >= 85 ? "text-emerald-600" : val >= 70 ? "text-amber-600" : "text-rose-500";
                    return (
                      <div key={c.key}>
                        <div className="flex items-center justify-between mb-1">
                          <div><span className="text-sm text-foreground font-medium">{c.label}</span><span className="text-xs text-muted-foreground ml-1.5">{c.sub}</span></div>
                          <div className="flex items-center gap-2"><span className={`text-xs font-bold ${gColor}`}>{grade}</span><span className="text-sm font-bold text-primary">{val}점</span></div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width:`${val}%` }} /></div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{VERTEX_TIPS[c.key]}</p>
                      </div>
                    );
                  })}
                </div>
                {myCharacter && (
                  <div className={`rounded-2xl border p-5 ${myCharacter.bgClass}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">{myCharacter.icon}</div>
                      <div>
                        <span className={`text-xs font-bold ${myCharacter.colorClass}`}>{myCharacter.type}</span>
                        <p className={`font-bold mt-0.5 ${myCharacter.colorClass}`}>{myCharacter.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">역량 분석 기반 부여된 캐릭터 타이틀</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-secondary border border-primary/20 rounded-2xl p-5 flex gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">채용매칭에서 활용하기</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">역량 진단 결과를 바탕으로 나의 강점과 관심 직무에 맞는 공고를 채용매칭에서 추천받을 수 있어요.</p>
                    <button onClick={() => setActiveTab("jobs")} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">채용매칭 보러가기 <ArrowRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ 채용매칭 탭 ══════════════════════════════════════════════════════ */}
        {activeTab === "jobs" && (
          <div className="pt-8 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>채용매칭</h1>
              <p className="text-sm text-muted-foreground">직무, 지역, 경력, 고용 형태 기준 기본 조건 추천 서비스예요</p>
            </div>
            {/* Competency nudge */}
            {!scores ? (
              <div className="bg-secondary border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><Target className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">역량진단을 완료하면 관심 직무를 정리하는 데 도움이 돼요.</p>
                  <button onClick={() => setActiveTab("competency")} className="mt-1 text-xs font-semibold text-primary hover:underline flex items-center gap-1">역량진단 하러 가기 <ArrowRight className="w-3 h-3" /></button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary border border-primary/20 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">내 강점 역량:</span>
                {COMPETENCY_LABELS.slice().sort((a,b) => scores[b.key] - scores[a.key]).slice(0,3).map(c => (
                  <span key={c.key} className="inline-flex items-center gap-1 text-xs bg-card border border-border px-2.5 py-1 rounded-lg text-foreground font-medium">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.color}`} />{c.label} {scores[c.key]}점
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">참고 정보로 활용됩니다</span>
              </div>
            )}
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={jobQuery} onChange={e => setJobQuery(e.target.value)} placeholder="희망 직무 또는 기술 키워드를 검색해보세요"
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {JOB_QUICK_FILTERS.map(f => {
                const active = f === "전체" ? jobQuickFilters.size === 0 : jobQuickFilters.has(f);
                return (
                  <button key={f} onClick={() => f === "전체" ? setJobQuickFilters(new Set()) : toggleJobFilter(f)}
                    className={`text-sm font-medium px-3.5 py-2 rounded-full border whitespace-nowrap transition-all ${active ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
                    {f}
                  </button>
                );
              })}
              <div className="relative ml-auto">
                <select value={jobIndustryFilter} onChange={e => setJobIndustryFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-full pl-3.5 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">직무 분야 전체</option>
                  {JOB_INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {/* Sort + count */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-semibold text-foreground">{scores ? "내 조건과 맞는 공고" : "기본 조건 추천 공고"} <span className="text-primary">{filteredJobs.length}개</span></p>
              <div className="flex bg-muted rounded-xl p-1 gap-0.5">
                {(scores ? [["match","매칭순"] as [string, string], ...JOB_SORT_OPTIONS] : JOB_SORT_OPTIONS).map(([mode, label]) => (
                  <button key={mode} onClick={() => setJobSortMode(mode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${jobSortMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pagedJobs.map(j => (
                <JobCard key={j.id} job={j} saved={savedJobs.has(j.id)} onSave={() => toggleSave("job", j.id)}
                  onDetail={() => setDetailItem({ type:"job", id:j.id })} searchQuery={jobQuery} scores={scores} />
              ))}
            </div>
            <Pagination page={jobPage} totalPages={jobTotalPages} onChange={setJobPage} />
            {/* Roadmap notice */}
            <div className="bg-muted border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Beta</span>
                <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">로드맵</span>
                <p className="text-sm font-semibold text-foreground">AI 정밀 역량 매칭은 준비 중입니다</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                지금은 채용 공고에 미리 등록된 요구 역량 값과 역량진단 결과를 단순 비교해 "매칭순"으로 정렬하는 기본 매칭만 제공돼요. 향후 기업 공고 상세 본문을 AI로 직접 분석해 요구 역량을 추출하고, 사용자의 5가지 핵심 취업 역량(전공역량·글로벌소통·문제해결력·도전정신·조직적응력)과 더 정교하게 비교할 예정입니다.
              </p>
              <ol className="space-y-1.5">
                {["기업 공고 상세 본문 수집", "AI 기반 요구 역량 추출", "기업별 5축 역량 프로필 생성", "사용자 역량 프로필과 비교 (기본 버전 제공 중)", "맞춤 공고 우선 추천 (기본 버전 제공 중)"].map((step, i) => (
                  <li key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-border text-[10px] font-bold text-foreground flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" />AI 기반 요구 역량 추출은 추후 업데이트 예정</span>
            </div>
          </div>
        )}

        {/* ══ 정책찾기 탭 ══════════════════════════════════════════════════════ */}
        {activeTab === "policy" && (
          <div className="pt-8 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>정책 찾기</h1>
              <p className="text-sm text-muted-foreground">내 조건에 맞는 청년 지원 정책을 검색하거나 필터로 찾아보세요</p>
            </div>
            <SearchSection value={psQuery} onChange={setPsQuery} onSearch={handlePsSearch} onKeyDown={e => e.key === "Enter" && handlePsSearch()}
              placeholder="어떤 지원 정책을 찾고 있나요?" chips={psChips} onApplyChip={applyPsChip} isSearching={psIsSearching} />
            {/* Selected filter chips */}
            <AnimatePresence>
              {psHasAnyFilter && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="flex flex-wrap gap-2 items-center overflow-hidden">
                  <span className="text-xs text-muted-foreground">선택한 조건:</span>
                  {psCategoryFilter && <span className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{psCategoryFilter}<button onClick={() => setPsCategoryFilter("")}><X className="w-3 h-3" /></button></span>}
                  {[...psSelectedKws].map(kw => <span key={kw} className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{kw}<button onClick={() => togglePsKw(kw)}><X className="w-3 h-3" /></button></span>)}
                  {psFilter.ageRange && <span className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{psFilter.ageRange}<button onClick={() => setPsFilter(f => ({ ...f, ageRange:"" }))}><X className="w-3 h-3" /></button></span>}
                  {psFilter.district && <span className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{psFilter.district}<button onClick={() => setPsFilter(f => ({ ...f, district:"" }))}><X className="w-3 h-3" /></button></span>}
                  {psFilter.employment && <span className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{psFilter.employment}<button onClick={() => setPsFilter(f => ({ ...f, employment:"" }))}><X className="w-3 h-3" /></button></span>}
                  {psFilter.income && <span className="inline-flex items-center gap-1 text-xs bg-secondary text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">{psFilter.income}<button onClick={() => setPsFilter(f => ({ ...f, income:"" }))}><X className="w-3 h-3" /></button></span>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
              {/* ── Sidebar: category + keywords ── */}
              <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">카테고리</p>
                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                    {POLICY_CATEGORY_LIST.map(({ key, label, icon: Icon }) => {
                      const active = psCategoryFilter === key;
                      const count = key === "" ? POLICIES.length : POLICIES.filter(p => p.category === key).length;
                      return (
                        <button key={label} onClick={() => setPsCategoryFilter(key)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm whitespace-nowrap transition-colors flex-shrink-0 lg:w-full ${active ? "bg-secondary border-primary text-primary font-semibold" : "bg-card border-border text-foreground hover:border-primary/30"}`}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{label}</span>
                          <span className={active ? "text-xs text-primary" : "text-xs text-muted-foreground"}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">추천 키워드</p>
                  <div className="flex flex-wrap gap-1.5">
                    {psVisibleKeywords.map(kw => {
                      const active = psSelectedKws.has(kw);
                      return <button key={kw} onClick={() => togglePsKw(kw)} className={`text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>{kw}</button>;
                    })}
                    {psHasMoreKeywords && (
                      <button onClick={() => setPsKeywordShowAll(v => !v)} className="text-xs font-semibold text-primary hover:underline px-1.5 py-1.5">{psKeywordShowAll ? "접기" : "더보기"}</button>
                    )}
                  </div>
                </div>
              </aside>

              {/* ── Main: quick filter + results ── */}
              <div className="space-y-5 min-w-0">
                {/* 3-second filter */}
                <div className="bg-muted rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> 3초 조건 선택</p>
                    {psHasQuickFilter && (
                      <button onClick={() => setPsFilter({ ageRange:"",district:"",employment:"",income:"" })} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RotateCcw className="w-3 h-3" />선택 조건 초기화</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">연령 구간</p>
                      <div className="flex gap-1 flex-wrap">{AGE_RANGES.map(r => <button key={r} onClick={() => setPsFilter(f => ({ ...f, ageRange:f.ageRange===r?"":r }))} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${psFilter.ageRange===r?"bg-secondary border-primary text-primary":"bg-card border-border text-foreground hover:border-primary/40"}`}>{r}</button>)}</div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">거주지</p>
                      <div className="relative">
                        <select value={psFilter.district} onChange={e => setPsFilter(f => ({ ...f, district:e.target.value }))} className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">전체</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">현재 상태</p>
                      <div className="flex gap-1 flex-wrap">{EMPLOYMENT_TYPES.map(e => <button key={e} onClick={() => setPsFilter(f => ({ ...f, employment:f.employment===e?"":e }))} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${psFilter.employment===e?"bg-secondary border-primary text-primary":"bg-card border-border text-foreground hover:border-primary/40"}`}>{e}</button>)}</div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">소득 구간</p>
                      <div className="flex gap-1 flex-wrap">{INCOME_LEVELS.map(l => <button key={l.label} onClick={() => setPsFilter(f => ({ ...f, income:f.income===l.label?"":l.label }))} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${psFilter.income===l.label?"bg-secondary border-primary text-primary":"bg-card border-border text-foreground hover:border-primary/40"}`}>{l.label}</button>)}</div>
                    </div>
                  </div>
                </div>

                {/* Sort + count */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm font-semibold text-foreground">추천 정책 <span className="text-primary">{matchedPolicies.length}개</span></p>
                  <div className="flex bg-muted rounded-xl p-1 gap-0.5">
                    {POLICY_SORT_OPTIONS.map(([mode, label]) => (
                      <button key={mode} onClick={() => setPsSortMode(mode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${psSortMode===mode?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
                    ))}
                  </div>
                </div>

                {psIsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(POLICY_PAGE_SIZE)].map((_,i) => <SkeletonCard key={i} />)}</div>
                ) : matchedPolicies.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pagedPolicies.map(({ policy }) => (
                        <PolicyCard key={policy.id} policy={policy} saved={savedPolicies.has(policy.id)} onSave={() => toggleSave("policy", policy.id)}
                          onDetail={() => setDetailItem({ type:"policy", id:policy.id })} filter={psFilter} onConditionEdit={() => setActiveTab("competency")} />
                      ))}
                    </div>
                    <Pagination page={psPage} totalPages={psTotalPages} onChange={setPsPage} />
                  </>
                ) : (
                  <div className="text-center py-16 space-y-3">
                    <p className="text-foreground font-semibold">조건에 맞는 정책이 없어요.</p>
                    <p className="text-sm text-muted-foreground">필터를 조정하거나 다른 키워드로 다시 찾아보세요.</p>
                    <button onClick={clearAllPolicyFilters} className="text-xs font-semibold text-primary hover:underline">필터 전체 초기화</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ 팀빌딩 탭 ════════════════════════════════════════════════════════ */}
        {activeTab === "community" && (
          <div className="pt-8 space-y-8">
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>팀빌딩 커뮤니티</h1>
                  <p className="text-sm text-muted-foreground">역량 타이틀 기반 익명 프로필로 공모전 팀원을 모집해보세요</p>
                </div>
                <button onClick={() => setShowWriteModal(true)} disabled={!myCharacter} title={myCharacter ? undefined : "역량진단을 먼저 완료해주세요"}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  <UserPlus className="w-4 h-4" /> 팀원 모집글 쓰기
                </button>
              </div>
            </div>
            {myCharacter ? (
              <div className={`rounded-2xl border p-5 ${myCharacter.bgClass}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">{myCharacter.icon}</div>
                  <div>
                    <span className={`text-xs font-bold ${myCharacter.colorClass}`}>{myCharacter.type}</span>
                    <p className={`font-bold mt-0.5 ${myCharacter.colorClass}`}>{myCharacter.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">역량 분석 기반 자동 부여된 캐릭터</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-semibold text-foreground text-sm">역량 진단 후 나만의 캐릭터가 부여됩니다</p>
                  <p className="text-xs text-muted-foreground mt-0.5">예: [전공형] 익명의 갈매기, [소통형] 익명의 동백꽃</p>
                  <button onClick={() => setActiveTab("competency")} className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1">역량진단 하러 가기 <ArrowRight className="w-3 h-3" /></button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">팀원 모집 게시판 <span className="text-primary">{posts.length}</span></p>
              {posts.map(post => {
                const char = CHARACTER_MAP[getDominantKey(post.competencies)];
                const dl = daysUntil(post.deadline);
                const isClosed = dl < 0;
                return (
                  <div key={post.id} className={`bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all space-y-3 ${isClosed ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl flex-shrink-0 ${char.bgClass}`}>{post.authorIcon}</div>
                        <div>
                          <div className="flex items-center gap-2"><span className={`text-xs font-bold ${post.authorColor}`}>{post.authorType}</span><span className="text-sm font-semibold text-foreground">{post.authorName}</span></div>
                          <p className="text-xs text-muted-foreground">{post.createdAt} 작성</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isClosed ? "bg-muted text-muted-foreground border-border" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {isClosed ? "모집마감" : "모집중"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-secondary text-primary">{post.recruitField}</span>
                      <span className="text-muted-foreground">{post.projectName}</span>
                    </div>
                    <div><h3 className="font-bold text-foreground mb-1">{post.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground self-center">필요한 역할:</span>
                      {post.lookingFor.map(type => { const e = Object.values(CHARACTER_MAP).find(c => c.type === type); return <span key={type} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${e?.bgClass || "bg-muted border-border text-muted-foreground"}`}>{e?.icon} {type}</span>; })}
                      {post.skills.map(s => <span key={s} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{s}</span>)}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" />현재 {post.applicants}명 / 모집 {post.recruitCount}명</span>
                      <button onClick={() => setApplyingPost(applyingPost===post.id?null:post.id)} disabled={isClosed}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${applyingPost===post.id?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-primary text-primary-foreground hover:bg-indigo-700"}`}>
                        {applyingPost===post.id?<><CheckCircle className="w-3.5 h-3.5" />지원 완료!</>:<><Send className="w-3.5 h-3.5" />팀 합류 신청</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <WritePostModal open={showWriteModal} onClose={() => setShowWriteModal(false)}
              characterOptions={Object.values(CHARACTER_MAP).map(c => ({ type: c.type, icon: c.icon, bgClass: c.bgClass }))}
              recruitFieldOptions={TEAM_RECRUIT_FIELDS}
              onSubmit={draft => {
                if (!myCharacter) return;
                setPosts(prev => [{
                  id: prev.length ? Math.max(...prev.map(p => p.id)) + 1 : 1,
                  authorType: myCharacter.type, authorName: myCharacter.name, authorColor: myCharacter.colorClass, authorIcon: myCharacter.icon,
                  competencies: scores!, title: draft.title, recruitField: draft.recruitField, projectName: draft.projectName, content: draft.content,
                  lookingFor: draft.lookingFor, skills: draft.skills, recruitCount: draft.recruitCount, contact: draft.contact,
                  createdAt: new Date().toISOString().slice(0, 10), deadline: draft.deadline, applicants: 0,
                }, ...prev]);
                setShowWriteModal(false);
                toast.success("모집글이 등록되었습니다.");
              }} />
          </div>
        )}

        {/* ══ 마이페이지 탭 ═════════════════════════════════════════════════════ */}
        {activeTab === "mypage" && (
          <div className="pt-8 space-y-7">
            <div>
              <h1 className="text-2xl font-black text-foreground mb-1" style={{ letterSpacing:"-0.02em" }}>마이페이지</h1>
              <p className="text-sm text-muted-foreground">관심 등록한 항목과 응모·지원 내역을 한눈에 관리하세요</p>
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {([["saved","관심목록", savedList.length], ["applied","응모·지원", appliedItems.length], ["recent","최근 본 항목", recentList.length]] as [MypageTab, string, number|string][]).map(([tab, label, count]) => (
                <button key={tab} onClick={() => setMypageTab(tab)}
                  className={`rounded-2xl border p-4 text-center transition-all ${mypageTab===tab?"border-primary bg-secondary":"border-border bg-card hover:border-primary/40"}`}>
                  <p className={`text-2xl font-black ${mypageTab===tab?"text-primary":"text-foreground"}`}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </button>
              ))}
            </div>
            {/* Tabs */}
            <div className="flex bg-muted rounded-xl p-1 gap-0.5">
              {(["saved","applied","recent"] as MypageTab[]).map(t => (
                <button key={t} onClick={() => setMypageTab(t)} className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${mypageTab===t?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
                  {t==="saved"?"관심목록":t==="applied"?"응모·지원 내역":"최근 본 항목"}
                </button>
              ))}
            </div>

            {/* Saved */}
            {mypageTab === "saved" && (
              <div className="space-y-4">
                {savedList.length === 0 ? (
                  <div className="bg-muted rounded-2xl p-10 text-center space-y-4">
                    <p className="font-semibold text-foreground">아직 관심 등록한 항목이 없어요.</p>
                    <p className="text-sm text-muted-foreground">나에게 맞는 정책과 공모전을 찾아보세요.</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button onClick={() => setActiveTab("policy")} className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">정책 찾기</button>
                      <button onClick={() => setActiveTab("competition")} className="text-sm font-semibold bg-secondary text-primary px-5 py-2.5 rounded-xl hover:bg-secondary/70 transition-colors">공모전 둘러보기</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {showAllSaved && (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">정렬:</span>
                        {([["recent","최근 저장순"],["deadline","마감임박순"],["type","유형별"]] as [typeof savedSortMode, string][]).map(([mode, label]) => (
                          <button key={mode} onClick={() => setSavedSortMode(mode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${savedSortMode===mode?"bg-secondary text-primary":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
                        ))}
                      </div>
                    )}
                    <div className="space-y-3">
                      {(showAllSaved ? sortedSavedList : savedList.slice(0, MYPAGE_LIMIT)).map(item => {
                        const meta = TYPE_META[item.type];
                        const Icon = meta.icon;
                        return (
                          <div key={`${item.type}-${item.id}`} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4 hover:shadow-sm transition-all">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.badgeClass}`}><Icon className="w-4 h-4" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${meta.badgeClass}`}>{meta.label}</span>
                                <DayBadge deadline={item.deadline} />
                              </div>
                              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.org}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <button onClick={() => setDetailItem({ type:item.type, id:item.id })} className="text-xs text-primary hover:underline">상세보기</button>
                              <button onClick={() => toggleSave(item.type, item.id)} className="text-xs text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1"><Heart className="w-3 h-3 fill-current text-rose-500" />해제</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {savedList.length > MYPAGE_LIMIT && !showAllSaved && (
                      <button onClick={() => setShowAllSaved(true)} className="w-full py-3 text-sm font-semibold text-primary border border-primary/30 rounded-2xl hover:bg-secondary transition-colors">
                        더보기 ({savedList.length - MYPAGE_LIMIT}개 더)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Applied */}
            {mypageTab === "applied" && (
              <div className="space-y-3">
                {appliedItems.length === 0 ? (
                  <div className="bg-muted rounded-2xl p-10 text-center">
                    <p className="font-semibold text-foreground mb-2">아직 응모하거나 지원한 항목이 없어요.</p>
                    <p className="text-sm text-muted-foreground">관심 있는 공고를 저장하고 지원해보세요.</p>
                  </div>
                ) : (
                  appliedItems.slice(0, showAllSaved ? appliedItems.length : MYPAGE_LIMIT).map(item => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.icon;
                    return (
                      <div key={`${item.type}-${item.id}`} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.badgeClass}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${meta.badgeClass}`}>{meta.label}</span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">{item.status}</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.org}</p>
                        </div>
                        <button className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0">공식 사이트 <ExternalLink className="w-3 h-3" /></button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Recent */}
            {mypageTab === "recent" && (
              <div className="space-y-3">
                {recentList.length === 0 ? (
                  <div className="bg-muted rounded-2xl p-10 text-center">
                    <p className="font-semibold text-foreground mb-2">아직 최근 본 항목이 없어요.</p>
                    <p className="text-sm text-muted-foreground">공모전, 정책, 채용 공고를 둘러보면 여기에 기록돼요.</p>
                  </div>
                ) : (
                  recentList.map(item => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.icon;
                    return (
                      <div key={`${item.type}-${item.id}`} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4 hover:shadow-sm transition-all">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.badgeClass}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${meta.badgeClass}`}>{meta.label}</span>
                            <DayBadge deadline={item.deadline} />
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.org}</p>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => setDetailItem({ type:item.type, id:item.id })} className="text-xs text-primary hover:underline">상세보기</button>
                          <button onClick={() => setRecentlyViewed(prev => prev.filter(v => !(v.type === item.type && v.id === item.id)))} className="text-xs text-muted-foreground hover:text-foreground transition-colors">기록삭제</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
        </>
        )}
      </main>

      {/* Detail Modal */}
      <DetailModal item={detailItem} onClose={() => setDetailItem(null)} saved={detailSaved()} onSave={() => detailItem && toggleSave(detailItem.type, detailItem.id)}
        onSwitchTab={t => { setDetailItem(null); setActiveTab(t); }} policyFilter={psFilter} onOpenPolicy={id => setDetailItem({ type: "policy", id })} scores={scores} />
      <Toaster position="top-center" />
    </div>
  );
}
