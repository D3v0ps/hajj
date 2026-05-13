import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createBooking } from "@/app/actions/bookings";

type Params = Promise<{ packageId: string }>;

export default async function StartBookingPage({ params }: { params: Params }) {
  const { packageId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/logga-in?next=${encodeURIComponent(`/boka/start/${packageId}`)}`);
  }
  await createBooking(packageId);
  return null;
}
