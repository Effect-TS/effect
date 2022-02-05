import { pipe } from "@effect-ts/system/Function"

import * as R from "../../src/Collections/Immutable/Dictionary/index.js"
import * as E from "../../src/Either/index.js"

test("02", () => {
  const result = pipe(
    { a: 0, b: 1 },
    R.forEachF(E.Applicative)((n) => E.right(n + 1))
  )

  console.log(result)
})
