import { T, U, pipe } from "@matechs/prelude";
import * as P from "./Printer";
import * as C from "./Counter";
import { withControllerSpan, withTracer, tracer } from "../../src";

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
        .doL(({ start, end }) => P.print(`done - ${start} <-> ${end}`))
        .done(),
      C.counterState
    )
  )
);

export const env: U.Env<typeof program> = {
  ...P.printer,
  ...C.counter,
  ...tracer()
};

export const main = pipe(program, T.provide(env));
