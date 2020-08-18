import * as A from "../../src/_new/Array"
import * as E from "../../src/_new/Either"

import { pipe } from "packages/preview/src/Function"

const traverse = A.foreachF(E.Applicative)

pipe(
  [0, 1, 2],
  traverse((n) => E.right(n + 1)),
  console.log
)
