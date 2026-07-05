// Anchors the usage/quota cycle to the subscription's actual start date
// (real payment date, once billing.service.ts's checkout webhook sets it)
// instead of the calendar month — a user who upgrades on the 15th should see
// their quota reset on the 15th of each following month, not on the 1st.
//
// Mirrored in backend/apps/api/src/common/billing-period.util.ts —
// duplicated per-app rather than shared, following the existing convention
// (see BOOKSHELF_SLUGS in ai-features.ts) since api/worker don't share code.

// Date.UTC(y, m, anchorDay) rolls over into the next month when anchorDay
// exceeds that month's length (e.g. anchor day 31 in February) — clamp to
// the target month's actual last day so a Jan-31 subscriber resets on Feb 28
// instead of silently landing on Mar 3.
function clampedUtcDate(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth)));
}

export function currentBillingPeriod(startedAt: Date, now: Date = new Date()): string {
  const anchorDay = startedAt.getUTCDate();

  // Start with the anchor day in the current month, then step back a month
  // if that anchor hasn't happened yet this month.
  let cycleStart = clampedUtcDate(now.getUTCFullYear(), now.getUTCMonth(), anchorDay);
  if (cycleStart > now) {
    cycleStart = clampedUtcDate(now.getUTCFullYear(), now.getUTCMonth() - 1, anchorDay);
  }

  return cycleStart.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
