"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  agreementsFor,
  ASPECT_OPTIONS,
  DURATION_OPTIONS,
  EDIT_STYLE_OPTIONS,
  ELEMENT_OPTIONS,
  FORMAT_OPTIONS,
  MEDIA_OPTIONS,
  MIDCHECK_OPTIONS,
  isScriptCategory,
  isVideoCategory,
  DEFAULT_VIDEO_CATEGORY,
  PURPOSE_OPTIONS,
  SUBTITLE_OPTIONS,
  TONE_OPTIONS,
  VIDEO_USE_OPTIONS,
} from "@/lib/data";
import { BRAND, catalogItem, catalogGroups, clampQuantity, pointsFor, type Question } from "@/lib/brand";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import FileDrop, { UploadedFile } from "@/components/FileDrop";
import MicButton from "@/components/MicButton";
import { PointInline, useMascot } from "@/components/MascotProvider";
import SimpleOrderForm from "./SimpleOrderForm";
import { inputClass, CheckGroup, RadioGroup, Section, QuestionField, answerText, answered, MissingNotice } from "@/components/order/fields";

function OrderForm() {
  const { mascot } = useMascot();
  const router = useRouter();
  const { refresh } = useMe();
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [freelancers, setFreelancers] = useState<
    { id: string; name: string; done_count: number; worked_count: number }[]
  >([]);

  // 台本作成
  const [media, setMedia] = useState<string[]>([]);
  const [duration, setDuration] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [emotion, setEmotion] = useState("");
  const [format, setFormat] = useState<string[]>([]);
  const [tone, setTone] = useState<string[]>([]);
  const [elements, setElements] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [ngWords, setNgWords] = useState("");
  const [refUrl, setRefUrl] = useState("");

  // 動画編集（クラウド発注用）
  const [videoUse, setVideoUse] = useState<string[]>([]);
  const [videoUseOther, setVideoUseOther] = useState("");
  const [videoLength, setVideoLength] = useState("");
  const [aspect, setAspect] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialFiles, setMaterialFiles] = useState<UploadedFile[]>([]);
  const [assetFiles, setAssetFiles] = useState<UploadedFile[]>([]);
  const [bgm, setBgm] = useState("");
  const [scriptWish, setScriptWish] = useState("");
  const [editStyle, setEditStyle] = useState<string[]>([]);
  const [editStyleOther, setEditStyleOther] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cutNote, setCutNote] = useState("");
  const [graphicsNote, setGraphicsNote] = useState("");
  const [videoNg, setVideoNg] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [midCheck, setMidCheck] = useState("");

  // 看板ごとの質問（飲食メニュー・テレアポなど）への答え。見出し→値
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const setAnswer = (key: string, v: unknown) => setAnswers((a) => ({ ...a, [key]: v }));
  // 件数メニュー（テレアポ）の件数
  const [qty, setQty] = useState<number>(0);

  const [agreed, setAgreed] = useState(false);
  const search = useSearchParams();

  useEffect(() => {
    const cat = search.get("category");
    const ref = search.get("ref");
    const refTitle = search.get("refTitle");
    if (cat) setCategory(cat);
    if (ref) setRefUrl(ref);
    if (refTitle && !description) setDescription(`参考動画「${refTitle}」のような${cat ?? "コンテンツ"}を希望`);
    const scriptId = search.get("script");
    if (scriptId) {
      api<{ title: string; content: string }>(`/api/scripts/${scriptId}`)
        .then((s) => {
          setCategory(DEFAULT_VIDEO_CATEGORY);
          setScriptWish(s.content);
          setTitle((t) => t || `「${s.title}」の動画編集`);
          setDescription((d) => d || `保存済み台本「${s.title}」をもとにした動画編集を希望します。`);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api<{ id: string; name: string; done_count: number; worked_count: number }[]>("/api/freelancers")
      .then(setFreelancers)
      .catch(() => {});
  }, []);

  const item = catalogItem(category);
  const quantity = item?.quantity;
  const qtyValue = quantity ? clampQuantity(item!, qty || quantity.min) : 0;
  const points = category ? pointsFor(category, quantity ? { [quantity.key]: qtyValue } : undefined) : 0;
  // 看板側に質問が用意されているカテゴリは、その質問を出す（動画・台本の専用フォームより優先）
  const genericQuestions: Question[] = item?.questions ?? [];
  const useGeneric = genericQuestions.length > 0;
  const isScript = !useGeneric && isScriptCategory(category);
  const isVideo = !useGeneric && isVideoCategory(category);
  const agreements = item?.agreements ?? agreementsFor(category);
  const allQuestions: Question[] = [...BRAND.commonQuestions, ...genericQuestions];

  // 「次へ」が押せないとき、何が足りないのかを名前で出せるようにする。
  // ボタンが暗いだけだと、どこに戻ればいいのか分からないため。
  const missingStep1 = [
    !category && "作りたいもの",
    !title.trim() && "件名",
    !description.trim() && "依頼内容",
    !deadline && "希望納期",
  ].filter(Boolean) as string[];

  const step1Ok = missingStep1.length === 0;

  const missingScript = [
    !media.length && "1 使用媒体",
    !duration.length && "1 想定動画の尺",
    !purpose.length && "1 動画の目的",
    !target.trim() && "1 想定ターゲット",
    !emotion.trim() && "1 見た人にどう感じてほしいか",
    !format.length && "2 台本の形式",
    !tone.length && "2 トーンや雰囲気",
    !elements.length && "2 盛り込みたい要素",
  ].filter(Boolean) as string[];

  const missingVideo = [
    !(videoUse.length > 0 || videoUseOther.trim()) && "1 動画の用途",
    !videoLength.trim() && "1 動画の長さ（分）",
    !aspect && "1 希望する画面比率",
    !(materialUrl.trim() || materialFiles.length > 0) && "2 素材動画（URLかファイル）",
  ].filter(Boolean) as string[];

  const missingGeneric = allQuestions.filter((q) => q.required && !answered(q, answers[q.key])).map((q) => q.label);

  const missingStep2 = [
    ...(isScript ? missingScript : isVideo ? missingVideo : []),
    ...missingGeneric,
  ];
  const step2Ok = missingStep2.length === 0;

  const detail = (): Record<string, unknown> => {
    const generic: Record<string, unknown> = {};
    for (const q of allQuestions) {
      const v = answers[q.key];
      if (!answered(q, v)) continue;
      generic[q.key] = Array.isArray(v) && typeof v[0] === "object"
        ? (v as UploadedFile[]).map((f) => ({ name: f.name, url: f.url }))
        : v;
    }
    if (quantity) generic[quantity.key] = qtyValue;
    return { ...generic, ...specificDetail() };
  };

  const specificDetail = () =>
    isVideo
      ? {
          用途: videoUse,
          用途その他: videoUseOther,
          動画の長さ: videoLength ? `${videoLength}分` : "",
          画面比率: aspect,
          素材URL: materialUrl,
          素材ファイル: materialFiles.map((f) => ({ name: f.name, url: f.url })),
          画像ロゴ: assetFiles.map((f) => ({ name: f.name, url: f.url })),
          BGM: bgm,
          希望する台本: scriptWish,
          編集スタイル: editStyle,
          編集スタイルその他: editStyleOther,
          字幕スタイル: subtitle,
          カット指示: cutNote,
          図解アニメ: graphicsNote,
          NG事項: videoNg,
          参考動画: refUrl,
          その他指示: otherNote,
          中間チェック: midCheck,
        }
      : isScript
        ? { media, duration, purpose, target, emotion, format, tone, elements, keywords, ngWords, refUrl }
        : {};

  const submit = async () => {
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title, category, description, points, deadline, detail: detail(), assignee_id: assigneeId || null }),
      });
      refresh();
      router.push("/projects");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const steps = ["基本情報", "詳細ヒアリング", "確認・登録"];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">案件登録</h1>

      <ol className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                i < step
                  ? "bg-honey-400 text-hive-900"
                  : i === step
                    ? "bg-honey-100 text-honey-700 ring-2 ring-honey-500"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-slate-300" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <div className="text-sm font-semibold mb-2">案件の種類</div>
            <div className="space-y-3">
              {catalogGroups().map((g) => (
                <div key={g.heading}>
                  <div className="mb-1.5 text-xs font-semibold text-slate-500">{g.heading}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((c) => (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => setCategory(c.name)}
                        title={`${c.size}／${c.days}`}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          category === c.name
                            ? "border-honey-500 bg-honey-400 text-hive-900"
                            : "border-slate-300 bg-white hover:border-honey-400"
                        }`}
                      >
                        {c.name}
                        <span className="ml-1.5 text-xs opacity-70">
                          {c.quantity ? `${c.points}pt〜` : `${c.points}pt`}
                          {c.monthly ? "/月" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {item && (
              <p className="mt-2 text-xs text-slate-500">
                {item.size}。目安 {item.days}
                {item.monthly ? "。月額メニューは1か月ぶんを1件として発注します" : ""}
              </p>
            )}
          </div>
          {quantity && item && (
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {quantity.key}
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={quantity.min}
                  max={quantity.max}
                  step={quantity.step}
                  value={qty || quantity.min}
                  onChange={(e) => setQty(Number(e.target.value))}
                  onBlur={() => setQty(clampQuantity(item, qty || quantity.min))}
                  className={`${inputClass} max-w-[10rem]`}
                />
                <span className="mt-1 text-sm text-slate-500">{quantity.unit}</span>
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {quantity.hint ?? ""}（{quantity.min}〜{quantity.max}{quantity.unit}、{quantity.step}{quantity.unit}きざみ）
              </p>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold">タイトル（案件名）</span>
            <span className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 企業紹介動画の台本"
                className={inputClass}
              />
              <MicButton onText={(t) => setTitle((v) => (v ? v + t : t))} className="mt-1" />
            </span>
          </label>
          <label className="block">
            <span className="flex items-center gap-2 text-sm font-semibold">
              概要説明（最大2000文字）
              <MicButton onText={(t) => setDescription((v) => (v ? v + t : t))} />
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className={inputClass}
            />
          </label>
          <div className="block">
            <span className="text-sm font-semibold">フリーランサー指定</span>
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">任意</span>
            <p className="mt-1 mb-2 text-xs text-slate-500">
一度お取引のあった方を指名できます。初めての場合は「おまかせ」で募集します。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAssigneeId("")}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  assigneeId === ""
                    ? "border-honey-500 bg-honey-400 text-hive-900"
                    : "border-slate-300 bg-white hover:border-honey-400"
                }`}
              >
                おまかせ
              </button>
              {freelancers.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setAssigneeId(f.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    assigneeId === f.id
                      ? "border-honey-500 bg-honey-400 text-hive-900"
                      : "border-slate-300 bg-white hover:border-honey-400"
                  }`}
                >
                  {f.name}
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {f.done_count > 0 ? `完了${f.done_count}件` : `対応中${f.worked_count}件`}
                  </span>
                </button>
              ))}
              {freelancers.length === 0 && (
                <span className="text-sm text-slate-400">
                  指名できる方はまだいません。初回は「おまかせ」で募集し、担当した方を次回から指名できます。
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold">希望納期</span>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
            </label>
            <div className="block">
              <span className="text-sm font-semibold">消費する{mascot.pointName}</span>
              <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-honey-700">
                {points || "-"} <PointInline />
              </div>
            </div>
          </div>
          <MissingNotice items={missingStep1} />
          <div className="flex justify-end">
            <button
              disabled={!step1Ok}
              onClick={() => setStep(1)}
              className="rounded-lg bg-honey-400 px-5 py-2 text-sm font-medium text-hive-900 disabled:opacity-40 hover:bg-honey-300"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          {isScript && (
            <>
              <CheckGroup label="使用媒体（複数選択可）" options={MEDIA_OPTIONS} values={media} onChange={setMedia} required />
              <CheckGroup label="想定動画の尺（完成後）" options={DURATION_OPTIONS} values={duration} onChange={setDuration} required />
              <CheckGroup label="動画の目的" options={PURPOSE_OPTIONS} values={purpose} onChange={setPurpose} required />
              <label className="block">
                <span className="text-sm font-semibold">想定ターゲット（年齢・性別・悩み・属性など）<span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span></span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="例: 30代女性、産後ダイエットに悩む主婦"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">動画を見た人にどう感じてほしいか？（感情）<span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span></span>
                <input
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder="例:「自分に当てはまる！」「今すぐ申し込みたい」"
                  className={inputClass}
                />
              </label>
              <CheckGroup label="台本の形式（複数選択可）" options={FORMAT_OPTIONS} values={format} onChange={setFormat} required />
              <CheckGroup label="トーンや雰囲気の希望（複数可）" options={TONE_OPTIONS} values={tone} onChange={setTone} required />
              <CheckGroup label="盛り込みたい要素（複数選択可）" options={ELEMENT_OPTIONS} values={elements} onChange={setElements} required />
              <label className="block">
                <span className="text-sm font-semibold">絶対に入れてほしいキーワードや表現（任意）</span>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">避けてほしい表現・NGワード（任意）</span>
                <input value={ngWords} onChange={(e) => setNgWords(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">参考URL（任意）</span>
                <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://" className={inputClass} />
              </label>
            </>
          )}

          {isVideo && (
            <>
              <div className="rounded-lg bg-honey-50 px-4 py-3 text-sm font-semibold text-honey-800">
                動画編集フォーム（クラウド発注用）
              </div>

              <Section n={1} title="基本情報">
                <CheckGroup
                  label="編集する動画の用途（複数選択可）"
                  options={VIDEO_USE_OPTIONS}
                  values={videoUse}
                  onChange={setVideoUse}
                  required
                />
                <label className="block">
                  <span className="text-sm font-semibold">用途の補足・自由記入（任意）</span>
                  <input
                    value={videoUseOther}
                    onChange={(e) => setVideoUseOther(e.target.value)}
                    placeholder="例: 展示会ブースで流すループ動画"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">
                    動画の長さ（分）
                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={videoLength}
                    onChange={(e) => setVideoLength(e.target.value)}
                    placeholder="例: 1.5"
                    className={inputClass}
                  />
                </label>
                <RadioGroup label="希望する画面比率" options={ASPECT_OPTIONS} value={aspect} onChange={setAspect} required />
              </Section>

              <Section n={2} title="素材提供について">
                <label className="block">
                  <span className="text-sm font-semibold">
                    素材動画のURL（ギガファイル便・Googleドライブなど）
                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>
                  </span>
                  <input
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="https://"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    容量の大きい素材はURLでの共有をおすすめします。URLかファイルのどちらかは必須です。
                  </p>
                </label>
                <FileDrop
                  label="素材動画のファイル"
                  hint="直接アップロードする場合はこちら（1ファイル2GBまで）"
                  accept="video/*"
                  value={materialFiles}
                  onChange={setMaterialFiles}
                />
                <FileDrop
                  label="使用したい画像・ロゴなど（任意）"
                  hint="ロゴ、商品写真、テロップに使う画像など"
                  accept="image/*"
                  value={assetFiles}
                  onChange={setAssetFiles}
                />
                <label className="block">
                  <span className="text-sm font-semibold">使用したいBGM・SE（任意）</span>
                  <input
                    value={bgm}
                    onChange={(e) => setBgm(e.target.value)}
                    placeholder="例: 明るめのポップス。曲の指定があればURLを記入"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">希望する台本（任意）</span>
                  <textarea
                    value={scriptWish}
                    onChange={(e) => setScriptWish(e.target.value)}
                    rows={3}
                    placeholder="決まった台本・ナレーション原稿があれば貼り付けてください"
                    className={inputClass}
                  />
                </label>
              </Section>

              <Section n={3} title="デザインイメージについて">
                <CheckGroup
                  label="編集スタイル（複数選択可・任意）"
                  options={EDIT_STYLE_OPTIONS}
                  values={editStyle}
                  onChange={setEditStyle}
                />
                <label className="block">
                  <span className="text-sm font-semibold">編集スタイルの補足（任意）</span>
                  <input value={editStyleOther} onChange={(e) => setEditStyleOther(e.target.value)} className={inputClass} />
                </label>
                <RadioGroup label="字幕のスタイル（任意）" options={SUBTITLE_OPTIONS} value={subtitle} onChange={setSubtitle} />
                <label className="block">
                  <span className="text-sm font-semibold">カットの指示（間引き・不要部分のカットなど／任意）</span>
                  <textarea value={cutNote} onChange={(e) => setCutNote(e.target.value)} rows={2} className={inputClass} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">図解・イラスト・アニメーションの挿入希望（任意）</span>
                  <textarea value={graphicsNote} onChange={(e) => setGraphicsNote(e.target.value)} rows={2} className={inputClass} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">NG事項・避けてほしい表現（言葉・効果など／任意）</span>
                  <textarea value={videoNg} onChange={(e) => setVideoNg(e.target.value)} rows={2} className={inputClass} />
                </label>
              </Section>

              <Section n={4} title="参考・イメージ共有">
                <label className="block">
                  <span className="text-sm font-semibold">参考動画（SNSリンク・YouTubeなど／任意）</span>
                  <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://" className={inputClass} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">その他の指示（任意）</span>
                  <textarea value={otherNote} onChange={(e) => setOtherNote(e.target.value)} rows={3} className={inputClass} />
                </label>
              </Section>

              <Section n={5} title="納期・スケジュール">
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  希望納期は「基本情報」で入力済みです（{deadline || "未設定"}）。
                </div>
                <RadioGroup label="中間チェックの希望（任意）" options={MIDCHECK_OPTIONS} value={midCheck} onChange={setMidCheck} />
              </Section>
            </>
          )}

          {BRAND.commonQuestions.length > 0 && (
            <Section n={1} title="お店のこと">
              {BRAND.commonQuestions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
              ))}
            </Section>
          )}

          {useGeneric && (
            <Section n={BRAND.commonQuestions.length > 0 ? 2 : 1} title={`${category}について`}>
              {genericQuestions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
              ))}
            </Section>
          )}

          {!isScript && !isVideo && !useGeneric && (
            <p className="text-sm text-slate-500">
              このカテゴリは概要説明だけで発注できます。伝えたいことがあれば「戻る」で概要に書き足してください。
            </p>
          )}

          <MissingNotice items={missingStep2} numbered />
          <div className="flex justify-between border-t border-slate-200 pt-6">
            <button onClick={() => setStep(0)} className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100">
              戻る
            </button>
            <button
              disabled={!step2Ok}
              onClick={() => setStep(2)}
              className="rounded-lg bg-honey-400 px-5 py-2 text-sm font-medium text-hive-900 disabled:opacity-40 hover:bg-honey-300"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">カテゴリ</dt>
              <dd className="font-medium">{category}</dd>
            </div>
            <div>
              <dt className="text-slate-500">タイトル</dt>
              <dd className="font-medium">{title}</dd>
            </div>
            <div>
              <dt className="text-slate-500">希望納期</dt>
              <dd className="font-medium">{deadline}</dd>
            </div>
            <div>
              <dt className="text-slate-500">消費する{mascot.pointName}</dt>
              <dd className="font-medium">{points}<PointInline /></dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">概要</dt>
              <dd className="font-medium whitespace-pre-wrap">{description}</dd>
            </div>
          </dl>

          {isVideo && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-slate-500">用途</dt>
                <dd className="font-medium">{[...videoUse, videoUseOther].filter(Boolean).join("、") || "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">長さ・比率</dt>
                <dd className="font-medium">
                  {videoLength ? `${videoLength}分` : "-"} / {aspect || "-"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">素材</dt>
                <dd className="font-medium break-all">
                  {materialUrl && <span className="mr-2">{materialUrl}</span>}
                  {materialFiles.length > 0 && <span>ファイル{materialFiles.length}件</span>}
                  {assetFiles.length > 0 && <span className="ml-2">画像・ロゴ{assetFiles.length}件</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">編集スタイル</dt>
                <dd className="font-medium">{[...editStyle, editStyleOther].filter(Boolean).join("、") || "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">字幕・中間チェック</dt>
                <dd className="font-medium">
                  {subtitle || "-"} / {midCheck || "-"}
                </dd>
              </div>
            </dl>
          )}

          {(allQuestions.length > 0 || quantity) && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm">
              {quantity && (
                <div>
                  <dt className="text-slate-500">{quantity.key}</dt>
                  <dd className="font-medium">{qtyValue}{quantity.unit}</dd>
                </div>
              )}
              {allQuestions.filter((q) => answered(q, answers[q.key])).map((q) => (
                <div key={q.key} className={q.type === "textarea" ? "sm:col-span-2" : ""}>
                  <dt className="text-slate-500">{q.label}</dt>
                  <dd className="font-medium whitespace-pre-wrap break-words">{answerText(answers[q.key])}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm font-semibold mb-2">同意事項</div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
              {agreements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 accent-honey-500"
              />
              上記すべてに同意します
            </label>
          </div>
          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100">
              戻る
            </button>
            <button
              disabled={!agreed}
              onClick={submit}
              className="rounded-lg bg-honey-400 px-6 py-2 text-sm font-medium text-hive-900 disabled:opacity-40 hover:bg-honey-300"
            >
              案件を登録する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderCreatePage() {
  return (
    <Suspense>
      {BRAND.orderStyle === "simple" ? <SimpleOrderForm /> : <OrderForm />}
    </Suspense>
  );
}
