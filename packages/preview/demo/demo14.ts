import * as T from "../src/EffectAsync"
import { pipe } from "../src/Function"
import * as M from "../src/Map"

pipe(
  M.make([
    [1, "1"],
    [2, "2"]
  ]),
  M.foreachWithKeysF(T.ApplicativePar)((s, k) => T.effectTotal(() => `[${k}]: (${s})`)),
  T.chain((r) =>
    T.effectTotal(() => {
      console.log(r)
    })
  ),
  (x) => T.runMain(x)
)
