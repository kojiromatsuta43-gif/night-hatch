/**
 * 社内リサーチ用: OpenStreetMap から全国のバー・パブ・ナイトクラブを取り込む。
 *
 * データは OpenStreetMap のもの（© OpenStreetMap contributors／ODbL）。画面には必ず出典を出す。
 * 取り込むのは名前・種類・位置・公式サイト・営業時間だけ（電話番号などは持たない）。
 * 位置から「いちばん近い夜の街」（nightAreas.ts）を当てて、地図の件数に使う。
 * 本番サーバー（Railway）から Overpass API を呼ぶ。数分かかるので裏で動かし、状態は app_meta に残す。
 */
import { getDb } from "./db";
import { AREAS, type NightArea } from "../nightAreas";

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const QUERY = `[out:json][timeout:300];
area["ISO3166-1"="JP"][admin_level=2]->.jp;
(
  node["amenity"~"^(bar|pub|nightclub)$"](area.jp);
  way["amenity"~"^(bar|pub|nightclub)$"](area.jp);
);
out center tags;`;

const KIND: Record<string, string> = { bar: "バー", pub: "パブ", nightclub: "ナイトクラブ" };

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** 2点の距離（km） */
function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

/** いちばん近い夜の街（都心は1.2km、ほかは4km以内） */
function nearestArea(lat: number, lon: number): NightArea | null {
  let best: { a: NightArea; d: number } | null = null;
  for (const a of AREAS) {
    if (a.name === "東京") continue; // 「東京」は大ざっぱな名前なので位置合わせには使わない
    const d = km(lat, lon, a.lat, a.lon);
    const limit = a.region === "toshin" ? 1.2 : 4;
    if (d <= limit && (!best || d < best.d)) best = { a, d };
  }
  return best?.a ?? null;
}

let running = false;
export const osmRunning = () => running;

export function osmStatus() {
  const db = getDb();
  const get = (k: string) => (db.prepare("SELECT value FROM app_meta WHERE key = ?").get(k) as { value: string } | undefined)?.value ?? "";
  const total = (db.prepare("SELECT COUNT(*) AS c FROM osm_bars").get() as { c: number }).c;
  const placed = (db.prepare("SELECT COUNT(*) AS c FROM osm_bars WHERE area <> ''").get() as { c: number }).c;
  return { running, total, placed, lastRun: get("osm_last_run"), lastError: get("osm_last_error") };
}

export async function importOsmBars(): Promise<{ total: number; placed: number }> {
  if (running) throw new Error("取り込み中です");
  running = true;
  const db = getDb();
  const setMeta = (k: string, v: string) => db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(k, v);
  try {
    let json: { elements?: El[] } | null = null;
    let lastErr = "";
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NIGHT-HATCH/1.0 (internal research)" },
          body: "data=" + encodeURIComponent(QUERY),
          signal: AbortSignal.timeout(330_000),
        });
        if (!res.ok) {
          lastErr = `${url} HTTP ${res.status}`;
          continue;
        }
        json = await res.json();
        break;
      } catch (e) {
        lastErr = `${url} ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    if (!json?.elements) throw new Error(`OpenStreetMap から取得できませんでした（${lastErr}）`);

    const ins = db.prepare(
      `INSERT OR REPLACE INTO osm_bars (osm_id, name, kind, lat, lon, area, website, hours, updated_at)
       VALUES (@osm_id, @name, @kind, @lat, @lon, @area, @website, @hours, datetime('now'))`
    );
    let total = 0;
    let placed = 0;
    db.transaction(() => {
      db.prepare("DELETE FROM osm_bars").run();
      for (const el of json!.elements!) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const t = el.tags ?? {};
        if (lat == null || lon == null) continue;
        const name = (t["name:ja"] || t.name || "").slice(0, 80);
        if (!name) continue; // 名前の無い点は調べようがないので入れない
        const area = nearestArea(lat, lon)?.name ?? "";
        ins.run({
          osm_id: `${el.type}/${el.id}`,
          name,
          kind: KIND[t.amenity] ?? t.amenity ?? "",
          lat,
          lon,
          area,
          website: (t.website || t["contact:website"] || "").slice(0, 300),
          hours: (t.opening_hours || "").slice(0, 120),
        });
        total++;
        if (area) placed++;
      }
    })();
    setMeta("osm_last_run", new Date().toISOString());
    setMeta("osm_last_error", "");
    return { total, placed };
  } catch (e) {
    setMeta("osm_last_error", e instanceof Error ? e.message : String(e));
    throw e;
  } finally {
    running = false;
  }
}

/** 地図用: エリアごとのバーの数 */
export function osmBarStats(): { area: string; count: number }[] {
  return getDb().prepare("SELECT area, COUNT(*) AS count FROM osm_bars WHERE area <> '' GROUP BY area").all() as { area: string; count: number }[];
}

export type OsmBar = { osm_id: string; name: string; kind: string; lat: number; lon: number; website: string; hours: string };

export function osmBarsIn(area: string, limit = 300): OsmBar[] {
  return getDb()
    .prepare("SELECT osm_id, name, kind, lat, lon, website, hours FROM osm_bars WHERE area = ? ORDER BY kind, name LIMIT ?")
    .all(area, limit) as OsmBar[];
}
