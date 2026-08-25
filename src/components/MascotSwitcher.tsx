"use client";

import { MASCOTS, MASCOT_SWITCHER_ENABLED, MascotId, isSecretMascot } from "@/lib/mascot";
import { useMascot } from "./MascotProvider";

const ORDER: MascotId[] = ["bee", "pig", "tanuki"];

/**
 * キャラクター切替タブ。
 * ハチ・ぶたは常時表示。たぬは合言葉（URLに ?fun=on）を入れた端末にだけ出ます。
 * MASCOT_SWITCHER_ENABLED を false にすればタブごと消えます。
 */
export default function MascotSwitcher() {
  const { mascot, setMascot, unlocked, lock } = useMascot();
  if (!MASCOT_SWITCHER_ENABLED) return null;

  const items = ORDER.filter((key) => !isSecretMascot(key) || unlocked);

  return (
    <div className="flex items-center gap-1">
      <div
        role="group"
        aria-label="キャラクター変更"
        className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5"
      >
        {items.map((key) => {
          const m = MASCOTS[key];
          const on = mascot.id === key;
          return (
            <button
              key={key}
              onClick={() => setMascot(key)}
              aria-pressed={on}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                on ? "bg-honey-400 text-hive-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>
      {unlocked && (
        <button
          onClick={lock}
          title="たぬを隠す"
          aria-label="たぬを隠す"
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}
