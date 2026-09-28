/**
 * 夜の街（エリア）の辞書と、地図の座標。公開サイトの「地域から選ぶ」で使う。
 *
 * お店のエリアは自由入力なので、ここの名前・別名で「正式なエリア名」にそろえる
 * （例: 「すすきの」「札幌すすきの」→ すすきの、「ミナミ」「心斎橋」→ 大阪ミナミ）。
 * 座標は駅・繁華街のだいたいの中心（緯度・経度）。
 */

export type RegionId = "hokkaido" | "tohoku" | "kanto" | "toshin" | "hokuriku" | "tokai" | "kansai" | "chugoku" | "kyushu" | "okinawa";

export type Region = {
  id: RegionId;
  name: string;
  /** 地図で寄るときの範囲 [西経度, 南緯度, 東経度, 北緯度] */
  bbox: [number, number, number, number];
  /** 日本全体の地図で光らせる位置（地域の真ん中あたり） */
  center: [number, number];
  /** 首都圏の中の「都心」のように、さらに寄る先の親 */
  parent?: RegionId;
};

export const REGIONS: Region[] = [
  { id: "hokkaido", name: "北海道", bbox: [139.3, 41.3, 145.9, 45.6], center: [141.9, 43.3] },
  { id: "tohoku", name: "東北", bbox: [139.2, 36.9, 142.2, 41.6], center: [140.8, 39.2] },
  { id: "kanto", name: "首都圏", bbox: [138.75, 35.05, 140.95, 36.75], center: [139.75, 35.8] },
  { id: "toshin", name: "東京都心", bbox: [139.63, 35.6, 139.86, 35.76], center: [139.74, 35.68], parent: "kanto" },
  { id: "hokuriku", name: "北陸・甲信越", bbox: [136.2, 35.3, 140.0, 38.6], center: [137.8, 37.0] },
  { id: "tokai", name: "東海", bbox: [135.9, 34.2, 139.2, 36.2], center: [137.2, 35.1] },
  { id: "kansai", name: "関西", bbox: [134.3, 33.6, 136.4, 35.6], center: [135.5, 34.7] },
  { id: "chugoku", name: "中国・四国", bbox: [130.8, 32.8, 134.9, 35.6], center: [133.0, 34.3] },
  { id: "kyushu", name: "九州", bbox: [128.6, 30.9, 132.2, 34.3], center: [130.6, 32.8] },
  { id: "okinawa", name: "沖縄", bbox: [123.6, 24.0, 128.6, 27.1], center: [127.7, 26.3] },
];
export const regionById = (id: string) => REGIONS.find((r) => r.id === id);

export type NightArea = { name: string; aliases: string[]; lon: number; lat: number; region: RegionId };

