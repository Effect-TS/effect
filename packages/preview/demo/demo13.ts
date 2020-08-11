import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as R from "../src/Record"

pipe(
  { a: "a", b: "b" },
  R.foreachF(T.Applicative)((s) => T.effectTotal(() => `(${s})`)),
  T.chain((r) =>
    T.effectTotal(() => {
      console.log(r)
    })
  ),
  T.runMain
)
