import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.resolve(__dirname, "../src/data/raw/부산광역시_청년지원정책 현황_20250731.json");
const OUT_PATH = path.resolve(__dirname, "../src/data/processed/policies.ts");

const CATEGORY_MAP = {
  "교육": "교육",
  "주거": "주거",
  "복지문화": "복지·문화",
  "일자리": "일자리",
  "참여권리": "참여·권리",
};

const CATEGORY_KEYWORDS = {
  "교육": ["#지역인재", "#등록금지원", "#장학금", "#역량개발"],
  "주거": ["#월세지원", "#보증금대출", "#공공임대", "#주거환경"],
  "복지·문화": ["#문화예술", "#여가활동", "#청년공간", "#생활지원"],
  "일자리": ["#취업연계", "#창업지원", "#인턴십", "#구직수당"],
  "참여·권리": ["#청년참여", "#권익보호", "#네트워킹", "#정책제안"],
};

const KEYWORD_TRIGGERS = {
  "#지역인재": ["지역인재", "지산학"],
  "#등록금지원": ["등록금"],
  "#장학금": ["장학"],
  "#역량개발": ["역량", "훈련", "아카데미"],
  "#월세지원": ["월세", "임차료"],
  "#보증금대출": ["보증금", "전세"],
  "#공공임대": ["임대주택", "매입임대"],
  "#주거환경": ["주거", "주택"],
  "#문화예술": ["문화", "예술", "공연"],
  "#여가활동": ["여가", "체험", "축제"],
  "#청년공간": ["청년공간", "청년센터", "플랫폼"],
  "#생활지원": ["생활", "바우처", "건강", "복지"],
  "#취업연계": ["취업", "채용"],
  "#창업지원": ["창업"],
  "#인턴십": ["인턴"],
  "#구직수당": ["구직", "수당"],
  "#청년참여": ["참여", "서포터즈", "위원회"],
  "#권익보호": ["권익", "보호", "상담"],
  "#네트워킹": ["네트워킹", "교류", "커뮤니티"],
  "#정책제안": ["정책제안", "공론"],
};

function toNumericId(rawId) {
  const n = Number(rawId.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mapEmploymentTypes(raw) {
  const types = [];
  if (raw.studentStatus !== "비학생") types.push("대학생(휴학생)");
  if (raw.employmentStatus === "무관" || raw.employmentStatus === "취업준비") types.push("취업준비생");
  if (raw.employmentStatus === "무관" || raw.employmentStatus === "취업청년") types.push("재직자");
  if (raw.employmentStatus === "무관" || raw.employmentStatus === "예비창업청년") types.push("자영업자");
  return types;
}

function mapMaxIncomePct(raw) {
  if (raw.lowIncomeOnly || raw.vulnerableGroupType === "저소득") return 100;
  return 999;
}

function deriveKeywords(category, title, summary) {
  const text = `${title} ${summary}`;
  const candidates = CATEGORY_KEYWORDS[category];
  const matched = candidates.filter((kw) => (KEYWORD_TRIGGERS[kw] || []).some((t) => text.includes(t)));
  return matched.length > 0 ? matched : [candidates[0]];
}

function formatAmount(budgetThousandKRW) {
  if (budgetThousandKRW == null) return "사업 예산 규모 미공개";
  const manwon = Math.round(budgetThousandKRW / 10);
  return `사업 예산 약 ${manwon.toLocaleString()}만원 규모`;
}

function buildTargetSummary(raw, ageMin, ageMax) {
  const parts = [];
  parts.push(raw.ageMin == null && raw.ageMax == null ? "연령 제한 없음" : `만 ${ageMin}~${ageMax}세`);
  if (raw.studentStatus !== "무관") parts.push(raw.studentStatus);
  if (raw.employmentStatus !== "무관") parts.push(raw.employmentStatus);
  if (raw.lowIncomeOnly) parts.push("저소득층");
  if (raw.vulnerableGroupType) parts.push(`${raw.vulnerableGroupType} 우선`);
  return parts.join(", ");
}

function transform(raw) {
  const category = CATEGORY_MAP[raw.category];
  const ageMin = raw.ageMin ?? 15;
  const ageMax = raw.ageMax ?? 69;
  const result = {
    id: toNumericId(raw.id),
    name: raw.title,
    keywords: deriveKeywords(category, raw.title, raw.summary),
    category,
    agency: "부산광역시",
    description: raw.summary,
    targetSummary: buildTargetSummary(raw, ageMin, ageMax),
    ageMin,
    ageMax,
    employmentTypes: mapEmploymentTypes(raw),
    maxIncomePct: mapMaxIncomePct(raw),
    amount: formatAmount(raw.budgetThousandKRW),
    deadline: null,
  };
  if (raw.vulnerableGroupType) result.tip = `${raw.vulnerableGroupType} 대상 우선 지원 정책입니다.`;
  return result;
}

const raw = JSON.parse(await readFile(RAW_PATH, "utf-8"));
const processed = raw.map(transform);

const header = 'import type { BusanPolicy } from "../../types/policy";\n\nexport const POLICIES: BusanPolicy[] = ';
const body = JSON.stringify(processed, null, 2);
await writeFile(OUT_PATH, `${header}${body};\n`, "utf-8");
console.log(`Wrote ${processed.length} policies to ${OUT_PATH}`);
