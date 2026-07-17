import {
  getFirstParam,
  parseUnlock,
} from "../src/handlers/slack/command-parsers";

describe("parseUnlock", () => {
  it("defaults to an empty resource when the command text is undefined", () => {
    expect(parseUnlock(undefined)).toEqual({ resource: "", force: false });
  });
  it("parses a resource without options", () => {
    expect(parseUnlock("dev")).toEqual({ resource: "dev", force: false });
  });
  it("parses the force option", () => {
    expect(parseUnlock("dev force")).toEqual({ resource: "dev", force: true });
  });
  it("ignores options other than force", () => {
    expect(parseUnlock("dev other")).toEqual({ resource: "dev", force: false });
  });
});

describe("getFirstParam", () => {
  it("returns an empty string when the command text is undefined", () => {
    expect(getFirstParam(undefined)).toBe("");
  });
  it("returns an empty string for empty command text", () => {
    expect(getFirstParam("")).toBe("");
  });
  it("returns only the first parameter", () => {
    expect(getFirstParam("dev 2")).toBe("dev");
  });
});
