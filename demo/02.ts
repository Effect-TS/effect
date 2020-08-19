import * as E from "../src/Classic/Either"
import * as R from "../src/Classic/Record"
import { pipe, tuple } from "../src/Function"

const result = pipe(
  { a: 0, b: 1 },
  R.foreachF(E.Applicative)((n) => E.right(n + 1))
)

console.log(result)

pipe(
  { a: 0 },
  R.ReduceWithKey.reduceWithKey(
    [] as readonly (readonly ["a", number])[],
    (k, b, a) => [...b, tuple(k, a)]
  )
)
