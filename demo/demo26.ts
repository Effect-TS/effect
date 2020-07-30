import { pipe, tuple } from "../src/Function"
import * as Map from "../src/Map"
import * as T from "../src/next/Effect"
import * as M from "../src/next/Managed"

pipe(
  Map.make([
    [0, "a"],
    [1, "b"],
    [2, "c"]
  ]),
  M.foreach(([n, s]) => M.succeedNow(tuple(n + 1, `(${s})`))),
  M.map(Map.make),
  M.use((x) =>
    T.effectTotal(() => {
      console.log(x)
    })
  ),
  T.runMain
)
