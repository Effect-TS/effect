import { effect as E } from "@matechs/effect";
import { Env } from "@matechs/effect/lib/utils/types";
import * as P from "./Printer";
import * as C from "./Counter";
import * as T from "../../src";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { withControllerSpan, withTracer } from "../../src";

export const program = withTracer(
  withControllerSpan(
    "demo",
    "demo-main"
  )(
    pipe(
      Do(E.effect)
        .bind("start", C.currentCount())
        .do(C.count())
        .do(C.count())
        .bind("end", C.currentCount())
        .doL(({ start, end }) => P.print(`done - ${start} <-> ${end}`))
        .done(),
      C.counterState
    )
  )
);

export const env: Env<typeof program> = {
  ...P.printer,
  ...C.counter,
  ...T.tracer()
};

export const main = E.run(pipe(program, E.provideAll(env)));
