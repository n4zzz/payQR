export const RM = (n: number) => `RM ${n.toFixed(2)}`;

// Service charge applies to the subtotal; SST applies to (subtotal + service).
export function computeTotals(subtotal: number, servicePct: number, sstPct: number) {
  const service = subtotal * (servicePct / 100);
  const sst = (subtotal + service) * (sstPct / 100);
  const total = subtotal + service + sst;
  return { service, sst, total };
}

// Even split across N diners (incl. host). Host's share is "covered".
export function perHead(total: number, headcount: number) {
  return headcount > 0 ? total / headcount : 0;
}

// Build the share rows for an even split. The host's row is "covered" and the
// rounding remainder is absorbed into it so the amounts sum to exactly `total`.
export function buildEvenShares(
  total: number,
  hostName: string,
  friendNames: string[]
) {
  const headcount = friendNames.length + 1;
  const per = Math.round((total / headcount) * 100) / 100;
  const friends = friendNames.map((name) => ({ name, amount: per }));
  const hostAmount = Math.round((total - per * friendNames.length) * 100) / 100;
  return {
    headcount,
    per,
    shares: [{ name: hostName, amount: hostAmount, state: "host" as const }, ...friends.map((f) => ({ ...f, state: "unpaid" as const }))],
  };
}
