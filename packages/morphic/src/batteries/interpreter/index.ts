import { Create, Validated } from "../../model/create"

import { Array } from "@matechs/core/Array"
import type * as T from "@matechs/core/Effect"
import { Type } from "@matechs/core/Model"

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
  build: (a: A) => A
  type: Type<A, E, unknown>
  create: Create<A>
  encode: (a: A) => T.Sync<E>
  decode: (i: unknown) => T.SyncE<ValidationErrors, A>
  validate: (a: A) => T.SyncE<ValidationErrors, Validated<A>>
}

declare module "../usage/interpreter-result" {
  interface InterpreterResult<E, A> {
    [InterpreterURI]: Interpreter<E, A>
  }
}
