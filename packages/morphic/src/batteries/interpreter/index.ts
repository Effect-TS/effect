import { Errors } from "../../model/codec"
import { Validated } from "../../model/create"

import { Array } from "@matechs/core/Array"
import type * as T from "@matechs/core/Effect"
import { Either } from "@matechs/core/Either"

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
  // classic
  create: (a: A, strict?: "strict" | "classic") => Either<Errors, Validated<A>>
  encode: (a: A, strict?: "strict" | "classic") => E
  decode: (i: unknown, strict?: "strict" | "classic") => Either<Errors, A>
  // monadic
  encodeT: (a: A, strict?: "strict" | "classic") => T.Sync<E>
  decodeT: (i: unknown, strict?: "strict" | "classic") => T.SyncE<ValidationErrors, A>
  createT: (
    a: A,
    strict?: "strict" | "classic"
  ) => T.SyncE<ValidationErrors, Validated<A>>
}

declare module "../usage/interpreter-result" {
  interface InterpreterResult<E, A> {
    [InterpreterURI]: Interpreter<E, A>
  }
}
