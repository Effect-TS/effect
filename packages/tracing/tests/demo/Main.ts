import { effect as E, utils as U } from "@matechs/effect";
import * as P from "./Printer";
import * as C from "./Counter";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { withControllerSpan, withTracer, tracer } from "../../src";

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

export const env: U.Env<typeof program> = {
  ...P.printer,
  ...C.counter,
  ...tracer(),
};

export const main = E.run(pipe(program, E.provideAll(env)));
