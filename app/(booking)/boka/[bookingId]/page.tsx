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

export default async function BookingPage({ params }: { params: Params }) {
  const { bookingId } = await params;
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

  return (
    <div className="container">
      <div className="bo-grid">
        <ProgressNav currentStep={booking.step} packageTitle={booking.package.title} />

        <section className="bo-content">
          {booking.step === 2 && <StepRoom booking={booking} />}
          {booking.step === 3 && <StepTravelers booking={booking} />}
          {booking.step === 4 && <StepReview booking={booking} />}
          {booking.step === 5 && <StepPay booking={booking} />}
          {booking.step >= 6 && <StepDone booking={booking} />}
        </section>
      </div>

      <style>{`
        .bo-grid { display: grid; grid-template-columns: 320px 1fr; gap: 48px; }
        .bo-content { background: #fff; border: 1px solid var(--c-line); padding: 48px 56px; min-height: 600px; }
        @media (max-width: 980px) {
          .bo-grid { grid-template-columns: 1fr; }
          .bo-content { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