/** 文中でいちばん前に出てくる別名を当てる（同じ位置なら長い方）。「熊本銀座」は熊本、「錦糸町」は錦ではなく錦糸町 */
export const AREAS: NightArea[] = [
  // 北海道
  { name: "すすきの", aliases: ["すすきの", "ススキノ", "薄野", "札幌"], lon: 141.353, lat: 43.055, region: "hokkaido" },
  { name: "函館", aliases: ["函館"], lon: 140.729, lat: 41.769, region: "hokkaido" },
  { name: "旭川", aliases: ["旭川"], lon: 142.365, lat: 43.766, region: "hokkaido" },
  // 東北
  { name: "仙台国分町", aliases: ["国分町", "仙台"], lon: 140.868, lat: 38.264, region: "tohoku" },
  { name: "盛岡", aliases: ["盛岡"], lon: 141.152, lat: 39.702, region: "tohoku" },
  { name: "郡山", aliases: ["郡山"], lon: 140.387, lat: 37.398, region: "tohoku" },
  { name: "青森", aliases: ["青森"], lon: 140.74, lat: 40.822, region: "tohoku" },
  // 東京都心
  { name: "歌舞伎町", aliases: ["歌舞伎町"], lon: 139.703, lat: 35.695, region: "toshin" },
  { name: "新宿", aliases: ["新宿", "西新宿"], lon: 139.7, lat: 35.69, region: "toshin" },
  { name: "六本木", aliases: ["六本木"], lon: 139.731, lat: 35.663, region: "toshin" },
  { name: "西麻布", aliases: ["西麻布", "麻布", "AZABU"], lon: 139.723, lat: 35.656, region: "toshin" },
  { name: "銀座", aliases: ["銀座", "GINZA"], lon: 139.765, lat: 35.671, region: "toshin" },
  { name: "新橋", aliases: ["新橋"], lon: 139.758, lat: 35.666, region: "toshin" },
  { name: "赤坂", aliases: ["赤坂"], lon: 139.737, lat: 35.674, region: "toshin" },
  { name: "渋谷", aliases: ["渋谷"], lon: 139.701, lat: 35.659, region: "toshin" },
  { name: "恵比寿", aliases: ["恵比寿"], lon: 139.71, lat: 35.647, region: "toshin" },
  { name: "池袋", aliases: ["池袋"], lon: 139.711, lat: 35.729, region: "toshin" },
  { name: "上野", aliases: ["上野"], lon: 139.777, lat: 35.711, region: "toshin" },
  { name: "秋葉原", aliases: ["秋葉原", "アキバ"], lon: 139.773, lat: 35.698, region: "toshin" },
  { name: "神田", aliases: ["神田"], lon: 139.771, lat: 35.692, region: "toshin" },
  { name: "錦糸町", aliases: ["錦糸町"], lon: 139.814, lat: 35.697, region: "toshin" },
  { name: "五反田", aliases: ["五反田"], lon: 139.724, lat: 35.626, region: "toshin" },
  { name: "中野", aliases: ["中野"], lon: 139.666, lat: 35.706, region: "toshin" },
  { name: "北千住", aliases: ["北千住"], lon: 139.805, lat: 35.749, region: "toshin" },
  { name: "小岩", aliases: ["小岩"], lon: 139.882, lat: 35.733, region: "kanto" },
  { name: "蒲田", aliases: ["蒲田"], lon: 139.716, lat: 35.562, region: "kanto" },
  { name: "成増", aliases: ["成増"], lon: 139.631, lat: 35.778, region: "kanto" },
  { name: "吉祥寺", aliases: ["吉祥寺"], lon: 139.58, lat: 35.703, region: "kanto" },
  { name: "町田", aliases: ["町田"], lon: 139.446, lat: 35.542, region: "kanto" },
  { name: "立川", aliases: ["立川"], lon: 139.414, lat: 35.698, region: "kanto" },
  { name: "八王子", aliases: ["八王子"], lon: 139.339, lat: 35.656, region: "kanto" },
  // 首都圏（東京以外）
  { name: "横浜", aliases: ["横浜", "関内", "野毛"], lon: 139.638, lat: 35.444, region: "kanto" },
  { name: "川崎", aliases: ["川崎"], lon: 139.697, lat: 35.531, region: "kanto" },
  { name: "本厚木", aliases: ["本厚木", "厚木"], lon: 139.365, lat: 35.439, region: "kanto" },
  { name: "秦野", aliases: ["秦野", "渋沢"], lon: 139.22, lat: 35.374, region: "kanto" },
  { name: "茅ヶ崎", aliases: ["茅ヶ崎", "茅ケ崎"], lon: 139.404, lat: 35.334, region: "kanto" },
  { name: "大宮", aliases: ["大宮"], lon: 139.624, lat: 35.906, region: "kanto" },
  { name: "浦和", aliases: ["浦和"], lon: 139.645, lat: 35.861, region: "kanto" },
  { name: "川越", aliases: ["本川越", "川越"], lon: 139.482, lat: 35.917, region: "kanto" },
  { name: "越谷", aliases: ["南越谷", "越谷"], lon: 139.79, lat: 35.876, region: "kanto" },
  { name: "千葉", aliases: ["千葉", "栄町"], lon: 140.113, lat: 35.613, region: "kanto" },
  { name: "船橋", aliases: ["船橋"], lon: 139.985, lat: 35.701, region: "kanto" },
  { name: "柏", aliases: ["柏"], lon: 139.971, lat: 35.862, region: "kanto" },
  { name: "松戸", aliases: ["松戸"], lon: 139.9, lat: 35.784, region: "kanto" },
  { name: "水戸", aliases: ["水戸"], lon: 140.476, lat: 36.371, region: "kanto" },
  { name: "宇都宮", aliases: ["宇都宮"], lon: 139.898, lat: 36.559, region: "kanto" },
  { name: "高崎", aliases: ["高崎"], lon: 139.012, lat: 36.322, region: "kanto" },
  { name: "前橋", aliases: ["前橋"], lon: 139.063, lat: 36.389, region: "kanto" },
  { name: "太田", aliases: ["太田"], lon: 139.376, lat: 36.291, region: "kanto" },
  { name: "足利", aliases: ["足利"], lon: 139.449, lat: 36.337, region: "kanto" },
  { name: "東京", aliases: ["東京"], lon: 139.767, lat: 35.681, region: "toshin" },
  // 北陸・甲信越
  { name: "金沢片町", aliases: ["片町", "金沢"], lon: 136.656, lat: 36.561, region: "hokuriku" },
  { name: "富山", aliases: ["富山", "桜木町"], lon: 137.217, lat: 36.694, region: "hokuriku" },
  { name: "新潟古町", aliases: ["古町", "新潟"], lon: 139.045, lat: 37.922, region: "hokuriku" },
  { name: "長野", aliases: ["長野"], lon: 138.194, lat: 36.648, region: "hokuriku" },
  { name: "松本", aliases: ["松本"], lon: 137.972, lat: 36.238, region: "hokuriku" },
  // 東海
  { name: "名古屋錦", aliases: ["名古屋錦", "錦三", "錦", "栄", "名古屋"], lon: 136.905, lat: 35.17, region: "tokai" },
  { name: "静岡", aliases: ["静岡"], lon: 138.383, lat: 34.972, region: "tokai" },
  { name: "浜松", aliases: ["浜松"], lon: 137.734, lat: 34.704, region: "tokai" },
  { name: "岐阜", aliases: ["岐阜"], lon: 136.756, lat: 35.409, region: "tokai" },
  { name: "四日市", aliases: ["四日市"], lon: 136.624, lat: 34.965, region: "tokai" },
  { name: "鈴鹿", aliases: ["鈴鹿"], lon: 136.584, lat: 34.882, region: "tokai" },
  { name: "知多", aliases: ["知多", "東浦"], lon: 136.96, lat: 35.02, region: "tokai" },
  // 関西
  { name: "北新地", aliases: ["北新地", "キタ", "梅田"], lon: 135.497, lat: 34.698, region: "kansai" },
  { name: "大阪ミナミ", aliases: ["大阪ミナミ", "ミナミ", "東心斎橋", "心斎橋", "難波", "なんば", "宗右衛門町"], lon: 135.501, lat: 34.672, region: "kansai" },
  { name: "京都祇園", aliases: ["祇園", "木屋町", "先斗町", "京都"], lon: 135.772, lat: 35.004, region: "kansai" },
  { name: "神戸三宮", aliases: ["三宮", "三ノ宮", "神戸"], lon: 135.195, lat: 34.694, region: "kansai" },
  { name: "尼崎", aliases: ["尼崎"], lon: 135.414, lat: 34.718, region: "kansai" },
  { name: "堺", aliases: ["堺"], lon: 135.483, lat: 34.573, region: "kansai" },
  { name: "石橋", aliases: ["石橋"], lon: 135.448, lat: 34.806, region: "kansai" },
  { name: "姫路", aliases: ["姫路"], lon: 134.691, lat: 34.827, region: "kansai" },
  // 中国・四国
  { name: "岡山", aliases: ["岡山"], lon: 133.918, lat: 34.662, region: "chugoku" },
  { name: "広島流川", aliases: ["流川", "広島"], lon: 132.465, lat: 34.393, region: "chugoku" },
  { name: "高松", aliases: ["高松"], lon: 134.047, lat: 34.34, region: "chugoku" },
  { name: "松山", aliases: ["松山"], lon: 132.766, lat: 33.839, region: "chugoku" },
  { name: "徳島", aliases: ["徳島"], lon: 134.554, lat: 34.07, region: "chugoku" },
  // 九州
  { name: "福岡中洲", aliases: ["福岡中洲", "中洲", "天神", "福岡"], lon: 130.405, lat: 33.592, region: "kyushu" },
  { name: "久留米", aliases: ["久留米"], lon: 130.508, lat: 33.319, region: "kyushu" },
  { name: "熊本", aliases: ["熊本"], lon: 130.708, lat: 32.8, region: "kyushu" },
  { name: "鹿児島天文館", aliases: ["天文館", "鹿児島"], lon: 130.556, lat: 31.59, region: "kyushu" },
  { name: "宮崎", aliases: ["宮崎", "ニシタチ"], lon: 131.424, lat: 31.914, region: "kyushu" },
  { name: "佐賀", aliases: ["佐賀"], lon: 130.3, lat: 33.263, region: "kyushu" },
  { name: "佐世保", aliases: ["佐世保"], lon: 129.724, lat: 33.18, region: "kyushu" },
  { name: "長崎", aliases: ["長崎", "思案橋"], lon: 129.874, lat: 32.745, region: "kyushu" },
  { name: "大分", aliases: ["大分"], lon: 131.609, lat: 33.239, region: "kyushu" },
  // 沖縄
  { name: "那覇", aliases: ["那覇"], lon: 127.683, lat: 26.215, region: "okinawa" },
  { name: "浦添", aliases: ["浦添"], lon: 127.722, lat: 26.246, region: "okinawa" },
  { name: "石垣島", aliases: ["石垣島", "石垣"], lon: 124.156, lat: 24.34, region: "okinawa" },
];

