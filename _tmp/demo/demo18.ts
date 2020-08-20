import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as O from "../src/Option"
import * as R from "../src/Reader"

pipe(
  A.range(0, 10),
  A.compactF(R.Applicative)((n) =>
    R.access((r: number) => (n > 5 ? O.some(n + r) : O.none))
  ),
  R.runEnv(100),
  (x) => {
    console.log(x)
  }
)
