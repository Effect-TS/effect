import * as A from "../src/Array"
import * as E from "../src/Either"
import { pipe } from "../src/Function"
import * as R from "../src/Reader"

pipe(
  A.range(0, 10),
  A.separateF(R.Applicative)((n) =>
    R.access((r: number) => (n > 5 ? E.left(n + r) : E.right(n - r)))
  ),
  R.runEnv(100),
  (x) => {
    console.log(x)
  }
)
