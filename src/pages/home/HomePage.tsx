import { useState } from "react";
import { Search, ChevronRight, Heart, Users, UserPlus } from "lucide-react";

// Local, minimal mirrors of the shapes used from App.tsx — HomePage only reads these
// fields, so it doesn't need (or import) the full domain types.
interface Competition { id: number; name: string; organizer: string; categories: string[]; deadline: string; isBusan: boolean }
interface BusanPolicy { id: number; name: string; keywords: string[]; category: string; agency: string; amount: string; deadline: string | null; maxIncomePct: number; employmentTypes: string[] }
interface Job { id: number; company: string; title: string; industry: string; location: string; deadline: string | null; tags: string[] }
interface CommunityPost { id: number; title: string; recruitField: string; projectName: string; lookingFor: string[]; applicants: number; recruitCount: number; createdAt: string; deadline: string }

type ItemType = "competition" | "policy" | "job";
type Tab = "home" | "competition" | "competency" | "jobs" | "policy" | "community" | "mypage";

// Mirrors the category chip colors from POLICY_KEYWORDS in App.tsx so the home
// preview badge matches the real policy category color instead of one hardcoded hue.
const POLICY_CATEGORY_CHIP: Record<string, string> = {
  "교육": "bg-violet-50 text-violet-700",
  "주거": "bg-emerald-50 text-emerald-700",
  "복지·문화": "bg-rose-50 text-rose-700",
  "일자리": "bg-sky-50 text-sky-700",
  "참여·권리": "bg-amber-50 text-amber-700",
};

function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function dDayLabel(deadline: string | null): string {
  if (!deadline) return "상시";
  const d = daysUntil(deadline);
  if (d < 0) return "마감";
  if (d === 0) return "오늘마감";
  return `D-${d}`;
}

const KEYWORD_CHIPS: { label: string; tab: Tab; query: string }[] = [
  { label: "청년월세지원", tab: "policy", query: "월세" },
  { label: "디자인 공모전", tab: "competition", query: "디자인" },
  { label: "부산 IT 채용", tab: "jobs", query: "부산" },
  { label: "창업 지원", tab: "policy", query: "창업" },
  { label: "신입 개발자", tab: "jobs", query: "개발" },
];

function getHomePolicyReasons(policy: BusanPolicy): string[] {
  const reasons: string[] = [];
  if (policy.keywords[0]) reasons.push(`${policy.keywords[0].replace("#", "")} 키워드와 관련 있어요`);
  reasons.push(policy.maxIncomePct === 999 ? "소득 조건과 무관하게 신청할 수 있어요" : `중위소득 ${policy.maxIncomePct}% 이하 조건에 해당해요`);
  if (policy.employmentTypes.length < 4 && policy.employmentTypes[0]) reasons.push(`${policy.employmentTypes[0]} 등과 관련 있어요`);
  else reasons.push("부산 거주 청년이라면 신청할 수 있어요");
  return reasons.slice(0, 2);
}

function getHomeJobReasons(job: Job): string[] {
  const reasons: string[] = [];
  if (job.location.includes("부산")) reasons.push("부산 지역 공고예요");
  if (job.tags.includes("신입") || job.tags.includes("경력무관")) reasons.push("신입 지원 가능해요");
  if (job.tags.includes("정규직")) reasons.push("정규직 채용이에요");
  if (reasons.length === 0) reasons.push(`${job.industry} 분야 공고예요`);
  return reasons.slice(0, 2);
}

function pickDiverseCategoryPolicies(policies: BusanPolicy[], count: number): BusanPolicy[] {
  const seen = new Set<string>();
  const picked: BusanPolicy[] = [];
  for (const p of policies) {
    if (seen.has(p.category)) continue;
    seen.add(p.category);
    picked.push(p);
    if (picked.length >= count) break;
  }
  return picked;
}

interface HomePageProps {
  competitions: Competition[];
  policies: BusanPolicy[];
  jobs: Job[];
  posts: CommunityPost[];
  isSaved: (type: ItemType, id: number) => boolean;
  onToggleSave: (type: ItemType, id: number) => void;
  onOpenDetail: (type: ItemType, id: number) => void;
  onNavigate: (tab: Tab, query?: string) => void;
  onWritePost: () => void;
  canWritePost: boolean;
}

