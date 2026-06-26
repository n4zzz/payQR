export const LIMITS = {
  sessionTitle: 120,
  shareName: 60,
  itemName: 60,
  methodLabel: 60,
  methodHint: 60,
};

export function tooLong(value: string, max: number): string | null {
  if (value.length > max) return `Must be ${max} characters or fewer.`;
  return null;
}
