import * as E from "../index";
import * as P from "./Printer";
import * as C from "./Counter";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";

export const module = pipe(
  E.noEnv,
  E.mergeEnv(P.printer),
  E.mergeEnv(C.counter)
);

export const program = E.provide(C.counterState())(
  Do(E.effectMonad)
    .bind("start", C.currentCount())
    .do(C.count())
    .do(C.count())
    .bind("end", C.currentCount())
    .doL(({ start, end }) => P.print(`done - ${start} <-> ${end}`))
    .done()
);

export const main = E.run(pipe(program, E.provide(module)));
