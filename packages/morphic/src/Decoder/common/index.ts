import type * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Sync"

export interface DecodingError {
  readonly id?: string
  readonly name?: string
  readonly actual?: unknown
  readonly message?: string
}

export type ValidationError = A.Array<DecodingError>

export const fail = (e: ValidationError) => T.fail(new DecodeError(e))

export class DecodeError {
  readonly _tag = "DecodeError"
  constructor(readonly errors: ValidationError) {}
}

export interface Decoder<A> {
  decode: (u: unknown) => T.Sync<unknown, DecodeError, A>
}

export function report(e: DecodeError) {
  return e.errors
    .map((e) => e.message)
    .filter((e) => e && e.length > 0)
    .join(",")
}
