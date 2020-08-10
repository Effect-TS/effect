import * as A from "../src/Array"
import * as T from "../src/Effect"
import * as Async from "../src/EffectAsync"
import { pipe } from "../src/Function"

pipe(
  A.range(0, 10),
  A.foreachF(Async.ApplicativePar)((n) => T.succeed(n + 1)),
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(ns)
    })
  ),
  T.runMain
)
