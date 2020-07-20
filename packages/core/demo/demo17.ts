import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as R from "../src/next/Ref"

pipe(
  T.of,
  T.bind("a", () => R.makeRef(1)),
  T.let("b", ({ a }) =>
    pipe(
      a,
      R.contramap((n: number) => n + 1)
    )
  ),
  T.bind("n", ({ b }) =>
    pipe(
      b,
      R.updateAndGet((n) => n + 1)
    )
  ),
  T.chain(({ n }) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
