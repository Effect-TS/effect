import * as T from "../src/EffectAsync"
import { pipe } from "../src/Function"
import * as R from "../src/Record"

pipe(
  { a: "a", b: "b" },
  R.foreachF(T.ApplicativePar)((s) => T.effectTotal(() => `(${s})`)),
  T.chain((r) =>
    T.effectTotal(() => {
      console.log(r)
    })
  ),
  (x) => T.runMain(x)
)
