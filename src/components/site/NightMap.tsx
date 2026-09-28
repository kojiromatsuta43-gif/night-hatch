"use client";

/**
 * 「地域から選ぶ」の夜の日本地図。
 * 日本全体 → 地域（首都圏・関西…）→ 東京都心、と押したところへ“ファー”っと寄っていく。
 * 光の大きさ＝お店の数。エリアを押すと、そのエリアの「飲みに行く／働く」の一覧へ進める。
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { JAPAN_PATH } from "@/lib/japanPath";
import { AREAS, JAPAN_VIEW, REGIONS, bboxToView, project, regionById, type RegionId } from "@/lib/nightAreas";

type Stat = { area: string; drink: number; work: number };
type View = "japan" | RegionId;
type Mode = "drink" | "work";
type VB = [number, number, number, number];

const DURATION = 950;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 決まった並びの星（毎回同じ位置に出す） */
const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  // サーバーとブラウザで小数の末尾が違うと描画がずれるので丸めておく
  const q = (n: number) => Math.round(n * 10) / 10;
  return { x: q(JAPAN_VIEW[0] - 200 + r(1) * (JAPAN_VIEW[2] + 400)), y: q(JAPAN_VIEW[1] - 200 + r(2) * (JAPAN_VIEW[3] + 400)), s: q(0.4 + r(3) * 1.2), d: q(r(4) * 6) };
});

function viewFor(v: View): VB {
  if (v === "japan") return JAPAN_VIEW;
  const r = regionById(v)!;
  return bboxToView(r.bbox);
}

