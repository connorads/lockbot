/**
 * Parse duration strings like "30m", "2h", "1d" into seconds.
 * Returns null if the input is invalid.
 */
export function parseDuration(input: string): number | null {
  if (!input) {
    return null;
  }

  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*([smhdw])$/i);
  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    return null;
  }

  return Math.floor(value * multiplier);
}

/**
 * Format seconds into a human-readable duration string.
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "0 seconds";
  }

  const units: Array<{ name: string; seconds: number }> = [
    { name: "week", seconds: 604800 },
    { name: "day", seconds: 86400 },
    { name: "hour", seconds: 3600 },
    { name: "minute", seconds: 60 },
    { name: "second", seconds: 1 },
  ];

  const result = units.reduce(
    (acc, unit) => {
      if (acc.parts.length >= 2) {
        return acc;
      }
      if (acc.remaining >= unit.seconds) {
        const count = Math.floor(acc.remaining / unit.seconds);
        return {
          remaining: acc.remaining % unit.seconds,
          parts: [
            ...acc.parts,
            `${count} ${unit.name}${count !== 1 ? "s" : ""}`,
          ],
        };
      }
      return acc;
    },
    { remaining: seconds, parts: [] as string[] },
  );

  return result.parts.join(" ");
}
