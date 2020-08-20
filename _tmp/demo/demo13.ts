import * as T from "../src/EffectAsync"
import { pipe } from "../src/Function"
import * as R from "../src/Record"

pipe(
  { a: "a", b: "b" },
  R.foreachWithKeysF(T.ApplicativePar)((s, k) => T.effectTotal(() => `[${k}]: (${s})`)),
  T.chain((r) =>
    T.effectTotal(() => {
      console.log(r)
    })
  ),
  (x) => T.runMain(x)
)
