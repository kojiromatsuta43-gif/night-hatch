"use client";

import { MASCOTS, MASCOT_SWITCHER_ENABLED, MascotId } from "@/lib/mascot";
import { useMascot } from "./MascotProvider";

const ORDER: MascotId[] = ["bee", "pig"];

/** キャラクター切替タブ。MASCOT_SWITCHER_ENABLED を false にすると消えます。 */
export default function MascotSwitcher() {
  const { mascot, setMascot } = useMascot();
  if (!MASCOT_SWITCHER_ENABLED) return null;

  return (
    <div
      role="group"
      aria-label="キャラクター変更"
      title="キャラクター変更"
      className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5"
    >
      {ORDER.map((key) => {
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
  );
}
