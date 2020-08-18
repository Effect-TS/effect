import { pipe } from "../../src/Function"
import * as R from "../../src/_new/Record"

const result = pipe(
  { a: 0, b: 1 },
  R.Covariant.map((n) => n + 1)
)

console.log(result)
