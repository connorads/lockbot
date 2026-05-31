import {
  parseUnlock,
  getFirstParam,
} from "../src/handlers/slack/command-parsers";

describe("parseUnlock", () => {
  test("parses a resource with no options as not forced", () => {
    expect(parseUnlock("staging")).toEqual({
      resource: "staging",
      force: false,
    });
  });

  test("parses the force option", () => {
    expect(parseUnlock("staging force")).toEqual({
      resource: "staging",
      force: true,
    });
  });

  test("treats an unrecognised second word as not forced", () => {
    expect(parseUnlock("staging please")).toEqual({
      resource: "staging",
      force: false,
    });
  });

  test("only the exact lowercase word 'force' enables force", () => {
    expect(parseUnlock("staging FORCE")).toEqual({
      resource: "staging",
      force: false,
    });
  });

  test("returns an empty resource for empty input", () => {
    expect(parseUnlock("")).toEqual({
      resource: "",
      force: false,
    });
  });
});

describe("getFirstParam", () => {
  test("returns the first space-separated word", () => {
    expect(getFirstParam("staging extra args")).toEqual("staging");
  });

  test("returns the whole string when there is a single word", () => {
    expect(getFirstParam("staging")).toEqual("staging");
  });

  test("returns an empty string for empty input", () => {
    expect(getFirstParam("")).toEqual("");
  });
});
