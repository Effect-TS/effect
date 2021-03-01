import { pipe } from "@effect-ts/system/Function"

import * as R from "../../src/Dictionary"
import * as E from "../../src/Either"

test("02", () => {
  const result = pipe(
    { a: 0, b: 1 },
    R.forEachF(E.Applicative)((n) => E.right(n + 1))
  )

  console.log(result)
})
