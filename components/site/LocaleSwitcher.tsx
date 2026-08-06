import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, buildLocaleOptions } from "@/lib/i18n";

/**
 * Språkväljare för headern (desktop). På mobil göms denna och språkvalen
 * visas istället i mobilmenyn (se MobileMenu) för att inte tränga headern.
 */
export async function LocaleSwitcher() {
  const locale = await getLocale();
  const h = await headers();
  const currentPath = h.get("x-pathname") || "/";
  const options = buildLocaleOptions(currentPath, locale);
  return (
    <nav className="loc-sw" aria-label="Välj språk">
      {options.map((o) => (
        <Link
          key={o.code}
          href={o.href}
          hrefLang={o.code}
          aria-current={o.active ? "page" : undefined}
          className={o.active ? "loc-link active" : "loc-link"}
        >
          {o.code.toUpperCase()}
        </Link>
      ))}
      <style>{`
        .loc-sw { display: inline-flex; align-items: center; gap: 2px; }
        .loc-link {
          padding: 4px 7px; font-size: 11px; letter-spacing: 0.06em;
          color: var(--c-text-muted); font-weight: 700;
          border-bottom: 2px solid transparent;
        }
        .loc-link:hover { color: var(--c-ink); }
        .loc-link.active { color: var(--c-ink); border-bottom-color: var(--c-gold); }
      `}</style>
    </nav>
  );
}
