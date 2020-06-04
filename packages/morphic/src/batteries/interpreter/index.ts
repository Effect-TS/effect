import { Create } from "../../model/create"

import { Type } from "@matechs/core/Model"

export const InterpreterURI = "@matechs/morphic/InterpreterURI" as const

export type InterpreterURI = typeof InterpreterURI

interface Interpreter<E, A> {
  build: (a: A) => A
  type: Type<A, E, unknown>
  create: Create<A>
}

declare module "../usage/interpreter-result" {
  interface InterpreterResult<E, A> {
    [InterpreterURI]: Interpreter<E, A>
  }
}
