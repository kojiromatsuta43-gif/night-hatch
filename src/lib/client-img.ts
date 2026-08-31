/**
 * サムネイル・アイコンの取り直し。
 * サーバーは画像がまだ無いとき 404 を返して裏で取りに行くので、
 * 画面側は少しずつ間を空けて最大4回取り直す（2.5秒→5秒→10秒→20秒）。
 * それでも無ければ画像を消して背景だけ見せる。
 */
const WAITS = [2500, 5000, 10000, 20000];

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
    img.src = `${base}?r=${n + 1}`;
  }, WAITS[n]);
}
