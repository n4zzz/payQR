export const RM = (n: number) => `RM ${n.toFixed(2)}`;

export const round2 = (n: number) => Math.round(n * 100) / 100;

// Service charge applies to the subtotal; SST applies to (subtotal + service).
export function computeTotals(subtotal: number, servicePct: number, sstPct: number) {
  const service = subtotal * (servicePct / 100);
  const sst = (subtotal + service) * (sstPct / 100);
  const total = subtotal + service + sst;
  return { service, sst, total };
}

// total = subtotal × (1+service%) × (1+SST%). Since both charges are
// proportional, each person's amount = their items × this factor.
export function taxFactor(servicePct: number, sstPct: number) {
  return (1 + servicePct / 100) * (1 + sstPct / 100);
}

// Even split across N diners (incl. host). Host's share is "covered".
export function perHead(total: number, headcount: number) {
  return headcount > 0 ? total / headcount : 0;
}

// Build the share rows for an even split. The host's row is "covered" and the
// rounding remainder is absorbed into it so the amounts sum to exactly `total`.
export function buildEvenShares(total: number, hostName: string, friendNames: string[]) {
  const headcount = friendNames.length + 1;
  const per = round2(total / headcount);
  const hostAmount = round2(total - per * friendNames.length);
  return {
    headcount,
    per,
    shares: [
      { name: hostName, amount: hostAmount, state: "host" as const },
      ...friendNames.map((name) => ({ name, amount: per, state: "unpaid" as const })),
    ],
  };
}
