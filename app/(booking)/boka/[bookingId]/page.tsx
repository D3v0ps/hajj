import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProgressNav } from "@/components/booking/ProgressNav";
import { StepRoom } from "./StepRoom";
import { StepTravelers } from "./StepTravelers";
import { StepReview } from "./StepReview";
import { StepPay } from "./StepPay";
import { StepDone } from "./StepDone";

type Params = Promise<{ bookingId: string }>;
type SearchParams = Promise<{ error?: string; paid?: string; cancelled?: string }>;

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { bookingId } = await params;
  const { error, paid, cancelled } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/logga-in?next=${encodeURIComponent(`/boka/${bookingId}`)}`);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      package: { include: { tiers: { orderBy: { pricePerPerson: "asc" } } } },
      tier: true,
      travelers: true,
      payments: true,
    },
  });

  if (!booking || booking.userId !== session.user.id) notFound();

  // Hämta sparade profiler för snabb-tillägg (bara relevant i steg 3).
  const profiles = booking.step === 3
    ? await prisma.travelerProfile.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isSelf: "desc" }, { firstName: "asc" }],
      })
    : [];

  return (
    <div className="container">
      <div className="bo-grid">
        <ProgressNav currentStep={booking.step} packageTitle={booking.package.title} />

        <section className="bo-content">
          {error && (
            <div role="alert" className="bo-error">
              <strong>Något stämde inte:</strong> {error}
            </div>
          )}
          {paid && (
            <div role="status" className="bo-success">
              <strong>Betalning mottagen.</strong> Tack — din anmälningsavgift är registrerad.
            </div>
          )}
          {cancelled && (
            <div role="status" className="bo-error">
              Betalningen avbröts. Du kan försöka igen nedan.
            </div>
          )}

          {booking.step === 2 && <StepRoom booking={booking} />}
          {booking.step === 3 && <StepTravelers booking={booking} profiles={profiles} />}
          {booking.step === 4 && <StepReview booking={booking} />}
          {booking.step === 5 && <StepPay booking={booking} />}
          {booking.step >= 6 && <StepDone booking={booking} />}
        </section>
      </div>

      <style>{`
        .bo-grid { display: grid; grid-template-columns: 320px 1fr; gap: 48px; }
        .bo-content { background: #fff; border: 1px solid var(--c-line); padding: 48px 56px; min-height: 600px; }
        .bo-error {
          background: #FBE9E2;
          border: 1px solid var(--c-warn);
          color: var(--c-warn);
          padding: 14px 18px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .bo-success {
          background: #E6F1EA;
          border: 1px solid var(--c-green-soft);
          color: var(--c-green);
          padding: 14px 18px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        @media (max-width: 980px) {
          .bo-grid { grid-template-columns: 1fr; gap: 16px; }
          .bo-content { padding: 28px 22px; min-height: 0; }
        }
        @media (max-width: 640px) {
          .bo-content { padding: 22px 18px; }
        }
      `}</style>
    </div>
  );
}
