import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

pipe(
  T.delay(100)(T.succeed(1)),
  T.race(T.delay(50)(T.succeed(2))),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
