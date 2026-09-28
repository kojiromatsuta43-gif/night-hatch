"use client";

/**
 * お店の「HPの掲載」— 公開サイト Night HATCH -ナイト・ハッチ- に載る内容を入れる画面。
 * 保存するとすぐサイトに反映される（公開はお店の同意＋運営の確認のあと）。
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { GENRES, LISTING_AGREEMENTS, MAX_PHOTOS, MAX_TIKTOK_URLS, PREFECTURES, SITE_NAME, STATUS_LABEL, isLineUrl, type Listing, type ListingStatus } from "@/lib/listing";

type Payload = { listing: Listing; status: ListingStatus; clicks: { drink: number; work: number }; videos: number };
type Form = Omit<Listing, "tiktok_urls"> & { tiktok_urls_text: string };

const input = "mt-1 w-full rounded-xl border border-night-200 bg-white px-3.5 py-3 text-[15px] text-hive-900 focus:border-night-500 focus:outline-none";
const STATUS_STYLE: Record<ListingStatus, string> = {
  draft: "bg-hive-200 text-hive-700",
  review: "bg-gold-400 text-ink-900",
  live: "bg-[#06C755] text-white",
};
const STATUS_HELP: Record<ListingStatus, string> = {
  draft: "まだサイトには出ていません。下の項目を入れて、いちばん下の「掲載に同意」にチェックして保存してください。",
  review: "運営が内容を確認しています。確認が済むとサイトに公開されます（ふだん1〜2営業日）。",
  live: "サイトに公開中です。ここで直した内容は、保存するとすぐサイトに出ます。",
};

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-hive-900">
        {label}
        {required && <span className="ml-1.5 rounded bg-night-500 px-1.5 py-0.5 text-[10px] text-white">必須</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-hive-500">{hint}</span>}
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-night-200 bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg text-hive-900">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] text-hive-500">{sub}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ListingPage() {
  const { me } = useMe();
  const [data, setData] = useState<Payload | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = (p: Payload) => {
    setData(p);
    setF({ ...p.listing, tiktok_urls_text: p.listing.tiktok_urls.join("\n") });
    setAgree(Boolean(p.listing.store_opt_in));
  };

  useEffect(() => {
    api<Payload>("/api/listing").then(apply).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  if (me?.role === "freelancer") return <p className="text-sm text-hive-500">この画面はお店のアカウントで使います。</p>;
  if (!data || !f) return <p className="text-sm text-hive-500">{msg?.text ?? "読み込み中…"}</p>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => (cur ? { ...cur, [k]: v } : cur));
  const text = (k: keyof Form) => ({ value: String(f[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never) });

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const p = await api<Payload>("/api/listing", {
        method: "PUT",
        body: JSON.stringify({
          store_name: f.store_name, genre: f.genre, prefecture: f.prefecture, area: f.area, access: f.access, address: f.address,
          hours: f.hours, holidays: f.holidays, catch_copy: f.catch_copy, description: f.description, price_system: f.price_system,
          recruit_hiring: Boolean(f.recruit_hiring), recruit_trial_wage: f.recruit_trial_wage, recruit_wage: f.recruit_wage,
          recruit_benefits: f.recruit_benefits, recruit_hours: f.recruit_hours, recruit_message: f.recruit_message,
          line_url: f.line_url, phone: f.phone, tiktok_handle: f.tiktok_handle,
          tiktok_urls: f.tiktok_urls_text.split(/\s+/).filter(Boolean), photos: f.photos, store_opt_in: agree,
        }),
      });
      apply(p);
      setMsg({ ok: true, text: p.status === "live" ? "保存しました。サイトに反映されています。" : p.status === "review" ? "保存しました。運営の確認が済むと公開されます。" : "保存しました（まだ下書きです）。" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "保存できませんでした" });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - f.photos.length;
    const list = Array.from(files).filter((x) => x.type.startsWith("image/")).slice(0, room);
    if (list.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      list.forEach((x) => fd.append("file", x));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "アップロードできませんでした");
      set("photos", [...f.photos, ...(j.files as { id: string }[]).map((x) => x.id)].slice(0, MAX_PHOTOS));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "アップロードできませんでした" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const movePhoto = (i: number, d: -1 | 1) => {
    const a = [...f.photos];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set("photos", a);
  };

  const siteUrl = `/site/stores/${f.slug}`;
  const lineOk = !f.line_url || isLineUrl(f.line_url);

  return (
    <div className="max-w-3xl space-y-5 pb-28">
      <div>
        <h1 className="text-2xl text-hive-900">HPの掲載</h1>
        <p className="page-sub">
          運営サイト「{SITE_NAME} -ナイト・ハッチ-」に、お店の TikTok 動画・料金・求人・公式LINEを無料で載せられます。
        </p>
      </div>

      {/* いまの状態 */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-night-200 bg-white p-5">
        <span className={`rounded-full px-3 py-1 text-sm font-black ${STATUS_STYLE[data.status]}`}>{STATUS_LABEL[data.status]}</span>
        <p className="min-w-0 flex-1 text-[13px] text-hive-700">{STATUS_HELP[data.status]}</p>
        <a href={siteUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gold-400 px-4 py-2 text-[13px] font-bold text-gold-600 hover:bg-gold-50">
          {data.status === "live" ? "サイトで見る ↗" : "プレビュー ↗"}
        </a>
        {data.status === "live" && (
          <p className="w-full text-[12px] text-hive-500">
            今月、公式LINEボタンが押された回数: 予約・問い合わせ <b className="text-hive-900">{data.clicks.drink}</b> 回／体入の相談 <b className="text-hive-900">{data.clicks.work}</b> 回
          </p>
        )}
      </div>

      <Section title="お店の基本">
        <Field label="店名" required><input {...text("store_name")} className={input} placeholder="例: ラウンジ ルナ" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="業態" required>
            <select {...text("genre")} className={input}>
              <option value="">選んでください</option>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="都道府県">
            <select {...text("prefecture")} className={input}>
              {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="エリア" required hint="サイトの「エリアでさがす」に出ます"><input {...text("area")} className={input} placeholder="例: 六本木" /></Field>
          <Field label="アクセス"><input {...text("access")} className={input} placeholder="例: 六本木駅 3番出口から徒歩2分" /></Field>
        </div>
        <Field label="住所" hint="入れるとGoogleマップのリンクが正確になります"><input {...text("address")} className={input} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="営業時間"><input {...text("hours")} className={input} placeholder="例: 20:00〜翌1:00" /></Field>
          <Field label="定休日"><input {...text("holidays")} className={input} placeholder="例: 日曜・祝日" /></Field>
        </div>
      </Section>

      <Section title="お店の紹介">
        <Field label="ひとこと（キャッチコピー）" hint="60文字まで。一覧のカードに出ます"><input {...text("catch_copy")} className={input} placeholder="例: 六本木の夜に、静かな一杯と会話を。" /></Field>
        <Field label="紹介文"><textarea {...text("description")} rows={5} className={input} placeholder="お店の雰囲気・おすすめの過ごし方など" /></Field>
      </Section>

      <Section title="料金システム" sub="1行に1つ、「名前: 金額」の形で。お客さまが会計前に総額を想像できるように書くのがおすすめです">
        <textarea {...text("price_system")} rows={6} className={`${input} font-mono`} placeholder={"セット料金（60分）: 8,000円\n延長（30分）: 4,000円\n指名料: 2,000円\nTAX・サービス料: 20%"} />
      </Section>

      <Section title="写真" sub={`${MAX_PHOTOS}枚まで。1枚目が表紙になります。キャスト・スタッフが写る写真は本人の同意を取ってください`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {f.photos.map((id, i) => (
            <div key={id} className="relative aspect-square overflow-hidden rounded-xl border border-night-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/uploads/${id}`} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-night-500 px-1.5 text-[10px] font-bold text-white">表紙</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 text-[12px] text-white">
                <button type="button" onClick={() => movePhoto(i, -1)} className="px-2 py-1" aria-label="前へ">←</button>
                <button type="button" onClick={() => set("photos", f.photos.filter((x) => x !== id))} className="px-2 py-1" aria-label="はずす">×</button>
                <button type="button" onClick={() => movePhoto(i, 1)} className="px-2 py-1" aria-label="後ろへ">→</button>
              </div>
            </div>
          ))}
          {f.photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-night-300 text-[12px] font-bold text-hive-500 hover:bg-night-50">
              <span className="text-2xl">＋</span>
              {uploading ? "送信中…" : "写真を足す"}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </Section>

      <Section title="TikTok 動画" sub="アカウントを入れておくと、お店の動画が週1回自動でサイトに並びます">
        <Field label="お店の TikTok アカウント" hint="例: @jungle.tokyo（URLを貼ってもOK）"><input {...text("tiktok_handle")} className={input} placeholder="@" /></Field>
        <Field label={`特に見せたい動画のURL（${MAX_TIKTOK_URLS}本まで・1行に1つ）`} hint="ここに入れた動画はいちばん前に出ます">
          <textarea value={f.tiktok_urls_text} onChange={(e) => set("tiktok_urls_text", e.target.value)} rows={3} className={input} placeholder="https://www.tiktok.com/@…/video/…" />
        </Field>
      </Section>

      <Section title="求人・体入" sub="「働く」の一覧とお店のページに出ます。18歳未満不可の表示はサイト側で自動で入ります">
        <label className="flex items-center gap-3 rounded-xl border border-night-200 px-4 py-3">
          <input type="checkbox" checked={Boolean(f.recruit_hiring)} onChange={(e) => set("recruit_hiring", e.target.checked ? 1 : 0)} className="h-5 w-5 accent-[#B23A62]" />
          <span className="text-[15px] font-bold text-hive-900">いま、キャスト・スタッフを募集している</span>
        </label>
        {Boolean(f.recruit_hiring) && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="体入の時給"><input {...text("recruit_trial_wage")} className={input} placeholder="例: 体入時給 4,000円" /></Field>
              <Field label="本入店の給与"><input {...text("recruit_wage")} className={input} placeholder="例: 時給 3,500円〜" /></Field>
            </div>
            <Field label="勤務時間・日数"><input {...text("recruit_hours")} className={input} placeholder="例: 20:00〜翌1:00のうち週1日・3時間〜" /></Field>
            <Field label="待遇" hint="「・」で区切るとサイトでタグになります"><input {...text("recruit_benefits")} className={input} placeholder="例: 日払いOK・終電上がりOK・ノルマなし" /></Field>
            <Field label="お店からのメッセージ"><textarea {...text("recruit_message")} rows={3} className={input} /></Field>
            <p className="text-[12px] text-hive-500">給与・待遇は実際の条件どおりに書いてください（職業安定法の的確表示）。</p>
          </>
        )}
      </Section>

      <Section title="公式LINE" sub="予約も体入の相談も、このLINEに直接つながります。サイトでは個人情報を預かりません">
        <Field label="公式LINEのURL" required hint="LINE公式アカウントの管理画面 → 友だち追加ガイド のURL（https://lin.ee/… など）">
          <input {...text("line_url")} className={`${input} ${lineOk ? "" : "!border-rose-500"}`} placeholder="https://lin.ee/…" inputMode="url" />
        </Field>
        {!lineOk && <p className="text-[12px] font-bold text-rose-600">https://lin.ee/… か https://line.me/… の形で入れてください</p>}
      </Section>

      <section className="rounded-2xl border border-gold-300 bg-white p-5 sm:p-6">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#B23A62]" />
          <span className="text-[14px] font-bold text-hive-900">
            掲載に同意します
            <ul className="mt-1.5 space-y-1 text-[12px] font-normal text-hive-700">
              {LISTING_AGREEMENTS.map((a) => <li key={a}>・{a}</li>)}
            </ul>
          </span>
        </label>
      </section>

      {/* 保存（下に固定） */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-gold-200 bg-ink-900/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[256px]">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className={`min-w-0 flex-1 truncate text-[13px] font-bold ${msg ? (msg.ok ? "text-emerald-500" : "text-rose-500") : "text-hive-500"}`}>
            {msg?.text ?? "入れ終わったら保存してください"}
          </p>
          <button onClick={save} disabled={saving} className="shrink-0 rounded-full bg-night-500 px-7 py-3 text-[15px] font-black text-white hover:bg-night-600 disabled:opacity-50">
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
