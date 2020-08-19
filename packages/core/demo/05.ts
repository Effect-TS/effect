import * as E from "../src/Classic/Either"
import * as R from "../src/Classic/Record"
import { constant, pipe } from "../src/Function"
import * as X from "../src/Pure"

pipe(
  { a: 0, b: 1, c: 2, d: 3 },
  R.separateF(X.Applicative)((n) =>
    X.succeed(constant(n < 2 ? E.left(n) : E.right(n)))
  ),
  X.chain((r) =>
    X.sync(() => {
      console.log(r)
    })
  ),
  X.runIO
)
