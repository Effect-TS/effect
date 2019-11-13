import * as E from "@matechs/effect";
import * as P from "./Printer";
import * as C from "./Counter";
import * as T from "../../src";

import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { withControllerSpan, withTracer } from "../../src";

export const module = pipe(
  E.noEnv,
  E.mergeEnv(P.printer),
  E.mergeEnv(C.counter),
  E.mergeEnv(T.tracer),
  E.mergeEnv(T.tracerFactoryDummy)
);

export const program = withTracer(
  withControllerSpan(
    "demo",
    "demo-main"
  )(
    E.provide(C.counterState())(
      Do(E.effectMonad)
        .bind("start", C.currentCount())
        .do(C.count())
        .do(C.count())
        .bind("end", C.currentCount())
        .doL(({ start, end }) => P.print(`done - ${start} <-> ${end}`))
        .done()
    )
  )
);

export const main = E.run(pipe(program, E.provide(module)));
