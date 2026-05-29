import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { saveTierQuantities } from "@/app/actions/bookings";
import { TierSelector, type TierOption } from "./TierSelector";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

export function StepRoom({ booking }: Props) {
  const tiers: TierOption[] = booking.package.tiers.map((t) => ({
    id: t.id,
    name: t.name,
    roomType: t.roomType,
    ageCategory: t.ageCategory,
    ageMin: t.ageMin,
    ageMax: t.ageMax,
    pricePerPerson: t.pricePerPerson,
  }));

  const departCities = booking.package.departCities.length > 0
    ? booking.package.departCities
    : booking.package.departCity ? [booking.package.departCity] : [];

  const defaultQuantities = (booking.tierQuantities as Record<string, number> | null) ?? {};

  return (
    <TierSelector
      tiers={tiers}
      departCities={departCities}
      action={saveTierQuantities.bind(null, booking.id)}
      defaultQuantities={defaultQuantities}
      defaultDeparture={booking.departureCity}
    />
  );
}
