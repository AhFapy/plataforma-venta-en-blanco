import { Fragment } from "react";

// Convierte en enlaces clicables las URLs que aparecen en un texto libre
// (propuestas, deberes, mensajes, publicaciones…). Sin estado: vale en
// componentes de servidor y de cliente.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING = /[.,;:!?¿¡)\]}»"']+$/;

export function Linkify({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const tail = part.match(TRAILING)?.[0] ?? "";
        const url = tail ? part.slice(0, -tail.length) : part;
        const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative z-10 underline underline-offset-2 break-all hover:opacity-80 ${className}`}
            >
              {url}
            </a>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}