function SaveHeart({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors flex-shrink-0 ${saved ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-muted border-border text-muted-foreground hover:text-rose-500"}`}>
      <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}

function HomeSection({ title, moreLabel, onMore, children }: { title: string; moreLabel: string; onMore: () => void; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <button onClick={onMore} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline flex-shrink-0">{moreLabel} <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      {children}
    </section>
  );
}

function StatCard({ value, label, caption }: { value: number; label: string; caption: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className="text-2xl font-black text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs font-medium text-foreground mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{caption}</p>
    </div>
  );
}

function SearchResultGroup({ title, items, onMore, onOpenItem }: { title: string; items: { id: number; label: string }[]; onMore: () => void; onOpenItem: (id: number) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{title} <span className="text-primary">{items.length}건</span></p>
        <button onClick={onMore} className="text-[11px] text-primary hover:underline">전체보기</button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">일치하는 결과가 없어요</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(it => (
            <button key={it.id} onClick={() => onOpenItem(it.id)} className="block w-full text-left text-xs text-foreground hover:text-primary truncate">{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomePage({ competitions, policies, jobs, posts, isSaved, onToggleSave, onOpenDetail, onNavigate, onWritePost, canWritePost }: HomePageProps) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);

  const activeCompetitions = competitions.filter(c => daysUntil(c.deadline) >= 0);
  const urgentCompetitions = [...activeCompetitions].sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)).slice(0, 4);
  const activePolicies = policies.filter(p => !p.deadline || daysUntil(p.deadline) >= 0);
  const recommendedPolicies = pickDiverseCategoryPolicies(activePolicies, 3);
  const previewJobs = jobs.slice(0, 3);
  const busanJobCount = jobs.filter(j => j.location.includes("부산")).length;
  const previewPosts = posts.slice(0, 3);

  function runSearch(q: string) {
    setQuery(q);
    setSearched(q.trim() ? q.trim() : null);
  }

  const searchMatches = searched
    ? {
        competitions: competitions.filter(c => c.name.toLowerCase().includes(searched.toLowerCase()) || c.categories.some(cat => cat.toLowerCase().includes(searched.toLowerCase()))),
        policies: policies.filter(p => p.name.includes(searched) || p.keywords.some(k => k.includes(searched))),
        jobs: jobs.filter(j => j.title.toLowerCase().includes(searched.toLowerCase()) || j.industry.toLowerCase().includes(searched.toLowerCase())),
      }
    : null;
  const hasSearchResults = !!searchMatches && searchMatches.competitions.length + searchMatches.policies.length + searchMatches.jobs.length > 0;

  return (
    <div className="pt-8 space-y-12 pb-4">
      {/* ── Hero ── */}
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-snug" style={{ letterSpacing: "-0.02em" }}>
            부산 청년에게 필요한 기회를 한곳에서 찾아보세요
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            공모전, 청년정책, 부산 IT 채용, 팀빌딩 정보를 한 곳에서 통합 탐색할 수 있어요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate("competition")} className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">공모전 찾기</button>
          <button onClick={() => onNavigate("policy")} className="border border-primary text-primary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-secondary transition-colors">정책 찾기</button>
          <button onClick={() => onNavigate("jobs")} className="border border-border text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:border-primary/40 transition-colors">채용 공고 보기</button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch(query)}
              placeholder="공모전, 청년정책, 관심 직무를 검색해보세요"
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-20 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
            <button onClick={() => runSearch(query)} className="absolute right-1.5 top-1.5 bottom-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 rounded-lg hover:bg-indigo-700 transition-colors">검색</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {KEYWORD_CHIPS.map(k => (
              <button key={k.label} onClick={() => runSearch(k.query)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground transition-colors">
                {k.label}
              </button>
            ))}
          </div>

          {searched && (
            hasSearchResults ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SearchResultGroup title="공모전" items={searchMatches!.competitions.slice(0, 3).map(c => ({ id: c.id, label: c.name }))}
                  onMore={() => onNavigate("competition", searched)} onOpenItem={id => onOpenDetail("competition", id)} />
                <SearchResultGroup title="정책" items={searchMatches!.policies.slice(0, 3).map(p => ({ id: p.id, label: p.name }))}
                  onMore={() => onNavigate("policy", searched)} onOpenItem={id => onOpenDetail("policy", id)} />
                <SearchResultGroup title="채용" items={searchMatches!.jobs.slice(0, 3).map(j => ({ id: j.id, label: j.title }))}
                  onMore={() => onNavigate("jobs", searched)} onOpenItem={id => onOpenDetail("job", id)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>
            )
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard value={activeCompetitions.length} label="확인 가능한 공모전" caption="마감 기준 집계" />
          <StatCard value={activePolicies.length} label="신청 가능한 정책" caption="상시 신청 포함" />
          <StatCard value={busanJobCount} label="부산권 IT 채용 공고" caption="상세 확인 필요" />
        </div>
      </section>

      {/* ── A. 마감 임박 공모전 ── */}
      <HomeSection title="마감 임박 공모전" moreLabel="공모전 전체보기" onMore={() => onNavigate("competition")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {urgentCompetitions.map(c => (
            <div key={c.id} onClick={() => onOpenDetail("competition", c.id)}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate">{c.categories[0] ?? "공모전"}</span>
                <span className="text-[11px] font-bold text-rose-600 flex-shrink-0">{dDayLabel(c.deadline)}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{c.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{c.organizer}</p>
              <div className="flex items-center justify-between pt-1 mt-auto">
                <span className="text-[11px] text-muted-foreground">{c.deadline}</span>
                <SaveHeart saved={isSaved("competition", c.id)} onClick={() => onToggleSave("competition", c.id)} />
              </div>
            </div>
          ))}
        </div>
      </HomeSection>

      {/* ── B. 나에게 추천하는 정책 ── */}
      <HomeSection title="나에게 추천하는 정책" moreLabel="정책 전체보기" onMore={() => onNavigate("policy")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recommendedPolicies.map(p => (
            <div key={p.id} onClick={() => onOpenDetail("policy", p.id)}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${POLICY_CATEGORY_CHIP[p.category] ?? "bg-muted text-muted-foreground"}`}>{p.category}</span>
                <span className="text-[11px] text-muted-foreground">{p.deadline ? dDayLabel(p.deadline) : "상시신청"}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{p.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{p.agency}</p>
              <p className="text-xs font-bold text-foreground truncate">{p.amount}</p>
              <div className="bg-secondary rounded-lg px-2.5 py-2 space-y-1">
                {getHomePolicyReasons(p).map((r, i) => <p key={i} className="text-[11px] text-primary leading-snug">· {r}</p>)}
              </div>
              <div className="flex items-center justify-end pt-1">
                <SaveHeart saved={isSaved("policy", p.id)} onClick={() => onToggleSave("policy", p.id)} />
              </div>
            </div>
          ))}
        </div>
      </HomeSection>

      {/* ── C. 관심 직무 기반 채용 공고 ── */}
      <HomeSection title="채용 공고 미리보기" moreLabel="채용 공고 더보기" onMore={() => onNavigate("jobs")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {previewJobs.map(j => (
            <div key={j.id} onClick={() => onOpenDetail("job", j.id)}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full truncate">{j.industry}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{dDayLabel(j.deadline)}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{j.title}</h3>
              <p className="text-xs font-semibold text-primary truncate">{j.company}</p>
              <p className="text-xs text-muted-foreground truncate">{j.location}</p>
              <div className="space-y-1">
                {getHomeJobReasons(j).map((r, i) => <p key={i} className="text-[11px] text-muted-foreground">· {r}</p>)}
              </div>
              <div className="flex items-center justify-end pt-1">
                <SaveHeart saved={isSaved("job", j.id)} onClick={() => onToggleSave("job", j.id)} />
              </div>
            </div>
          ))}
        </div>
      </HomeSection>

      {/* ── D. 팀빌딩 모집글 ── */}
      <HomeSection title="팀빌딩 모집글" moreLabel="팀빌딩 더보기" onMore={() => onNavigate("community")}>
        <div className="space-y-3">
          <button onClick={onWritePost} disabled={!canWritePost} title={canWritePost ? undefined : "역량진단을 먼저 완료해주세요"}
            className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <UserPlus className="w-4 h-4" /> 팀원 모집글 쓰기
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {previewPosts.map(post => {
              const isClosed = daysUntil(post.deadline) < 0;
              return (
                <div key={post.id} onClick={() => onNavigate("community")}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-primary">{post.recruitField}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isClosed ? "bg-muted text-muted-foreground border-border" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{isClosed ? "모집마감" : "모집중"}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{post.projectName}</p>
                  <div className="flex flex-wrap gap-1">
                    {post.lookingFor.slice(0, 2).map(r => <span key={r} className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{r}</span>)}
                  </div>
                  <div className="flex items-center justify-between pt-1 mt-auto text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{post.applicants}/{post.recruitCount}명</span>
                    <span>{post.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HomeSection>
    </div>
  );
}
