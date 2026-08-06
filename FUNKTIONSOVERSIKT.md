# Hadj Omra Resor — Funktionsöversikt

> En sammanställning av vad plattformen kan idag. Avsedd att presentera för
> resebyrån. Allt nedan är byggt och i drift på **https://hajj.karimkhalil.se**.
>
> Plattformen är en komplett webblösning i tre delar: **publik webbplats**,
> **bokning online för kunden**, och ett **backoffice/admin** där kontoret sköter
> hela verksamheten. Den ersätter gamla hajj.se och körs på byråns egen server.

---

## 1. Publik webbplats

En modern, svensk och förtroendeingivande sajt — byggd för att besökaren ska
känna trygghet och enkelt ta nästa steg.

- **Startsida** med tydlig presentation och ett **offertformulär** direkt på sidan —
  intresseanmälningar landar automatiskt i kontorets system (inget tappas bort i mejlkorgen).
- **Resesidor:** Omra, Hajj 2027, Visumservice och Hadj Badal — var och en med eget innehåll.
- **Paketsidor** som visar pris, datum, hotellnätter i Mekka/Medina och rumstyper.
- **Förberedelseguide** (packlista, ritualer, vanliga frågor), **Om oss** och **Kontakt**.
- **Interaktiv demo** av hela bokningsflödet — så en besökare kan se hur det fungerar.
- **Juridiska sidor:** Allmänna villkor, Integritetspolicy, Cookies, Tillgänglighet.
- **Sökmotoroptimerad:** korrekt sidinformation, strukturerad data för Google, sajtkarta.
- **Mobilanpassad och tillgänglig** (fungerar på telefon, surfplatta och dator).

---

## 2. Bokning online — kunden bokar själv

Ett guidat flöde i tydliga steg, från val av paket till bekräftad plats.

1. **Välj paket** och starta en bokning.
2. **Antal resenärer** per pris- och ålderskategori (vuxen / barn / spädbarn) samt **avreseort**.
3. **Resenärsuppgifter** — fylls i per person, med **pass-skanning (OCR)** som läser av
   passet och fyller i namn, passnummer, födelsedatum, nationalitet och giltighetstid automatiskt.
4. **Granska & godkänn villkor.**
5. **Betala anmälningsavgift** (5 000 kr/person som bekräftar platsen).
6. **Klart** — bekräftelsesteg.

**Inbyggd trygghet i flödet:**
- **Barn- och spädbarnspriser** hanteras korrekt per rumstyp.
- Man kan inte hoppa över steg eller registrera fler resenärer än man bokat.
- **Dubbelbetalningsspärr** och belopp som beräknas på servern (kan inte manipuleras).

---

## 3. Kundportal — "Min sida"

Inloggat läge där kunden följer sin resa.

- **Översikt** över sina bokningar.
- **Mina bokningar** med detaljvy.
- **Dokument** kopplade till resan.
- **Meddelanden** från kontoret.
- **Konto:** skapa konto och logga in med e-post och lösenord (säker lösenordshantering).

---

## 4. Backoffice / admin — kontorets verktyg

Hela verksamheten styrs från en samlad adminpanel, byggd utifrån kontorets
arbetssätt (reseledarens perspektiv).

- **Dashboard** med en **kanban-pipeline** över alla bokningar (mottagen → granskas →
  bekräftad → betald → genomförd) plus nyckeltal (bokningar, leads, resenärer, intäkter).
- **Bokningar** — lista och en komplett **ärendevy** per bokning:
  - Flikar: Översikt · Resenärer · Betalningar · Meddelanden (med interna anteckningar).
  - Statuspipeline och "markera betald".
  - Lägg till/redigera resenärer direkt.
- **Leads / intresseanmälningar** från offertformuläret.
- **Resor & paket** — skapa och redigera paket med prisklasser (rumstyp × ålder), datum,
  hotellnätter och avreseorter.
- **Resegrupper** — operativ vy per resa: alla resenärer, rumsfördelning och betalningsläge.
- **Resenärer** — sökbar lista över samtliga registrerade resenärer.
- **Betalningar** — statistik och grafer, jämförelse mellan resor och år för år.
- **Mejl** — mallar med variabler ({{namn}}, {{paket}} m.m.) och bulkutskick till en
  vald resa/målgrupp. *(Utskicken förbereds och köas i systemet; själva e-postleveransen
  aktiveras i nästa steg — se planen i ROADMAP.)*
