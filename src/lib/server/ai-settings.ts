import { getDb } from "./db";

/**
 * AIの使い分けと利用上限の設定。
 *
 * どの仕事にどのモデルを使うか（用途別）と、プラン別の回数上限を
 * app_meta の "ai_settings" に JSON で持つ。管理画面から変更できる。
 * 鍵（ANTHROPIC_API_KEY / GEMINI_API_KEY）は環境変数のみで、ここには一切保存しない。
 */

export type AiTask = "chat" | "sales" | "extract" | "backstage";
export type Provider = "anthropic" | "gemini";
export type ProviderChoice = "auto" | Provider;
export type PlanId = "light" | "standard" | "premium" | "unlimited";

export type TaskSetting = { provider: ProviderChoice; anthropicModel: string; geminiModel: string };
export type PlanLimit = { chatPerDay: number; genPerMonth: number };

export type AiSettings = {
  tasks: Record<AiTask, TaskSetting>;
  limits: Record<Exclude<PlanId, "unlimited">, PlanLimit>;
  /** 追加購入: extraPoints 🍯 で extraUses 回 */
  extraUses: number;
  extraPoints: number;
};

export const TASK_LABELS: Record<AiTask, { name: string; desc: string }> = {
  chat: { name: "お客様との会話・台本", desc: "AIチャットの返答、参考動画からの台本づくり" },
  sales: { name: "営業エージェント", desc: "トークスクリプト、営業リストの絞り込み条件づくり" },
  extract: { name: "資料の読み取り", desc: "ブランドプロファイルの抽出、動画分析" },
  backstage: { name: "裏方（自動処理）", desc: "取り込んだ動画のAI審査・ペルソナ付け、検索キーワード抽出。件数が多いので安いモデル向き" },
};

export const PLAN_LABELS: Record<PlanId, string> = {
  light: "ライト",
  standard: "スタンダード",
  premium: "プレミアム",
  unlimited: "無制限（社内・デモ）",
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  tasks: {
    chat: { provider: "auto", anthropicModel: "claude-sonnet-5", geminiModel: "gemini-3.6-flash" },
    sales: { provider: "auto", anthropicModel: "claude-sonnet-5", geminiModel: "gemini-3.6-flash" },
    extract: { provider: "auto", anthropicModel: "claude-sonnet-5", geminiModel: "gemini-3.6-flash" },
    backstage: { provider: "auto", anthropicModel: "claude-haiku-4-5", geminiModel: "gemini-3.1-flash-lite" },
  },
  limits: {
    light: { chatPerDay: 20, genPerMonth: 15 },
    standard: { chatPerDay: 60, genPerMonth: 50 },
    premium: { chatPerDay: 100, genPerMonth: 100 },
  },
  extraUses: 10,
  extraPoints: 1,
};

const KEY = "ai_settings";

function merge(saved: Partial<AiSettings> | null): AiSettings {
  const d = DEFAULT_AI_SETTINGS;
  if (!saved) return d;
  const tasks = { ...d.tasks } as Record<AiTask, TaskSetting>;
  for (const k of Object.keys(d.tasks) as AiTask[]) {
    tasks[k] = { ...d.tasks[k], ...(saved.tasks?.[k] ?? {}) };
  }
  const limits = { ...d.limits } as AiSettings["limits"];
  for (const k of Object.keys(d.limits) as (keyof AiSettings["limits"])[]) {
    limits[k] = { ...d.limits[k], ...(saved.limits?.[k] ?? {}) };
  }
  return {
    tasks,
    limits,
    extraUses: Number.isInteger(saved.extraUses) && saved.extraUses! > 0 ? saved.extraUses! : d.extraUses,
    extraPoints: Number.isInteger(saved.extraPoints) && saved.extraPoints! > 0 ? saved.extraPoints! : d.extraPoints,
  };
}

export function getAiSettings(): AiSettings {
  const row = getDb().prepare("SELECT value FROM app_meta WHERE key = ?").get(KEY) as { value: string } | undefined;
  if (!row) return DEFAULT_AI_SETTINGS;
  try {
    return merge(JSON.parse(row.value));
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

const PROVIDERS: ProviderChoice[] = ["auto", "anthropic", "gemini"];
const MODEL_RE = /^[a-z0-9.\-]{3,60}$/;

/** 管理画面からの保存。形式が崩れていたら既定値に寄せる */
export function saveAiSettings(input: unknown): AiSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<AiSettings>;
  const cleaned: Partial<AiSettings> = { tasks: {} as AiSettings["tasks"], limits: {} as AiSettings["limits"] };
  for (const k of Object.keys(DEFAULT_AI_SETTINGS.tasks) as AiTask[]) {
    const t = raw.tasks?.[k];
    if (!t) continue;
    cleaned.tasks![k] = {
      provider: PROVIDERS.includes(t.provider) ? t.provider : "auto",
      anthropicModel: MODEL_RE.test(t.anthropicModel ?? "") ? t.anthropicModel : DEFAULT_AI_SETTINGS.tasks[k].anthropicModel,
      geminiModel: MODEL_RE.test(t.geminiModel ?? "") ? t.geminiModel : DEFAULT_AI_SETTINGS.tasks[k].geminiModel,
    };
  }
  for (const k of Object.keys(DEFAULT_AI_SETTINGS.limits) as (keyof AiSettings["limits"])[]) {
    const l = raw.limits?.[k];
    if (!l) continue;
    const num = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100000 ? (v as number) : fallback);
    cleaned.limits![k] = {
      chatPerDay: num(l.chatPerDay, DEFAULT_AI_SETTINGS.limits[k].chatPerDay),
      genPerMonth: num(l.genPerMonth, DEFAULT_AI_SETTINGS.limits[k].genPerMonth),
    };
  }
  cleaned.extraUses = raw.extraUses;
  cleaned.extraPoints = raw.extraPoints;
  const merged = merge(cleaned);
  getDb().prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(KEY, JSON.stringify(merged));
  return merged;
}

/** 用途ごとに「どのプロバイダの、どのモデル」を使うか。鍵が無ければ null */
export function resolveModel(task: AiTask): { provider: Provider; model: string } | null {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const t = getAiSettings().tasks[task];
  let provider: Provider | null = null;
  if (t.provider === "anthropic") provider = hasAnthropic ? "anthropic" : hasGemini ? "gemini" : null;
  else if (t.provider === "gemini") provider = hasGemini ? "gemini" : hasAnthropic ? "anthropic" : null;
  else provider = hasAnthropic ? "anthropic" : hasGemini ? "gemini" : null;
  if (!provider) return null;
  // 環境変数で一括上書きしたいとき用（Railway から素早く切り替える）
  const envModel = provider === "gemini" ? process.env.GEMINI_MODEL : process.env.ANTHROPIC_MODEL;
  const model = envModel && task !== "backstage" ? envModel : provider === "gemini" ? t.geminiModel : t.anthropicModel;
  return { provider, model };
}

/** 管理画面表示用: 各用途で実際に何が使われるか */
export function describeRouting(): Record<AiTask, { provider: Provider; model: string } | null> {
  const out = {} as Record<AiTask, { provider: Provider; model: string } | null>;
  for (const k of Object.keys(DEFAULT_AI_SETTINGS.tasks) as AiTask[]) out[k] = resolveModel(k);
  return out;
}
