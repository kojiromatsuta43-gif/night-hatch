/**
 * サムネイル・アイコンの取り直し。
 * サーバーは画像がまだ無いとき 404 を返して裏で取りに行くので、
 * 画面側は少しずつ間を空けて最大4回取り直す（2.5秒→5秒→10秒→20秒）。
 * それでも無ければ画像を消して背景だけ見せる。
 */
const WAITS = [2500, 5000, 10000, 20000];

/**
 * 画像URLの版。ブラウザに長く持たせている（30日）ので、
 * 保存の仕方を変えたとき（縮小など）はここを上げて取り直させる。
 */
export const IMG_VER = "2";
export const thumbUrl = (videoId: string) => `/api/ref-videos/${videoId}/thumbnail?v=${IMG_VER}`;
export const iconUrl = (accountId: string) => `/api/ref-accounts/${accountId}/icon?v=${IMG_VER}`;

export function retryImage(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const n = Number(img.dataset.retry ?? 0);
  if (n >= WAITS.length) {
    img.style.display = "none";
    return;
  }
  img.dataset.retry = String(n + 1);
  const base = img.src.split("?")[0];
  setTimeout(() => {
    img.src = `${base}?v=${IMG_VER}&r=${n + 1}`;
  }, WAITS[n]);
}
