import { pipe } from "fp-ts/lib/function";
import * as D from "io-ts/lib/Decoder";

interface NonEmptyWhitespaceFreeStringBrand {
  readonly NonEmptyWhitespaceFreeString: unique symbol;
}
type NonEmptyWhitespaceFreeString = string & NonEmptyWhitespaceFreeStringBrand;
export const nonEmptyWhitespaceFreeString: D.Decoder<
  unknown,
  NonEmptyWhitespaceFreeString
> = pipe(
  D.string,
  D.refine(
    (s): s is NonEmptyWhitespaceFreeString => s.length > 0 && !/\s/.test(s),
    "NonEmptyWhitespaceFreeString"
  )
);

export const lock = pipe(
  D.struct({
    name: nonEmptyWhitespaceFreeString,
    owner: nonEmptyWhitespaceFreeString,
  }),
  // Making message field optional for backward compatibility
  D.intersect(
    D.partial({
      message: D.string,
    })
  )
);

export interface Lock extends D.TypeOf<typeof lock> {}

export interface ExpressError extends Error {
  statusCode?: number;
}
