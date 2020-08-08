import { pipe } from "../../src/Function"
import * as R from "../../src/next/Prelude/Reader"

pipe(
  R.of(),
  R.bind("a", () => R.access((n: number) => n)),
  R.bind("b", ({ a }) => R.succeed(a + 2)),
  R.bind("c", ({ b }) => R.succeed(b + 3)),
  R.runEnv(1),
  ({ a, b, c }) => {
    console.log(a, b, c)
  }
)
