import { pipe } from "../../src/Function"
import * as E from "../../src/_new/Either"
import * as R from "../../src/_new/Record"

const result = pipe(
  { a: 0, b: 1 },
  R.foreachF(E.Applicative)((n) => E.right(n + 1))
)

console.log(result)
