import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

const log = <A extends unknown[]>(...x: A): T.Sync<void> =>
  T.effectTotal(() => console.log(...x))

pipe(
  log("before main"),
  T.zipSecond(
    T.effectAsync((next) => {
      const t = setTimeout(() => next(T.succeedNow(undefined)), 0)
      t.unref()
    })
  ),
  T.zipSecond(log("after main")),
  T.runPromiseExit,
  (p) => p.then(console.log)
)
