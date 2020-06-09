import type { Errors } from "../../model/codec"

import type { Array } from "@matechs/core/Array"
import type { Branded } from "@matechs/core/Branded"
import type * as T from "@matechs/core/Effect"
import type { Either } from "@matechs/core/Either"

export interface ValidatedBrand {
  readonly validated: unique symbol
}

export type Validated<A> = Branded<A, ValidatedBrand>

export const InterpreterURI = "@matechs/morphic/InterpreterURI" as const

export type InterpreterURI = typeof InterpreterURI

export interface ValidationErrors {
  readonly _tag: "ValidationErrors"
  readonly errors: Array<string>
}

export const validationErrors = (errors: Array<string>): ValidationErrors => ({
  _tag: "ValidationErrors",
  errors
})

interface Interpreter<E, A> {
  // dumb constructor
  build: (a: A) => A
  // smart constructors
  validate: (
    a: A,
    strict?: "strict" | "classic" | "precise"
  ) => Either<Errors, Validated<A>>
  validateM: (
    a: A,
    strict?: "strict" | "classic" | "precise"
  ) => T.SyncE<ValidationErrors, Validated<A>>
  // encoders
  encode: (a: A, strict?: "strict" | "classic") => E
  encodeM: (a: A, strict?: "strict" | "classic") => T.Sync<E>
  // decoders
  decode: (i: unknown, strict?: "strict" | "classic" | "precise") => Either<Errors, A>
  decodeM: (
    i: unknown,
    strict?: "strict" | "classic" | "precise"
  ) => T.SyncE<ValidationErrors, A>
}

declare module "../usage/interpreter-result" {
  interface InterpreterResult<E, A> {
    [InterpreterURI]: Interpreter<E, A>
  }
}
