const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses a short duration string like "15m", "7d", "30s" into milliseconds. */
export default function ms(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
