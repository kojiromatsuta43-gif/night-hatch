"use client";

/**
 * サイドバー用の小さなアイコン。ハッチと同じ線（currentColor / 2.2）で描いた線画。
 * 名前はメニューの意味で付けてある（画面のパスではなく）。
 */
export type NavIconName =
  | "order" | "video" | "hatch" | "note" | "shop" | "diagnose"
  | "tray" | "list" | "mail" | "chat"
  | "month" | "report" | "bill" | "jar" | "guide" | "admin" | "search";

const P: Record<NavIconName, React.ReactNode> = {
  // メニュー: カクテルグラス
  order: <><path d="M4 5h16l-8 9z" /><path d="M12 14v6M8 20h8" /><path d="M15 3l-2 4" /></>,
  // 伸びてるお店の動画: 再生マーク付きスマホ
  video: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 9l4 3-4 3z" /></>,
  // ハッチに相談: 吹き出し
  hatch: <><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
  // 台本ノート
  note: <><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  // うちの店のこと: 店構え（看板）
  shop: <><path d="M4 10l2-5h12l2 5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  // 動画を診てもらう: 虫めがね
  diagnose: <><circle cx="11" cy="11" r="6" /><path d="M16 16l5 5" /><path d="M9 11l2 2 3-3" /></>,
  // オーダー: 伝票（オーダー票）
  tray: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  // 営業リスト
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  // メール＆フォーム営業
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  // チャット
  chat: <><path d="M4 6h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-1-2V8a2 2 0 0 1 0-2z" /><path d="M18 10h2a2 2 0 0 1 2 2v5l-3-2h-3" /></>,
  // ホーム: 月（今夜のカウンター）
  month: <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /><path d="M17 3v3M15.5 4.5h3" /></>,
  // ふりかえり: 折れ線
  report: <><path d="M4 19h16" /><path d="M5 15l4-5 4 3 6-7" /></>,
  // お会計: レシート
  bill: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  // ハニーのボトル（ボトルキープ）
  jar: <><path d="M10 2h4v4c0 1 1 2 2 3s2 2 2 4v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7c0-2 1-3 2-4s2-2 2-3z" /><path d="M8 14h8" /></>,
  // デモの歩き方: 足あと
  guide: <><path d="M9 4c-2 0-3 3-3 6s1 4 3 4 3-1 3-4-1-6-3-6z" /><path d="M15 10c-2 0-3 3-3 6s1 4 3 4 3-1 3-4-1-6-3-6z" /></>,
  // 管理: 歯車
  admin: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
  // お仕事をさがす
  search: <><circle cx="11" cy="11" r="6" /><path d="M16 16l5 5" /></>,
};

export default function NavIcon({ name, className = "h-[18px] w-[18px]" }: { name: NavIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