export default function NightMap({ stats, base, initialMode = "drink", initialView = "japan" }: { stats: Stat[]; base: string; initialMode?: Mode; initialView?: View }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>(initialView);
  const [vb, setVb] = useState<VB>(() => viewFor(initialView));
  const [picked, setPicked] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ x: number; y: number; key: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<[number, number]>([800, 560]);
  const vbRef = useRef(vb);
  useEffect(() => {
    vbRef.current = vb;
  }, [vb]);
  const flashAt = (x: number, y: number) => setFlash((prev) => ({ x, y, key: (prev?.key ?? 0) + 1 }));

  // 画面の幅（文字や光の大きさを、寄っても同じ見た目の大きさに保つため）
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox([el.clientWidth || 800, el.clientHeight || 560]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 寄る・引くアニメーション（viewBox をなめらかに動かす）
  useEffect(() => {
    const from = vbRef.current;
    const to = viewFor(view);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const k = ease(t);
      setVb([0, 1, 2, 3].map((i) => from[i] + (to[i] - from[i]) * k) as VB);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  const count = (s: Stat) => (mode === "drink" ? s.drink : s.work);
  const byArea = useMemo(() => new Map(stats.map((s) => [s.area, s])), [stats]);
  const areaCount = (name: string) => {
    const s = byArea.get(name);
    return s ? count(s) : 0;
  };
  const regionCount = (id: RegionId): number =>
    AREAS.filter((a) => a.region === id).reduce((n, a) => n + areaCount(a.name), 0) +
    REGIONS.filter((r) => r.parent === id).reduce((n, r) => n + regionCount(r.id), 0);
  const known = useMemo(() => new Set(AREAS.map((a) => a.name)), []);
  const others = stats.filter((s) => !known.has(s.area) && count(s) > 0);
  const total = stats.reduce((n, s) => n + count(s), 0);

  // 1画面ピクセル → SVG 単位
  // （preserveAspectRatio=meet なので、縦横のうち余る方ではなく、きつい方の倍率で決まる）
  const u = Math.max(vb[2] / box[0], vb[3] / box[1]);
  const zoomTo = (v: View, at?: [number, number]) => {
    setPicked(null);
    if (at) flashAt(at[0], at[1]);
    setView(v);
  };

  const crumbs: { label: string; v: View }[] = [{ label: "日本", v: "japan" }];
  if (view !== "japan") {
    const r = regionById(view)!;
    if (r.parent) crumbs.push({ label: regionById(r.parent)!.name, v: r.parent });
    crumbs.push({ label: r.name, v: view });
  }

  // いまの画面に出す光
  type Light = { key: string; x: number; y: number; n: number; label: string; onClick: () => void; big?: boolean };
  const lights: Light[] = [];
  const dim: { key: string; x: number; y: number }[] = [];
  if (view === "japan") {
    for (const r of REGIONS.filter((r) => !r.parent)) {
      const n = regionCount(r.id);
      const [x, y] = project(...r.center);
      if (n > 0) lights.push({ key: r.id, x, y, n, label: r.name, big: true, onClick: () => zoomTo(r.id, [x, y]) });
      else dim.push({ key: r.id, x, y });
    }
  } else {
    // 子の地域（首都圏の中の東京都心）はひとかたまりの光にする
    for (const child of REGIONS.filter((r) => r.parent === view)) {
      const n = regionCount(child.id);
      const [x, y] = project(...child.center);
      if (n > 0) lights.push({ key: child.id, x, y, n, label: child.name, big: true, onClick: () => zoomTo(child.id, [x, y]) });
    }
    for (const a of AREAS.filter((a) => a.region === view)) {
      const n = areaCount(a.name);
      const [x, y] = project(a.lon, a.lat);
      if (n > 0) lights.push({ key: a.name, x, y, n, label: a.name, onClick: () => { flashAt(x, y); setPicked(a.name); } });
      else dim.push({ key: a.name, x, y });
    }
  }
  const maxN = Math.max(1, ...lights.map((l) => l.n));
  const radius = (n: number, big?: boolean) => ((big ? 10 : 6) + Math.sqrt(n / maxN) * (big ? 22 : 16)) * u;

  const pickedStat = picked ? byArea.get(picked) : null;

  return (
    <div className="space-y-4">
      {/* 飲みに行く／働く */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-[13px]" aria-label="いまの場所">
          {crumbs.map((c, i) => (
            <span key={c.v} className="flex items-center gap-1">
              {i > 0 && <span className="text-hive-500">›</span>}
              {i < crumbs.length - 1 ? (
                <button type="button" onClick={() => zoomTo(c.v)} className="rounded-full px-2 py-1 font-bold text-gold-600 hover:bg-night-100">{c.label}</button>
              ) : (
                <span className="px-2 py-1 font-bold text-hive-900">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex rounded-full border border-gold-300/60 p-0.5 text-[13px] font-bold">
          {(["drink", "work"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-4 py-1.5 transition-colors ${mode === m ? "bg-night-500 text-white" : "text-hive-700 hover:text-hive-900"}`}>
              {m === "drink" ? "飲みに行く" : "働く"}
            </button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="relative overflow-hidden rounded-2xl border border-gold-300/60 bg-[#121733]">
        <svg viewBox={vb.join(" ")} preserveAspectRatio="xMidYMid meet" className="block aspect-[4/5] max-h-[72vh] w-full select-none sm:aspect-[16/10]" role="img" aria-label="夜の日本地図">
          <defs>
            <radialGradient id="nm-sky" cx="50%" cy="40%" r="75%">
              <stop offset="0" stopColor="#2a3563" />
              <stop offset="0.6" stopColor="#1b2247" />
              <stop offset="1" stopColor="#121733" />
            </radialGradient>
            <radialGradient id="nm-glow">
              <stop offset="0" stopColor="#FFE3A3" stopOpacity="1" />
              <stop offset="0.25" stopColor="#F2B84B" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#E0457B" stopOpacity="0.35" />
              <stop offset="1" stopColor="#E0457B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nm-land" cx="50%" cy="50%" r="70%">
              <stop offset="0" stopColor="#5b4a86" />
              <stop offset="1" stopColor="#433668" />
            </radialGradient>
          </defs>
          <rect x={JAPAN_VIEW[0] - 600} y={JAPAN_VIEW[1] - 600} width={JAPAN_VIEW[2] + 1200} height={JAPAN_VIEW[3] + 1200} fill="url(#nm-sky)" />
          <g className="nm-stars">
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.s * u} fill="#fff" style={{ animationDelay: `${s.d}s` }} />
            ))}
          </g>
          <path d={JAPAN_PATH} fill="url(#nm-land)" stroke="#F2D59B" strokeOpacity="0.9" strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {/* 小さな街あかり（まだお店が無いところ） */}
          {dim.map((d) => (
            <circle key={d.key} cx={d.x} cy={d.y} r={3 * u} fill="#FFE9B8" opacity="0.7" />
          ))}
          {/* 押したところのフラッシュ */}
          {flash && <circle key={flash.key} cx={flash.x} cy={flash.y} r={4 * u} fill="url(#nm-glow)" className="nm-flash" />}
          {/* お店のある場所の光 */}
          {lights.map((l) => {
            const r = radius(l.n, l.big);
            const fs = (l.big ? 17 : 15) * u;
            return (
              <g key={l.key} className="cursor-pointer" onClick={l.onClick} role="button" aria-label={`${l.label} ${l.n}件`}>
                <circle cx={l.x} cy={l.y} r={r * 2.2} fill="url(#nm-glow)" className="nm-pulse" />
                <circle cx={l.x} cy={l.y} r={r * 0.32} fill="#FFF4D6" />
                <circle cx={l.x} cy={l.y} r={r * 2.4} fill="transparent" />
                <text x={l.x} y={l.y - r * 0.9} textAnchor="middle" fontSize={fs} fontWeight={800} fill="#fff" stroke="#121733" strokeWidth={fs * 0.3} paintOrder="stroke" style={{ letterSpacing: "0.04em" }}>
                  {l.label}
                </text>
                <text x={l.x} y={l.y + r * 0.9 + fs * 0.9} textAnchor="middle" fontSize={fs * 0.85} fontWeight={800} fill="#FFD27A" stroke="#121733" strokeWidth={fs * 0.26} paintOrder="stroke">
                  {l.n}店{l.big ? " ›" : ""}
                </text>
              </g>
            );
          })}
        </svg>

        {view === "japan" && (
          <p className="pointer-events-none absolute left-4 top-4 max-w-[60%] rounded-lg bg-black/35 px-3 py-2 text-[12px] leading-relaxed text-white sm:text-[13px]">
            光っているところを押すと、その地域に寄れます。<br />
            いま {total} 店
          </p>
        )}
        {view !== "japan" && (
          <button type="button" onClick={() => zoomTo(regionById(view)!.parent ?? "japan")} className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/60 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur hover:bg-black/80">
            ← {regionById(view)!.parent ? regionById(regionById(view)!.parent!)!.name : "日本全体"}へ
          </button>
        )}

        {/* エリアを押したときのカード */}
        {picked && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-gold-300/60 bg-[#0f0c17]/95 p-4 backdrop-blur sm:left-auto sm:right-4 sm:w-80">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="kicker">Area</p>
                <p className="font-display text-2xl text-hive-900">{picked}</p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="rounded-full px-2 py-1 text-hive-500 hover:text-hive-900" aria-label="閉じる">✕</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`${base}/drink?area=${encodeURIComponent(picked)}`} className="rounded-xl bg-night-500 px-3 py-2.5 text-center text-[13px] font-bold text-white hover:bg-night-600">
                飲みに行く<span className="block text-[11px] font-normal opacity-85">{pickedStat?.drink ?? 0} 店</span>
              </Link>
              <Link
                href={`${base}/work?area=${encodeURIComponent(picked)}`}
                className={`rounded-xl border border-gold-400 px-3 py-2.5 text-center text-[13px] font-bold text-gold-600 hover:bg-gold-50 ${(pickedStat?.work ?? 0) === 0 ? "pointer-events-none opacity-40" : ""}`}
              >
                働く<span className="block text-[11px] font-normal opacity-85">{pickedStat?.work ?? 0} 店</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 地図の下: いまの画面の地域・エリアを文字でも（押しやすさと読み上げのため） */}
      <ul className="flex flex-wrap gap-2">
        {lights
          .slice()
          .sort((a, b) => b.n - a.n)
          .map((l) => (
            <li key={l.key}>
              <button type="button" onClick={l.onClick} className="rounded-full border border-gold-200 px-3.5 py-1.5 text-[13px] font-bold text-hive-900 hover:border-gold-400 hover:bg-night-50">
                {l.label} <span className="text-gold-500">{l.n}</span>
              </button>
            </li>
          ))}
      </ul>
      {view === "japan" && others.length > 0 && (
        <p className="text-[12px] text-hive-500">
          地図にないエリア:{" "}
          {others.map((o, i) => (
            <span key={o.area}>
              {i > 0 && "・"}
              <Link href={`${base}/${mode}?area=${encodeURIComponent(o.area)}`} className="text-gold-600 hover:underline">{o.area}（{count(o)}）</Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
