import * as A from "../src/Array"
import * as E from "../src/Either"
import { pipe } from "../src/Function"
import * as R from "../src/Reader"

pipe(
  10,
  A.makeBy((n) => `item: ${n}`),
  A.separateWithKeysF(R.Applicative)((s, k) =>
    R.access((r: number) =>
      k > 5 ? E.left(`s: {${s}} l: ${k + r}`) : E.right(`s: {${s}} r: ${k - r}`)
    )
  ),
  R.runEnv(100),
  (x) => {
    console.log(x)
  }
)
