import { T, U, pipe } from "@matechs/prelude"

import { withControllerSpan, withTracer, tracer } from "../../src"

import * as C from "./Counter"
import * as P from "./Printer"

export const program = withTracer(
  withControllerSpan(
    "demo",
    "demo-main"
  )(
    pipe(
      T.Do()
        .bind("start", C.currentCount())
        .do(C.count())
        .do(C.count())
        .bind("end", C.currentCount())
        .doL(({ end, start }) => P.print(`done - ${start} <-> ${end}`))
        .done(),
      C.counterState
    )
  )
)

export const env: U.Env<typeof program> = {
  ...P.printer,
  ...C.counter,
  ...tracer()
}

export const main = pipe(program, T.provide(env))
