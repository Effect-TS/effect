import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

pipe(
  T.delay(100)(T.succeedNow(1)),
  T.race(T.delay(50)(T.succeedNow(2))),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
