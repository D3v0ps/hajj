/**
 * Observability-stub.
 *
 * Idag är detta bara en `console.error`-wrapper. Poängen med att exportera den
 * är att vi får **en stabil insticksplats** för felrapportering — när Sentry
 * (eller motsvarande) kopplas in senare räcker det att uppdatera den här filen,
 * istället för att jaga `console.error`-anrop runt om i koden.
 *
 * Användning:
 *   import { captureError } from "@/lib/observability";
 *   try { ... } catch (err) { captureError(err, { route: "/api/foo" }); throw err; }
 */

export type ErrorContext = Record<string, unknown>;

function safeContext(ctx?: ErrorContext): ErrorContext | undefined {
  if (!ctx) return undefined;
  try {
    // Säkerställ att kontexten kan serialiseras — annars droppa den hellre än
    // att kasta inifrån felhanteraren och dölja det ursprungliga felet.
    JSON.stringify(ctx);
    return ctx;
  } catch {
    return { contextSerializationFailed: true };
  }
}

/**
 * Rapportera ett fel. Idag: `console.error`. I framtiden: Sentry/OpenTelemetry.
 *
 * Designprincip: får **aldrig** kasta. Felhanterare som själva kraschar är värst.
 */
export function captureError(error: unknown, ctx?: ErrorContext): void {
  try {
    const safe = safeContext(ctx);
    if (error instanceof Error) {
      // Sentry-stil: huvudfelobjektet först, kontext som extra-fält.
      console.error("[captureError]", error.message, {
        name: error.name,
        stack: error.stack,
        ...(safe ?? {}),
      });
    } else {
      console.error("[captureError] non-Error thrown:", error, safe ?? {});
    }
  } catch {
    // Sista skyddet — får inte kasta.
  }
}

/**
 * Lägg till breadcrumbs / logga ett informationsmeddelande för spårning.
 * Idag: no-op-ish (`console.info`). När Sentry kopplas in: `addBreadcrumb`.
 */
export function captureMessage(message: string, ctx?: ErrorContext): void {
  try {
    const safe = safeContext(ctx);
    console.info("[captureMessage]", message, safe ?? {});
  } catch {
    // Sista skyddet — får inte kasta.
  }
}
