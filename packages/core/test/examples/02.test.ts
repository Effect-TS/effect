import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Classic/Either"
import * as R from "../../src/Classic/Record"

test("02", () => {
  const result = pipe(
    { a: 0, b: 1 },
    R.foreachF(E.Applicative)((n) => E.right(n + 1))
  )

  console.log(result)
})
