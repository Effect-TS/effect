import * as A from "../src/Array"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

pipe(
  A.range(0, 10),
  A.foreachF(T.Applicative)((n) => T.succeed(n + 1)),
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(ns)
    })
  ),
  (x) => T.runMain(x)
)
