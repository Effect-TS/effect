import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as R from "../src/next/RefM"

pipe(
  T.of,
  T.bind("ref", () => R.makeRefM(1)),
  T.bind("n", ({ ref }) =>
    pipe(
      ref,
      R.getAndUpdate((n) => T.succeed(n + 1))
    )
  ),
  T.chain(({ n }) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
