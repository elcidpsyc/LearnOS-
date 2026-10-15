import { useId, type CSSProperties } from "react";
import { FileText, Play, Headphones, ArrowUpRight } from "lucide-react";
import type { Source } from "@/lib/vault/types";
import { safeUrl } from "@/lib/study/reader";

export const isBook = (source: Source) => /^(PDF|EPUB)$/i.test(source.format);
export function coverFor(source: Source) {
  return source.coverImage &&
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
      source.coverImage,
    )
    ? source.coverImage
    : safeUrl(source.coverUrl);
}
/** Original, code-native cover ornament. Titles remain selectable DOM text. */
function CoverArtwork() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="cover-engraving" viewBox="0 0 240 190" aria-hidden="true">
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".7" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".06" />
        </linearGradient>
      </defs>
      <circle
        cx="120"
        cy="78"
        r="53"
        fill="none"
        stroke="currentColor"
        strokeWidth=".7"
      />
      <circle
        cx="120"
        cy="78"
        r="61"
        fill="none"
        stroke="currentColor"
        strokeWidth=".3"
      />
      <path
        d="M18 164 57 113 83 137 126 84 177 144 200 119 236 165Z"
        fill={`url(#${id})`}
      />
      <g fill="none" stroke="currentColor" strokeWidth=".65">
        <path d="M24 174Q65 136 107 166T225 169M39 181Q95 160 140 179T219 180M120 144V43M120 118Q72 101 84 69Q112 75 120 118M120 101Q153 89 156 58Q125 61 120 101M120 77Q97 60 110 36Q128 46 120 77" />
        <path d="m117 144 3-18 4 18M64 164v-39m-9 16 9-16 10 16m-17 9 7-13 10 13M181 161v-36m-9 14 9-14 9 14m-18 9 9-15 10 15" />
      </g>
      <circle cx="120" cy="22" r="2" fill="currentColor" />
    </svg>
  );
}
export function BookVolume({
  source,
  spine = false,
}: {
  source: Source;
  spine?: boolean;
}) {
  const cover = coverFor(source);
  const style = {
    "--binding": source.spineColor,
    "--foil": source.spineTextColor,
    "--volume-height": `${source.spineHeight + 66}px`,
    "--spine-width": `${Math.max(52, source.spineWidth + 24)}px`,
  } as CSSProperties;
  return (
    <span
      className={`book-volume ${spine ? "volume-spine" : "volume-front"}`}
      style={style}
      aria-hidden="true"
    >
      <span className="volume-pages" />
      <span className="volume-back" />
      <span className="volume-binding">
        <i className="binding-band band-top" />
        <span className="binding-emblem">❧</span>
        <strong>{source.title}</strong>
        <small>{source.author.split(",")[0].split(" ").at(-1)}</small>
        <i className="binding-band band-bottom" />
      </span>
      <span className={`volume-face ${cover ? "has-cover" : ""}`}>
        {cover ? (
          <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <>
            <small className="cover-series">LEARNOS · {source.format}</small>
            <strong
              className="cover-title"
              style={{
                fontSize:
                  source.title.length > 65
                    ? 19
                    : source.title.length > 35
                      ? 23
                      : 30,
              }}
            >
              {source.title}
            </strong>
            <CoverArtwork />
            <span className="cover-author">{source.author}</span>
          </>
        )}
        <span className="cover-hinge" />
      </span>
    </span>
  );
}
export function DocumentObject({ source }: { source: Source }) {
  const media = /^(Vídeo|Áudio)$/i.test(source.format);
  const Icon =
    source.format === "Vídeo"
      ? Play
      : source.format === "Áudio"
        ? Headphones
        : FileText;
  return (
    <span
      className={`document-object ${media ? "media-object" : ""}`}
      style={{ "--binding": source.spineColor } as CSSProperties}
      aria-hidden="true"
    >
      <span className="document-sheet sheet-back" />
      <span className="document-sheet sheet-mid" />
      <span className="document-face">
        <span className="document-fold" />
        <small>
          <Icon size={14} />
          {source.format}
        </small>
        <strong>{source.title}</strong>
        <span className="document-preview-lines">
          {source.paragraphs
            .find((p) => p.kind !== "heading")
            ?.text.slice(0, 175) || "Um espaço para explorar suas ideias."}
        </span>
        {media ? (
          <span className="media-wave">
            {Array.from({ length: 23 }, (_, i) => (
              <i key={i} style={{ height: 8 + ((i * 17) % 37) }} />
            ))}
          </span>
        ) : (
          <span className="document-rule-lines" />
        )}
        <span className="document-byline">
          {source.author}
          <ArrowUpRight size={14} />
        </span>
      </span>
    </span>
  );
}
export function SourceObject({
  source,
  spine = false,
}: {
  source: Source;
  spine?: boolean;
}) {
  return isBook(source) ? (
    <BookVolume source={source} spine={spine} />
  ) : (
    <DocumentObject source={source} />
  );
}
export function FolderObject({
  title,
  count,
  sources,
}: {
  title: string;
  count: number;
  sources: Source[];
}) {
  return (
    <span className="folder-object" aria-hidden="true">
      <span className="folder-rear" />
      <span className="folder-paper paper-one">
        <i />
        {sources[0]?.title}
      </span>
      <span className="folder-paper paper-two">
        <i />
        {sources[1]?.title ?? "Suas conexões"}
      </span>
      <span className="folder-face">
        <span className="folder-label">
          <strong>{title}</strong>
          <small>
            {count} {count === 1 ? "material" : "materiais"}
          </small>
        </span>
        <span className="folder-dots">
          {sources.slice(0, 4).map((s) => (
            <i key={s.id} style={{ background: s.spineColor }} />
          ))}
        </span>
        <ArrowUpRight size={18} />
      </span>
    </span>
  );
}
