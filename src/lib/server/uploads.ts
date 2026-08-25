import fs from "fs";
import path from "path";
import { DATA_DIR } from "./db";

/** アップロードされたファイルの実体を置く場所（本番では永続ボリューム配下） */
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** 1ファイルあたりの上限 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type UploadRow = {
  id: string;
  user_id: string;
  filename: string;
  mime: string;
  size: number;
  created_at: string;
};

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function uploadPath(id: string) {
  return path.join(UPLOAD_DIR, id);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
