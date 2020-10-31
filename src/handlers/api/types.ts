import { pipe } from "fp-ts/lib/function";
import * as D from "io-ts/lib/Decoder";

interface NonEmptyWhitespaceFreeStringBrand {
  readonly NonEmptyWhitespaceFreeString: unique symbol;
}
type NonEmptyWhitespaceFreeString = string & NonEmptyWhitespaceFreeStringBrand;
export const NonEmptyWhitespaceFreeString: D.Decoder<
  unknown,
  NonEmptyWhitespaceFreeString
> = pipe(
  D.string,
  D.refine(
    (s): s is NonEmptyWhitespaceFreeString => s.length > 0 && !/\s/.test(s),
    "NonEmptyWhitespaceFreeString"
  )
);

export const Lock = D.type({
  name: NonEmptyWhitespaceFreeString,
  owner: NonEmptyWhitespaceFreeString,
});
export interface Lock extends D.TypeOf<typeof Lock> {}

export class ExpressError extends Error {
  statusCode: number;

  message: string;

  error: string | null;

  constructor(statusCode: number, message: string, error?: string) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.error = error || null;
  }
}
