import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as R from "../src/next/Ref"

pipe(
  T.of,
  T.bind("ref", () => pipe(R.makeRef(1), T.map(R.contramap((n: number) => n + 1)))),
  T.bind("n", ({ ref }) =>
    pipe(
      ref,
      R.updateAndGet((n) => n + 1)
    )
  ),
  T.bind("s", ({ ref }) =>
    pipe(
      ref,
      R.modify((n) => [`${n + 1}`, n + 1])
    )
  ),
  T.chain(({ n, s }) =>
    T.effectTotal(() => {
      console.log(n)
      console.log(s)
    })
  ),
  T.runMain
)
