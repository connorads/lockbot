import { type Either, isLeft, isRight } from "fp-ts/lib/Either";
import * as D from "io-ts/lib/Decoder";
import { lock, nonEmptyWhitespaceFreeString } from "../src/handlers/api/types";

const drawError = (decoded: Either<D.DecodeError, unknown>): string => {
  if (!isLeft(decoded)) {
    throw new Error("Expected decoding to fail");
  }
  return D.draw(decoded.left);
};

describe("nonEmptyWhitespaceFreeString", () => {
  it("accepts a non-empty whitespace-free string", () => {
    const decoded = nonEmptyWhitespaceFreeString.decode("dev");
    expect(isRight(decoded) && decoded.right).toBe("dev");
  });
  it("rejects an empty string", () => {
    expect(drawError(nonEmptyWhitespaceFreeString.decode(""))).toBe(
      'cannot decode "", should be NonEmptyWhitespaceFreeString',
    );
  });
  it("rejects a whitespace-only string", () => {
    expect(drawError(nonEmptyWhitespaceFreeString.decode("   "))).toBe(
      'cannot decode "   ", should be NonEmptyWhitespaceFreeString',
    );
  });
  it("rejects a string containing whitespace", () => {
    expect(drawError(nonEmptyWhitespaceFreeString.decode("dev 1"))).toBe(
      'cannot decode "dev 1", should be NonEmptyWhitespaceFreeString',
    );
  });
});

describe("lock", () => {
  it("accepts a valid lock", () => {
    const decoded = lock.decode({ name: "dev", owner: "U012345MNOP" });
    expect(isRight(decoded) && decoded.right).toEqual({
      name: "dev",
      owner: "U012345MNOP",
    });
  });
  it("rejects a lock with a missing property", () => {
    expect(drawError(lock.decode({ name: "dev" }))).toBe(
      'required property "owner"\n' +
        "└─ cannot decode undefined, should be string",
    );
  });
  it("rejects a lock with an invalid property", () => {
    expect(
      drawError(lock.decode({ name: "dev 1", owner: "U012345MNOP" })),
    ).toBe(
      'required property "name"\n' +
        '└─ cannot decode "dev 1", should be NonEmptyWhitespaceFreeString',
    );
  });
});
