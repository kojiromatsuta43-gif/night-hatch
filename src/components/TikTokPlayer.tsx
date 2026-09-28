"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TikTok の動画をアプリの中で再生する。
 *
 * 以前は埋め込み `tiktok.com/embed/v2/…` を使っていたが、
 *   ・TikTok のページを丸ごと（コメント欄やおすすめ込みで）読み込むので重い
 *   ・自動再生されず、読み込み後にもう一度押す必要があった
 *   ・325×580 より小さくできず、拡大縮小で合わせていた
 * ため、TikTok 公式の軽い再生専用プレイヤー `tiktok.com/player/v1/…` に切り替えた。
 * 仕様: https://developers.tiktok.com/doc/embed-player
 *
 * 読み込みが終わるまではサムネイルとくるくるを出しておき、準備ができたら再生の合図を送る
 * （ブラウザの自動再生の制限で止まっている場合の保険）。
 */

const PLAYER_PARAMS = new URLSearchParams({
  autoplay: "1",
  loop: "1",
  rel: "0", // 終わったあとに他人のおすすめを出さない
  music_info: "0",
  description: "0",
  native_context_menu: "0",
  closed_caption: "0",
}).toString();

export function tiktokVideoId(url: string | null | undefined): string | null {
  const m = String(url ?? "").match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return m ? m[1] : null;
}

export function tiktokPlayerUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}?${PLAYER_PARAMS}`;
}

type TikTokMessage = { "x-tiktok-player"?: boolean; type?: string; value?: unknown };

/**
 * TikTok への接続を先に張っておく（画面を開いた時点で呼ぶ）。
 * 動画を押してから DNS・TLS の準備をしない分、最初の1本が速くなる。
 */
export function useTikTokPreconnect() {
  useEffect(() => {
    const hrefs = ["https://www.tiktok.com"];
    const added: HTMLLinkElement[] = [];
    for (const href of hrefs) {
      if (document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
      added.push(l);
    }
    return () => added.forEach((l) => l.remove());
  }, []);
}

export default function TikTokPlayer({
  videoId,
  poster,
  title,
  className = "",
  style,
}: {
  videoId: string;
  /** 読み込み中に見せるサムネイル */
  poster?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  // どの動画の準備ができたかを持つ（別の動画に切り替わると自動で「読み込み中」に戻る）
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const ready = readyFor === videoId;
  const idRef = useRef(videoId);
  useEffect(() => {
    idRef.current = videoId;
  }, [videoId]);
  const setReady = () => setReadyFor(idRef.current);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const data = (typeof e.data === "string" ? safeParse(e.data) : e.data) as TikTokMessage | null;
      if (!data || !data["x-tiktok-player"]) return;
      if (data.type === "onPlayerReady") {
        setReady();
        // 自動再生がブラウザに止められていても、準備ができた時点で再生を頼む
        ref.current?.contentWindow?.postMessage({ "x-tiktok-player": true, type: "play" }, "*");
      }
      if (data.type === "onStateChange" && (data.value === 1 || data.value === 3)) setReady();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={style}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )}
          <span className="relative flex flex-col items-center gap-2 text-xs font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-gold-500" />
            再生の準備をしています…
          </span>
        </div>
      )}
      <iframe
        ref={ref}
        key={videoId}
        src={tiktokPlayerUrl(videoId)}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        // onPlayerReady が届かない環境でも、読み込みが終われば表示に切り替える
        onLoad={() => setTimeout(setReady, 400)}
        title={title ?? "TikTok"}
      />
    </div>
  );
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
