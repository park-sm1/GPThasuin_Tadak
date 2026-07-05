import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.resolve(__dirname, "../src/data/raw/사람인in[IT 직무].json");
const OUT_PATH = path.resolve(__dirname, "../src/data/processed/jobs.ts");

// deadlineLabel is relative to crawl time ("D-4", "~08.14(금)") — re-run with a fresh
// crawl + current date (TRANSFORM_TODAY=YYYY-MM-DD) to keep deadlines accurate.
const TODAY = process.env.TRANSFORM_TODAY ? new Date(process.env.TRANSFORM_TODAY) : new Date();

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDeadline(label) {
  if (!label) return null;
  if (label.includes("채용시") || label.includes("상시채용")) return null;
  if (label.includes("내일마감")) return toDateString(addDays(TODAY, 1));

  const dDay = label.match(/^D-(\d+)$/);
  if (dDay) return toDateString(addDays(TODAY, Number(dDay[1])));

  const md = label.match(/(\d{1,2})\.(\d{1,2})/);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    let candidate = new Date(TODAY.getFullYear(), month - 1, day);
    if (candidate < TODAY) candidate = new Date(TODAY.getFullYear() + 1, month - 1, day);
    return toDateString(candidate);
  }
  return null;
}

function buildTags(career) {
  const tags = [...career.employmentType, career.careerLabel].filter(Boolean);
  return [...new Set(tags)].slice(0, 4);
}

function buildDescription(raw) {
  return `${raw.career.raw} · 학력 ${raw.education}. 자세한 내용은 원문 공고에서 확인하세요.`;
}

function transform(raw, index) {
  return {
    id: index + 1,
    company: raw.companyName,
    title: raw.title,
    url: raw.url,
    industry: raw.sectorTags[0] || "IT",
    salary: "채용 공고 원문에서 확인",
    location: raw.location,
    deadline: parseDeadline(raw.deadlineLabel),
    tags: buildTags(raw.career),
    description: buildDescription(raw),
    requiredCompetency: raw.requiredCompetency,
  };
}

const raw = JSON.parse(await readFile(RAW_PATH, "utf-8"));
const processed = raw.map(transform);

const header = 'import type { Job } from "../../types/job";\n\nexport const JOBS: Job[] = ';
const body = JSON.stringify(processed, null, 2);
await writeFile(OUT_PATH, `${header}${body};\n`, "utf-8");
console.log(`Wrote ${processed.length} jobs to ${OUT_PATH}`);
