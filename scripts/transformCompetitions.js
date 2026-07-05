import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.resolve(__dirname, "../src/data/raw/공모전(위비티).json");
const OUT_PATH = path.resolve(__dirname, "../src/data/processed/competitions.ts");

// today's date is passed in explicitly since d_day is "days remaining from crawl time",
// not an absolute date. Re-run with a fresh crawl + current date to keep deadlines accurate.
const TODAY = process.env.TRANSFORM_TODAY ? new Date(process.env.TRANSFORM_TODAY) : new Date();

const FIELD_CATEGORY_MAP = {
  "기획/아이디어": "기획·아이디어",
  "네이밍/슬로건": "기획·아이디어",
  "웹/모바일/IT": "IT·개발",
  "게임/소프트웨어": "IT·개발",
  "과학/공학": "IT·개발",
  "디자인/캐릭터/웹툰": "디자인",
  "영상/UCC/사진": "영상·콘텐츠",
  "예체능/미술/음악": "영상·콘텐츠",
  "문학/글/시나리오": "영상·콘텐츠",
  "논문/리포트": "영상·콘텐츠",
  "광고/마케팅": "마케팅·홍보",
  "취업/창업": "창업·취업",
  "봉사활동": "사회공헌",
  "대외활동/서포터즈": "사회공헌",
};

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mapCategories(fields) {
  const mapped = [];
  for (const f of fields) {
    const c = FIELD_CATEGORY_MAP[f] || "기타";
    if (!mapped.includes(c)) mapped.push(c);
  }
  return mapped.slice(0, 3);
}

function transform(raw, index) {
  const deadline = addDays(TODAY, raw.d_day);
  // raw has no submission-open date; approximate a 30-day window ending at the deadline.
  const startDate = addDays(deadline, -30);
  const isBusan = raw.title.includes("부산") || raw.organizer.includes("부산");

  return {
    id: index + 1,
    name: raw.title,
    organizer: raw.organizer,
    url: raw.url,
    categories: mapCategories(raw.fields),
    description: raw.badges.length > 0 ? `${raw.badges.join(", ")} 공모전 · 조회수 ${raw.views.toLocaleString()}회` : `조회수 ${raw.views.toLocaleString()}회`,
    prize: "공식 페이지에서 상금·혜택을 확인하세요.",
    startDate: toDateString(startDate),
    deadline: toDateString(deadline),
    isBusan,
    eligibility: "자세한 지원자격은 공식 페이지에서 확인해주세요.",
  };
}

const raw = JSON.parse(await readFile(RAW_PATH, "utf-8"));
const processed = raw.map(transform);

const header = 'import type { Competition } from "../../types/competition";\n\nexport const COMPETITIONS: Competition[] = ';
const body = JSON.stringify(processed, null, 2);
await writeFile(OUT_PATH, `${header}${body};\n`, "utf-8");
console.log(`Wrote ${processed.length} competitions to ${OUT_PATH}`);
