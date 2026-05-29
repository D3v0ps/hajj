import Link from "next/link";
import { SITE } from "@/lib/config";
import { getTranslator, localeHref } from "@/lib/i18n";

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const { t, locale } = await getTranslator();
  const lh = (p: string) => localeHref(p, locale);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand-mark-foot" lang="ar" aria-hidden="true">ح</div>
            <div className="brand-name-foot">
              Hadj Omra Resor
              <small>Vallfärd från Sverige sedan 1985</small>
            </div>
            <p className="foot-lede">
              Sveriges äldsta arrangör av Hajj och Omra. Resegaranti hos Kammarkollegiet.
              Personlig service från första samtalet till sista hemkomsten.
            </p>
            <div className="accreditations">
              <span className="accred-chip">Kammarkollegiet</span>
              <span className="accred-chip">SRF</span>
              <span className="accred-chip">IATA</span>
            </div>
          </div>

          <div>
            <h4>{t("nav.omra")} / {t("nav.hajj")}</h4>
            <ul>
              <li><Link href={lh("/omra")}>{t("nav.omra")}</Link></li>
              <li><Link href={lh("/hajj-2027")}>{t("nav.hajj")}</Link></li>
              <li><Link href={lh("/hadj-badal")}>{t("nav.badal")}</Link></li>
              <li><Link href={lh("/visum")}>{t("nav.visa")}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t("nav.prepare")}</h4>
            <ul>
              <li><Link href={lh("/forbered")}>{t("nav.prepare")}</Link></li>
              <li><Link href={lh("/demo")} style={{ color: "var(--c-gold)" }}>Demo →</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t("nav.myPage")}</h4>
            <ul>
              <li><Link href="/min-sida">{t("nav.myPage")}</Link></li>
              <li><Link href="/logga-in">{t("nav.login")}</Link></li>
              <li><Link href="/skapa-konto">{t("nav.createAccount")}</Link></li>
              <li><Link href={lh("/villkor")}>{t("footer.terms")}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t("nav.contact")}</h4>
            <ul>
              <li>Stockholm — {SITE.offices.stockholm.address}</li>
              <li>{SITE.phoneDisplay}</li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><Link href={lh("/kontakt")}>{t("nav.contact")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} {SITE.legalName} · Org.nr {SITE.orgNr} · {t("footer.rights")}</span>
          <div className="legal-links">
            <Link href={lh("/integritet")}>{t("footer.privacy")}</Link>
            <Link href={lh("/cookies")}>{t("footer.cookies")}</Link>
            <Link href={lh("/tillganglighet")}>{t("footer.accessibility")}</Link>
          </div>
        </div>
      </div>

      <style>{`
        .site-footer {
          background: var(--c-ink);
          color: #C3CCD8;
          padding: 80px 0 32px;
          margin-top: 120px;
        }
        .site-footer h4 {
          color: #fff;
          font-family: var(--f-sans);
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 22px;
        }
        .site-footer a { color: #C3CCD8; }
        .site-footer a:hover { color: var(--c-gold); }
        .site-footer ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; font-size: 14px; }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr 1.2fr;
          gap: 48px;
          padding-bottom: 56px;
          border-bottom: 1px solid #1F324F;
        }
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          padding-top: 28px;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: #7E8AA0;
        }
        .legal-links { display: flex; gap: 20px; }
        .accreditations { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 24px; }
        .accred-chip {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #C3CCD8;
          border: 1px solid #2A3F62;
          padding: 8px 14px;
          font-weight: 600;
        }
        .brand-mark-foot {
          width: 44px; height: 44px;
          border: 1px solid var(--c-gold);
          display: grid; place-items: center;
          color: var(--c-gold);
          font-family: var(--f-serif);
          font-size: 24px;
          margin-bottom: 16px;
        }
        .brand-name-foot {
          font-family: var(--f-serif);
          color: #fff;
          font-size: 22px;
          line-height: 1.2;
          margin-bottom: 18px;
        }
        .brand-name-foot small {
          display: block;
          font-family: var(--f-sans);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #7E8AA0;
          margin-top: 6px;
          font-weight: 600;
        }
        .foot-lede {
          font-size: 14px;
          color: #C3CCD8;
          line-height: 1.6;
          max-width: 320px;
        }
        @media (max-width: 900px) {
          .site-footer { padding: 56px 0 24px; margin-top: 64px; }
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; padding-bottom: 40px; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr; gap: 28px; }
          .legal-links { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </footer>
  );
}
