"use client";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "./useToast";

type Ex = { id: string; category: string; name: string; weight: number; reps: number; sets: number; timed: boolean; sort: number };
type Tag = { id: string; label: string; sort: number };

export default function LibraryManager({ initialEx, initialTags }: { initialEx: Ex[]; initialTags: Tag[] }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { toast, node } = useToast();
  const [ex, setEx] = useState(initialEx);
  const [tags, setTags] = useState(initialTags);
  const cats = useMemo(() => {
    const s = [...new Set(ex.map((e) => e.category))];
    return s;
  }, [ex]);
  const [extraCats, setExtraCats] = useState<string[]>([]);
  const allCats = [...cats, ...extraCats.filter((c) => !cats.includes(c))];
  const [cat, setCat] = useState(allCats[0] ?? "");
  const [armed, setArmed] = useState<string | null>(null);
  const [ne, setNe] = useState({ name: "", weight: "", reps: "", sets: "", timed: false });
  const [newCat, setNewCat] = useState("");
  const [renameCat, setRenameCat] = useState(cat);
  const [newTag, setNewTag] = useState("");
  const uid = async () => (await sb.auth.getUser()).data.user!.id;

  function pickCat(c: string) { setCat(c); setRenameCat(c); setArmed(null); }

  async function saveEx(e: Ex, k: keyof Ex, raw: string | boolean) {
    let v: string | number | boolean = raw;
    if (k === "name") { v = String(raw).trim(); if (!v) return toast("종목명은 비울 수 없습니다"); if (ex.some((x) => x.name === v && x.id !== e.id)) return toast("이미 있는 종목명입니다"); }
    if (k === "weight") v = Math.max(0, Math.round((parseFloat(String(raw)) || 0) * 10) / 10);
    if (k === "reps" || k === "sets") v = Math.max(1, Math.round(parseFloat(String(raw)) || 1));
    if (e[k] === v) return;
    const { error } = await sb.from("exercises").update({ [k]: v }).eq("id", e.id);
    if (error) return toast("저장하지 못했습니다");
    setEx((l) => l.map((x) => (x.id === e.id ? { ...x, [k]: v } : x)));
  }
  async function delEx(e: Ex) {
    if (armed !== "ex:" + e.id) return setArmed("ex:" + e.id);
    const { error } = await sb.from("exercises").delete().eq("id", e.id);
    setArmed(null);
    if (error) return toast("삭제하지 못했습니다");
    setEx((l) => l.filter((x) => x.id !== e.id)); toast(`'${e.name}' 종목을 삭제했습니다`);
  }
  async function addEx(evt: React.FormEvent) {
    evt.preventDefault();
    const name = ne.name.trim();
    if (!name || !cat) return toast("종목명을 입력해 주세요");
    if (ex.some((x) => x.name === name)) return toast(`'${name}'은(는) 이미 있습니다`);
    const row = { trainer_id: await uid(), category: cat, name, weight: Math.max(0, parseFloat(ne.weight) || 0), reps: Math.max(1, parseInt(ne.reps) || 10), sets: Math.max(1, parseInt(ne.sets) || 3), timed: ne.timed, sort: ex.filter((x) => x.category === cat).length + 1 };
    const { data, error } = await sb.from("exercises").insert(row).select().single();
    if (error || !data) return toast("추가하지 못했습니다");
    setEx((l) => [...l, data as Ex]); setNe({ name: "", weight: "", reps: "", sets: "", timed: false }); toast(`'${name}' 종목을 추가했습니다`);
  }
  function addCat(evt: React.FormEvent) {
    evt.preventDefault();
    const c = newCat.trim();
    if (!c) return;
    if (allCats.includes(c)) return toast("같은 이름의 카테고리가 있습니다");
    setExtraCats((l) => [...l, c]); pickCat(c); setNewCat("");
    toast(`'${c}' 카테고리를 만들었습니다. 종목을 추가하면 저장됩니다`);
  }
  async function doRename() {
    const c = renameCat.trim();
    if (!c || c === cat) return setRenameCat(cat);
    if (allCats.includes(c)) { setRenameCat(cat); return toast("같은 이름의 카테고리가 있습니다"); }
    const { error } = await sb.from("exercises").update({ category: c }).eq("category", cat);
    if (error) return toast("이름을 바꾸지 못했습니다");
    setEx((l) => l.map((x) => (x.category === cat ? { ...x, category: c } : x)));
    setExtraCats((l) => l.map((x) => (x === cat ? c : x))); setCat(c);
  }
  async function delCat() {
    if (armed !== "cat") return setArmed("cat");
    const { error } = await sb.from("exercises").delete().eq("category", cat);
    setArmed(null);
    if (error) return toast("삭제하지 못했습니다");
    const gone = cat;
    setEx((l) => l.filter((x) => x.category !== gone)); setExtraCats((l) => l.filter((x) => x !== gone));
    const rest = allCats.filter((c) => c !== gone); pickCat(rest[0] ?? "");
    toast(`'${gone}' 카테고리를 삭제했습니다`);
  }

  async function saveTag(t: Tag, label: string) {
    const v = label.trim();
    if (!v || v === t.label) return;
    if (tags.some((x) => x.label === v)) return toast("이미 있는 항목입니다");
    const { error } = await sb.from("condition_tags").update({ label: v }).eq("id", t.id);
    if (error) return toast("저장하지 못했습니다");
    setTags((l) => l.map((x) => (x.id === t.id ? { ...x, label: v } : x)));
  }
  async function moveTag(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= tags.length) return;
    const next = [...tags]; [next[i], next[j]] = [next[j], next[i]];
    const withSort = next.map((t, k) => ({ ...t, sort: k + 1 }));
    setTags(withSort);
    await Promise.all([withSort[i], withSort[j]].map((t) => sb.from("condition_tags").update({ sort: t.sort }).eq("id", t.id)));
  }
  async function delTag(t: Tag) {
    if (armed !== "tag:" + t.id) return setArmed("tag:" + t.id);
    const { error } = await sb.from("condition_tags").delete().eq("id", t.id);
    setArmed(null);
    if (error) return toast("삭제하지 못했습니다");
    setTags((l) => l.filter((x) => x.id !== t.id));
  }
  async function addTag(evt: React.FormEvent) {
    evt.preventDefault();
    const v = newTag.trim(); if (!v) return;
    if (tags.some((x) => x.label === v)) return toast("이미 있는 항목입니다");
    const { data, error } = await sb.from("condition_tags").insert({ trainer_id: await uid(), label: v, sort: tags.length + 1 }).select().single();
    if (error || !data) return toast("추가하지 못했습니다");
    setTags((l) => [...l, data as Tag]); setNewTag("");
  }

  const list = ex.filter((e) => e.category === cat);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: 28, margin: 0 }}>종목·컨디션 관리</h1>

      <section className="panel">
        <h2 className="step-h">운동 종목 <small>고친 내용은 칸을 벗어나면 저장됩니다</small></h2>
        <div className="chips">{allCats.map((c) => <button key={c} aria-pressed={c === cat} onClick={() => pickCat(c)}>{c} <span className="num">{ex.filter((e) => e.category === c).length}</span></button>)}</div>
        <div className="stack" style={{ gap: 6, marginTop: 14 }}>
          <div className="erow hd"><span>종목명</span><span>기본 무게(kg)</span><span>횟수/초</span><span>세트</span><span>단위</span><span /></div>
          {list.map((e) => (
            <div className="erow" key={e.id}>
              <input className="fld" defaultValue={e.name} maxLength={30} aria-label="종목명" onBlur={(x) => saveEx(e, "name", x.target.value)} />
              <input className="fld n" type="number" min={0} step={2.5} defaultValue={e.weight} aria-label="기본 무게" onBlur={(x) => saveEx(e, "weight", x.target.value)} />
              <input className="fld n" type="number" min={1} defaultValue={e.reps} aria-label="기본 횟수" onBlur={(x) => saveEx(e, "reps", x.target.value)} />
              <input className="fld n" type="number" min={1} defaultValue={e.sets} aria-label="기본 세트" onBlur={(x) => saveEx(e, "sets", x.target.value)} />
              <label className="chk"><input type="checkbox" defaultChecked={e.timed} onChange={(x) => saveEx(e, "timed", x.target.checked)} /> 초 단위</label>
              <button className={`sbtn del ${armed === "ex:" + e.id ? "armed" : ""}`} onClick={() => delEx(e)}>{armed === "ex:" + e.id ? "삭제 확인" : "삭제"}</button>
            </div>
          ))}
          {!list.length && <div className="empty">이 카테고리에 종목이 없습니다. 아래에서 추가하세요.</div>}
          {cat && (
            <form className="erow" onSubmit={addEx} style={{ borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
              <input className="fld" id="ne-name" placeholder="새 종목명" value={ne.name} onChange={(x) => setNe({ ...ne, name: x.target.value })} maxLength={30} />
              <input className="fld n" id="ne-w" type="number" min={0} step={2.5} placeholder="0" value={ne.weight} onChange={(x) => setNe({ ...ne, weight: x.target.value })} />
              <input className="fld n" id="ne-r" type="number" min={1} placeholder="10" value={ne.reps} onChange={(x) => setNe({ ...ne, reps: x.target.value })} />
              <input className="fld n" id="ne-s" type="number" min={1} placeholder="3" value={ne.sets} onChange={(x) => setNe({ ...ne, sets: x.target.value })} />
              <label className="chk"><input type="checkbox" id="ne-t" checked={ne.timed} onChange={(x) => setNe({ ...ne, timed: x.target.checked })} /> 초 단위</label>
              <button className="sbtn add">추가</button>
            </form>
          )}
        </div>
        <div className="row" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <form className="row" onSubmit={addCat} style={{ flex: "1 1 260px" }}>
            <input className="fld" id="nc-name" style={{ flex: 1 }} placeholder="새 카테고리 (예: 스트레칭)" value={newCat} onChange={(x) => setNewCat(x.target.value)} maxLength={16} />
            <button className="sbtn">카테고리 추가</button>
          </form>
          {cat && <>
            <input className="fld" id="rc-name" style={{ flex: "0 1 160px" }} aria-label="카테고리 이름 변경" value={renameCat} onChange={(x) => setRenameCat(x.target.value)} onBlur={doRename} maxLength={16} />
            <button className={`sbtn del ${armed === "cat" ? "armed" : ""}`} onClick={delCat}>{armed === "cat" ? `'${cat}' 전체 삭제 확인` : "카테고리 삭제"}</button>
          </>}
        </div>
        <p className="hint">무게 0은 맨몸 운동입니다. 플랭크처럼 시간을 재는 종목은 '초 단위'를 켜세요. 지난 수업 기록은 바뀌지 않습니다.</p>
      </section>

      <section className="panel" id="tags">
        <h2 className="step-h">컨디션 항목 <small>AI 일지에 선택한 항목이 그대로 전달됩니다</small></h2>
        <div className="stack" style={{ gap: 6 }}>
          {tags.map((t, i) => (
            <div className="row" key={t.id} style={{ flexWrap: "nowrap" }}>
              <input className="fld" defaultValue={t.label} maxLength={20} aria-label="컨디션 이름" onBlur={(x) => saveTag(t, x.target.value)} />
              <button className="sbtn" aria-label="위로" disabled={i === 0} onClick={() => moveTag(i, -1)}>↑</button>
              <button className="sbtn" aria-label="아래로" disabled={i === tags.length - 1} onClick={() => moveTag(i, 1)}>↓</button>
              <button className={`sbtn del ${armed === "tag:" + t.id ? "armed" : ""}`} onClick={() => delTag(t)}>{armed === "tag:" + t.id ? "삭제 확인" : "삭제"}</button>
            </div>
          ))}
          <form className="row" onSubmit={addTag} style={{ flexWrap: "nowrap", borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
            <input className="fld" id="nt-name" placeholder="새 컨디션 항목" value={newTag} onChange={(x) => setNewTag(x.target.value)} maxLength={20} />
            <button className="sbtn add">추가</button>
          </form>
        </div>
      </section>
      {node}
    </div>
  );
}
