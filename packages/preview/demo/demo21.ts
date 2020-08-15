import * as T from "../src/EffectAsync"
import { pipe } from "../src/Function"
import * as R from "../src/Record"

pipe(
  { a: 0, b: 1 },
  R.foreachF(T.Applicative)((a) => T.effectTotal(() => a)),
  T.chain((r) =>
    T.effectTotal(() => {
      console.log(r)
    })
  ),
  T.runMain
)
