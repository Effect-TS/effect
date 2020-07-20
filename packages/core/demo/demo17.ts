import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as R from "../src/next/Ref"

pipe(
  R.makeRef(1),
  T.chain(R.updateAndGet((n) => n + 1)),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