const ALIAS_INDEX: { alias: string; area: NightArea }[] = AREAS.flatMap((a) => a.aliases.map((alias) => ({ alias, area: a }))).sort(
  (x, y) => y.alias.length - x.alias.length
);

/** 文字列の中からいちばん長く当たるエリアを探す（無ければ null） */
export function findArea(...texts: (string | null | undefined)[]): NightArea | null {
  for (const t of texts) {
    const s = (t ?? "").trim();
    if (!s) continue;
    const exact = AREAS.find((a) => a.name === s);
    if (exact) return exact;
    let best: { pos: number; len: number; area: NightArea } | null = null;
    for (const x of ALIAS_INDEX) {
      const pos = s.indexOf(x.alias);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && x.alias.length > best.len)) best = { pos, len: x.alias.length, area: x.area };
    }
    if (best) return best.area;
  }
  return null;
}

/** 自由入力のエリアを、辞書にあれば正式名に、無ければそのまま */
export const canonicalArea = (area: string) => findArea(area)?.name ?? area.trim();

// ─── 地図の座標（投影） ───
// x = (経度 − 122) × 100 × cos36°、y = (46 − 緯度) × 100。japanPath.ts の輪郭と同じ式
const K = 100;
const C = Math.cos((36 * Math.PI) / 180);
export const project = (lon: number, lat: number): [number, number] => [(lon - 122) * K * C, (46 - lat) * K];

/** 経度緯度の範囲 → SVG の viewBox（x, y, 幅, 高さ） */
export function bboxToView([w, s, e, n]: [number, number, number, number]): [number, number, number, number] {
  const [x1, y1] = project(w, n);
  const [x2, y2] = project(e, s);
  return [x1, y1, x2 - x1, y2 - y1];
}

/** 日本全体（沖縄まで）の範囲 */
export const JAPAN_VIEW = bboxToView([122.6, 23.6, 146.2, 45.9]);
