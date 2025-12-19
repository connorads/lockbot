import { parseDuration, formatDuration } from "../src/utils/duration-parser";

describe("parseDuration", () => {
  test("parses seconds", () => {
    expect(parseDuration("30s")).toBe(30);
    expect(parseDuration("1s")).toBe(1);
    expect(parseDuration("60s")).toBe(60);
  });

  test("parses minutes", () => {
    expect(parseDuration("1m")).toBe(60);
    expect(parseDuration("30m")).toBe(1800);
    expect(parseDuration("90m")).toBe(5400);
  });

  test("parses hours", () => {
    expect(parseDuration("1h")).toBe(3600);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("24h")).toBe(86400);
  });

  test("parses days", () => {
    expect(parseDuration("1d")).toBe(86400);
    expect(parseDuration("7d")).toBe(604800);
  });

  test("parses weeks", () => {
    expect(parseDuration("1w")).toBe(604800);
    expect(parseDuration("2w")).toBe(1209600);
  });

  test("handles case insensitivity", () => {
    expect(parseDuration("1H")).toBe(3600);
    expect(parseDuration("30M")).toBe(1800);
    expect(parseDuration("1D")).toBe(86400);
  });

  test("handles whitespace", () => {
    expect(parseDuration("  2h  ")).toBe(7200);
    expect(parseDuration("30m ")).toBe(1800);
  });

  test("handles decimal values", () => {
    expect(parseDuration("1.5h")).toBe(5400);
    expect(parseDuration("0.5d")).toBe(43200);
  });

  test("returns null for invalid input", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("10")).toBeNull();
    expect(parseDuration("h")).toBeNull();
    expect(parseDuration("-1h")).toBeNull();
    expect(parseDuration("1x")).toBeNull();
  });
});

describe("formatDuration", () => {
  test("formats seconds", () => {
    expect(formatDuration(1)).toBe("1 second");
    expect(formatDuration(30)).toBe("30 seconds");
    expect(formatDuration(59)).toBe("59 seconds");
  });

  test("formats minutes", () => {
    expect(formatDuration(60)).toBe("1 minute");
    expect(formatDuration(120)).toBe("2 minutes");
    expect(formatDuration(90)).toBe("1 minute 30 seconds");
  });

  test("formats hours", () => {
    expect(formatDuration(3600)).toBe("1 hour");
    expect(formatDuration(7200)).toBe("2 hours");
    expect(formatDuration(3660)).toBe("1 hour 1 minute");
  });

  test("formats days", () => {
    expect(formatDuration(86400)).toBe("1 day");
    expect(formatDuration(172800)).toBe("2 days");
    expect(formatDuration(90000)).toBe("1 day 1 hour");
  });

  test("formats weeks", () => {
    expect(formatDuration(604800)).toBe("1 week");
    expect(formatDuration(1209600)).toBe("2 weeks");
  });

  test("limits to two significant units", () => {
    // 1 week + 1 day + 1 hour should only show week and day
    expect(formatDuration(604800 + 86400 + 3600)).toBe("1 week 1 day");
  });

  test("handles zero and negative", () => {
    expect(formatDuration(0)).toBe("0 seconds");
    expect(formatDuration(-10)).toBe("0 seconds");
  });
});
