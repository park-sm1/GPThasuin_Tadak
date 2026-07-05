import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export interface WritePostDraft {
  title: string;
  recruitField: string;
  projectName: string;
  content: string;
  lookingFor: string[];
  skills: string[];
  recruitCount: number;
  contact: string;
  deadline: string;
}

interface CharacterOption {
  type: string;
  icon: string;
  bgClass: string;
}

interface WritePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: WritePostDraft) => void;
  characterOptions: CharacterOption[];
  recruitFieldOptions: string[];
}

const inputClass = "w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

export function WritePostModal({ open, onClose, onSubmit, characterOptions, recruitFieldOptions }: WritePostModalProps) {
  const [title, setTitle] = useState("");
  const [recruitField, setRecruitField] = useState(recruitFieldOptions[0] ?? "");
  const [projectName, setProjectName] = useState("");
  const [content, setContent] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [skillsText, setSkillsText] = useState("");
  const [recruitCount, setRecruitCount] = useState("4");
  const [contact, setContact] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  function toggleLookingFor(type: string) {
    setLookingFor(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectName.trim() || !content.trim() || !contact.trim() || !deadline) {
      setError("제목, 프로젝트/공모전명, 소개 내용, 연락 방법, 마감일은 필수예요.");
      return;
    }
    onSubmit({
      title: title.trim(),
      recruitField,
      projectName: projectName.trim(),
      content: content.trim(),
      lookingFor,
      skills: skillsText.split(",").map(s => s.trim()).filter(Boolean),
      recruitCount: Math.max(1, Number(recruitCount) || 1),
      contact: contact.trim(),
      deadline,
    });
    setTitle(""); setProjectName(""); setContent(""); setLookingFor([]); setSkillsText("");
    setRecruitCount("4"); setContact(""); setDeadline(""); setError("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-background w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
              <p className="text-sm font-bold text-foreground">팀원 모집글 쓰기</p>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">제목</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예) 부산 공모전 데이터 분석 팀원 구합니다" className={inputClass} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">모집 분야</label>
                <div className="flex flex-wrap gap-2">
                  {recruitFieldOptions.map(f => (
                    <button key={f} type="button" onClick={() => setRecruitField(f)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${recruitField === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/40"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">프로젝트 또는 공모전명</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="예) 부산 청년 창업 경진대회" className={inputClass} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">소개 내용</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="어떤 활동인지, 어떤 팀원이 필요한지 알려주세요."
                  className={`${inputClass} min-h-28 resize-none`} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">필요한 역할 (역량 타입, 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {characterOptions.map(c => {
                    const active = lookingFor.includes(c.type);
                    return (
                      <button key={c.type} type="button" onClick={() => toggleLookingFor(c.type)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : `${c.bgClass} hover:border-primary/40`}`}>
                        {c.icon} {c.type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">필요 스킬 (쉼표로 구분, 선택)</label>
                <input value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="예) React, 기획, 디자인" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">모집 인원</label>
                  <input type="number" min={1} value={recruitCount} onChange={e => setRecruitCount(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">모집 마감일</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">연락 방법</label>
                <input value={contact} onChange={e => setContact(e.target.value)} placeholder="예) 오픈카톡 링크 또는 이메일" className={inputClass} />
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}
              <button type="submit" className="w-full bg-primary text-primary-foreground text-sm font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all">
                모집글 올리기
              </button>
              <p className="text-center text-[11px] text-muted-foreground">데모 기능이라 새로고침하면 등록한 글이 사라져요.</p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
