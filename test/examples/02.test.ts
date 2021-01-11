import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Common/Either"
import * as R from "../../src/Common/Record"

test("02", () => {
  const result = pipe(
    { a: 0, b: 1 },
    R.foreachF(E.Applicative)((n) => E.right(n + 1))
  )

  console.log(result)
})
