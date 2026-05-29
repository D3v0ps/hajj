import { headers } from "next/headers";
import { getLocale, LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { setLocale } from "@/app/actions/locale";

export async function LocaleSwitcher() {
  const locale = await getLocale();
  const h = await headers();
  // x-pathname sätts av middleware så vi kan posta tillbaka till samma sida efter byte.
  const next = h.get("x-pathname") || "/";
  return (
    <form action={setLocale} className="loc-sw" aria-label="Välj språk">
      <input type="hidden" name="next" value={next} />
      <select
        name="locale"
        defaultValue={locale}
        onChange={undefined}
        aria-label="Språk"
        // Server component, ingen onChange — autoSubmit görs av en JS-lös fallback-knapp.
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
        ))}
      </select>
      <button type="submit" className="loc-go" aria-label="Byt språk">→</button>
      <style>{`
        .loc-sw { display: inline-flex; align-items: center; gap: 4px; }
        .loc-sw select {
          padding: 5px 8px; border: 1px solid var(--c-line); background: #fff;
          font-size: 12px; font-family: var(--f-sans);
        }
        .loc-go {
          padding: 5px 8px; border: 1px solid var(--c-line); background: #fff;
          font-size: 12px; cursor: pointer;
        }
        .loc-go:hover { border-color: var(--c-ink); }
      `}</style>
    </form>
  );
}
