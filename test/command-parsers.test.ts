import {
  parseUnlock,
  getFirstParam,
  parseLock,
  parseResourceList,
} from "../src/handlers/slack/command-parsers";

describe("parseUnlock", () => {
  test("parses resource name", () => {
    expect(parseUnlock("dev")).toEqual({ resource: "dev", force: false });
    expect(parseUnlock("staging")).toEqual({
      resource: "staging",
      force: false,
    });
  });

  test("parses force option", () => {
    expect(parseUnlock("dev force")).toEqual({ resource: "dev", force: true });
    expect(parseUnlock("staging force")).toEqual({
      resource: "staging",
      force: true,
    });
  });

  test("ignores non-force options", () => {
    expect(parseUnlock("dev other")).toEqual({ resource: "dev", force: false });
  });
});

describe("getFirstParam", () => {
  test("gets first parameter", () => {
    expect(getFirstParam("dev")).toBe("dev");
    expect(getFirstParam("dev staging")).toBe("dev");
    expect(getFirstParam("")).toBe("");
  });
});

describe("parseLock", () => {
  test("parses resource name only", () => {
    expect(parseLock("dev")).toEqual({ resource: "dev", expiry: undefined });
    expect(parseLock("staging")).toEqual({
      resource: "staging",
      expiry: undefined,
    });
  });

  test("parses resource with --expiry flag", () => {
    expect(parseLock("dev --expiry 2h")).toEqual({
      resource: "dev",
      expiry: "2h",
    });
    expect(parseLock("staging --expiry 30m")).toEqual({
      resource: "staging",
      expiry: "30m",
    });
  });

  test("parses resource with -e shorthand", () => {
    expect(parseLock("dev -e 1d")).toEqual({ resource: "dev", expiry: "1d" });
  });

  test("parses resource with --expires alias", () => {
    expect(parseLock("dev --expires 4h")).toEqual({
      resource: "dev",
      expiry: "4h",
    });
  });

  test("handles extra whitespace", () => {
    expect(parseLock("  dev   --expiry   2h  ")).toEqual({
      resource: "dev",
      expiry: "2h",
    });
  });

  test("handles missing expiry value", () => {
    expect(parseLock("dev --expiry")).toEqual({
      resource: "dev",
      expiry: undefined,
    });
  });

  test("handles empty input", () => {
    expect(parseLock("")).toEqual({ resource: "", expiry: undefined });
    expect(parseLock("   ")).toEqual({ resource: "", expiry: undefined });
  });
});

describe("parseResourceList", () => {
  test("parses single resource", () => {
    expect(parseResourceList("dev")).toEqual(["dev"]);
  });

  test("parses multiple resources", () => {
    expect(parseResourceList("dev staging prod")).toEqual([
      "dev",
      "staging",
      "prod",
    ]);
  });

  test("handles extra whitespace", () => {
    expect(parseResourceList("  dev   staging  ")).toEqual(["dev", "staging"]);
  });

  test("handles empty input", () => {
    expect(parseResourceList("")).toEqual([]);
    expect(parseResourceList("   ")).toEqual([]);
  });
});
