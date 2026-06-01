import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FloatingContact } from "@/components/site/FloatingContact";
import { SITE } from "@/lib/config";
import { getTranslator, localeHref } from "@/lib/i18n";

// Telefonnummer för flytande kontaktknapp. När byrån har ett riktigt
// nummer satts det via env (SITE_PHONE / SITE_PHONE_DISPLAY) och plockas
// upp via lib/config.ts.
const FALLBACK_PHONE_E164 = "+46700000000";
const FALLBACK_PHONE_DISPLAY = "+46 70 000 00 00";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getTranslator();
  const hasRealPhone = !!process.env.SITE_PHONE;
  const phoneE164 = hasRealPhone ? SITE.phone : FALLBACK_PHONE_E164;
  const phoneDisplay = hasRealPhone ? SITE.phoneDisplay : FALLBACK_PHONE_DISPLAY;

  return (
    <>
      <a href="#main" className="skip-link">{t("nav.home") /* skip-link-text översatt */}</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <FloatingContact
        phoneE164={phoneE164}
        phoneDisplay={phoneDisplay}
        offertHref={`${localeHref("/", locale)}#offert`}
        strings={{
          ariaOpen: t("floating.ariaOpen"),
          ariaClose: t("floating.ariaClose"),
          ariaDialog: t("floating.ariaDialog"),
          eyebrow: t("floating.eyebrow"),
          hours: t("floating.hours"),
          call: t("floating.call"),
          callSub: t("floating.call"),
          whatsapp: t("floating.whatsapp"),
          whatsappSub: t("floating.whatsappSub"),
          quote: t("floating.quote"),
          quoteSub: t("floating.quoteSub"),
        }}
      />
    </>
  );
}