- **Excel-import** — läs in befintliga resenärslistor med automatisk kolumnmappning;
  ålderskategori räknas ut från födelsedatum.
- **Roller:** administratör, personal och kund — med rätt behörighet för varje.

---

## 5. Pass-skanning (OCR) & resenärsregister

- **Läser passets maskinläsbara zon (MRZ)** och fyller i resenärens uppgifter automatiskt.
- **Stöder pass från hela världen** — landskoden översätts till svenskt landsnamn för
  i stort sett alla länder (inte bara svenska pass).
- **Tål dålig bildkvalitet:** vanliga avläsningsfel i siffror rättas automatiskt, så ett
  enstaka feltecken inte gör att hela passet måste fyllas i för hand.
- **Korrekt datumtolkning** (skiljer på födelsedatum och passets giltighetstid).
- Fullständigt **personregister** per resenär: namn, kontakt, adress, personnummer,
  passuppgifter, födelseuppgifter, nationalitet, civilstånd, rum och flyg.

---

## 6. Betalningar

- **Anmälningsavgift online** (5 000 kr/person) via **Stripe** kortbetalning.
- Stöd även för **Swish, Klarna, bankgiro och faktura** som betalsätt.
- Kontoret kan **markera betalningar** som mottagna och följa hela betalningsläget per resa.
- Säker hantering: belopp beräknas på servern och betalningar registreras spårbart.

---

## 7. Dokumenthantering (nytt)

Kontoret kan nu hantera resedokument direkt i systemet.

- **Ladda upp dokument per resenär** i bokningsvyn: pass, passfoto, uppehållstillstånd m.m.
- **Granska och statussätt** varje dokument (väntar / godkänd / avvisad / komplettering).
- **Ta bort** dokument vid behov.
- **Säker åtkomst:** dokumenten (känsliga personuppgifter) kan bara öppnas av inloggad
  personal — de ligger aldrig på en öppen, gissningsbar adress.

---

## 8. Kommunikation

- **Meddelanden** mellan kontor och kund kopplade till bokningen.
- **Interna anteckningar** för personalen som **aldrig** visas för kunden.
- **Mejlmallar** och **bulkutskick** förbereds i systemet (leverans aktiveras i nästa steg).

---

## 9. Säkerhet & dataskydd

- **Säker inloggning** med stark lösenordskryptering.
- **Behörighetsstyrning** — bara personal kommer åt admin och känsliga uppgifter.
- **Interna anteckningar läcker inte** till kunder.
- **Bokningsintegritet:** steg-skydd och dubbelbetalningsspärr.
- **Resedokument med personuppgifter** serveras enbart via skyddad, inloggad åtkomst.
- **Juridiska sidor** på plats (villkor, integritet, cookies, tillgänglighet).
- All trafik via **krypterad anslutning (HTTPS)**.

---

## 10. Teknik, drift & hosting

- Körs på **byråns egen server** (Hetzner, i Tyskland/EU) — egen data, full kontroll.
- **Egen domän** med automatiskt förnyat HTTPS-certifikat.
- **Automatisk driftsättning:** nya förbättringar byggs och läggs ut automatiskt.
- **Databasen** (PostgreSQL) och appen körs i en stabil, övervakad miljö med hälsokontroll.
- Modern teknik (Next.js) — snabb, sökmotorvänlig och framtidssäker.

---

## 11. Nästa steg

En komplett, prioriterad plan för att ta plattformen hela vägen till en
"helhetslösning fullt klart" finns i **`ROADMAP.md`**. I korthet (det viktigaste först):

- **Aktivera e-postutskick** (bekräftelser, påminnelser, kvitton skickas automatiskt).
- **Slutbetalning online** (resterande belopp, inte bara anmälningsavgiften).
- **Automatiska säkerhetskopior** av databasen.
- **Flerspråkighet** (svenska / engelska / arabiska).
- **Kundens digitala resväska**, visumstatus och fler självbetjäningsfunktioner.
- **Bokföringskoppling** (Fortnox) och fler operativa verktyg för kontoret.

> Plattformen är redan i drift och hanterar bokningar, resenärer, betalningar och
> dokument. Nästa steg gör flödet ännu mer automatiserat — så kontoret lägger mindre
> tid på handpåläggning och mer på resenärerna.
