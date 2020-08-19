import * as E from "../src/Classic/Either"
import * as R from "../src/Classic/Record"
import { pipe } from "../src/Function"

const result = pipe(
  { a: 0, b: 1 },
  R.foreachF(E.Applicative)((n) => E.right(n + 1))
)

console.log(result)
