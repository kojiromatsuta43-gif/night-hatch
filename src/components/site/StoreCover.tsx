import Illust from "@/components/Illust";
import { genreStyle } from "@/lib/listing";

/**
 * お店の写真。写真が無いときは、業態ごとの色と夜のお店のイラストで埋める（空っぽに見せない）。
 */
export default function StoreCover({
  photo,
  genre,
  alt = "",
  eager = false,
  big = false,
}: {
  photo?: string | null;
  genre: string;
  alt?: string;
  eager?: boolean;
  big?: boolean;
}) {
  const g = genreStyle(genre);
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/site/photos/${photo}`}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <div
      className="deco-rays absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(120% 95% at 18% 8%, ${g.to} 0%, ${g.from} 62%, #0F0C17 100%)` }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      <span className="absolute inset-3 rounded-[12px] border border-gold-300/30" aria-hidden="true" />
      <span className="absolute inset-[18px] rounded-[9px] border border-gold-300/15" aria-hidden="true" />
      <Illust name={g.illust} className={big ? "h-40 w-40 opacity-95 sm:h-52 sm:w-52" : "h-[46%] w-[46%] max-h-36 opacity-95"} />
      {!big && <span className="absolute bottom-4 right-5 font-latin text-[10px] text-gold-400/80">{g.en}</span>}
    </div>
  );
}
