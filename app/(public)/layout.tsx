import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FloatingContact } from "@/components/site/FloatingContact";
import { SITE } from "@/lib/config";

// Telefonnummer för flytande kontaktknapp. När byrån har ett riktigt
// nummer satts det via env (SITE_PHONE / SITE_PHONE_DISPLAY) och plockas
// upp via lib/config.ts. Fallback nedan är en placeholder så designen
// fungerar redan innan numret är spikat — TODO: ersätt med riktigt nummer.
const FALLBACK_PHONE_E164 = "+46700000000"; // TODO: ersätt med byråns riktiga nummer
const FALLBACK_PHONE_DISPLAY = "+46 70 000 00 00"; // TODO: ersätt med byråns riktiga nummer

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // SITE.phone har en default ("+46 8 000 00 00") när env saknas. Använd den
  // bara om den faktiskt är konfigurerad via env (vill ha mobilnr för WhatsApp).
  const hasRealPhone = !!process.env.SITE_PHONE;
  const phoneE164 = hasRealPhone ? SITE.phone : FALLBACK_PHONE_E164;
  const phoneDisplay = hasRealPhone ? SITE.phoneDisplay : FALLBACK_PHONE_DISPLAY;

  return (
    <>
      <a href="#main" className="skip-link">Hoppa till innehåll</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <FloatingContact phoneE164={phoneE164} phoneDisplay={phoneDisplay} />
    </>
  );
}
