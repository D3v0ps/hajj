import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, LOCALES, LOCALE_LABELS, localeHref } from "@/lib/i18n";

export async function LocaleSwitcher() {
  const locale = await getLocale();
  const h = await headers();
  // x-pathname sätts av middleware så vi kan länka till samma sida på annan locale.
  const currentPath = h.get("x-pathname") || "/";
  return (
    <nav className="loc-sw" aria-label="Välj språk">
      {LOCALES.map((l) => {
        // Trimma ev. befintligt locale-prefix innan vi bygger om
        let cleanPath = currentPath;
        for (const x of LOCALES) {
          if (cleanPath === `/${x}` || cleanPath.startsWith(`/${x}/`)) {
            cleanPath = cleanPath.slice(x.length + 1) || "/";
            break;
          }
        }
        const href = localeHref(cleanPath, l);
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            hrefLang={l}
            aria-current={active ? "page" : undefined}
            className={active ? "loc-link active" : "loc-link"}
          >
            {LOCALE_LABELS[l]}
          </Link>
        );
      })}
      <style>{`
        .loc-sw { display: inline-flex; align-items: center; gap: 6px; }
        .loc-link {
          padding: 4px 8px; font-size: 11px; letter-spacing: 0.06em;
          color: var(--c-text-muted); text-transform: uppercase; font-weight: 600;
          border-bottom: 2px solid transparent;
        }
        .loc-link:hover { color: var(--c-ink); }
        .loc-link.active { color: var(--c-ink); border-bottom-color: var(--c-gold); }
      `}</style>
    </nav>
  );
}
