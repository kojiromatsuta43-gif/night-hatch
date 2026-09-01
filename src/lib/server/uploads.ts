import fs from "fs";
import path from "path";
import { DATA_DIR } from "./db";

/** アップロードされたファイルの実体を置く場所（本番では永続ボリューム配下） */
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
/** 分割アップロードの途中ファイル */
export const UPLOAD_TMP_DIR = path.join(UPLOAD_DIR, "tmp");

/**
 * 1ファイルあたりの上限。既定 2GB（動画の納品を想定）。
 * 環境変数 MAX_UPLOAD_MB で変えられる。
 */
export const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 2048) * 1024 * 1024;

/** 分割アップロードの1かけらの大きさ（画面側と合わせる） */
export const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

/** ボリュームに最低限残しておく空き（DB・サムネイル・ログのため） */
export const RESERVE_BYTES = 300 * 1024 * 1024;

export type UploadRow = {
  id: string;
  user_id: string;
  filename: string;
  mime: string;
  size: number;
  created_at: string;
};

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
}

export function uploadPath(id: string) {
  return path.join(UPLOAD_DIR, id);
}

export function partPath(userId: string, uploadId: string) {
  return path.join(UPLOAD_TMP_DIR, `${userId}-${uploadId}.part`);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** 置き場所の空き容量（分からなければ null） */
export function freeBytes(): number | null {
  try {
    ensureUploadDir();
    const st = fs.statfsSync(UPLOAD_DIR);
    return Number(st.bavail) * Number(st.bsize);
  } catch {
    return null;
  }
}

/** これから size バイト受け取れるか。空きが足りなければ理由の文字列を返す */
export function checkRoom(size: number): string | null {
  if (size > MAX_UPLOAD_BYTES) {
    return `1ファイル ${formatBytes(MAX_UPLOAD_BYTES)} までです（このファイルは ${formatBytes(size)}）。大きい素材はギガファイル便などのURLでご共有ください。`;
  }
  const free = freeBytes();
  if (free !== null && free - size < RESERVE_BYTES) {
    return `サーバーの保存容量が足りません（空き ${formatBytes(free)}）。管理者にご連絡ください。`;
  }
  return null;
}

/** 1日以上放置された途中ファイルを消す */
export function cleanupStaleParts() {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(UPLOAD_TMP_DIR)) {
      const p = path.join(UPLOAD_TMP_DIR, f);
      try {
        if (now - fs.statSync(p).mtimeMs > 24 * 3600 * 1000) fs.unlinkSync(p);
      } catch {
        /* 無視 */
      }
    }
  } catch {
    /* 無視 */
  }
}
