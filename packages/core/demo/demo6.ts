import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

const prog = pipe(
  [0, 1, 2],
  T.foreachExec(T.sequential)((n) => T.succeedNow(n + 1))
)

pipe(
  prog,
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(ns)
    })
  ),
  T.runMain
)
