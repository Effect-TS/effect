import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative"
import * as R from "../../src/Collections/Immutable/Dictionary"
import * as E from "../../src/Either"

test("04", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `(${l})(${r})`)
  )

  const traverse = R.forEachF(ValidationApplicative)

  const result = pipe(
    { a: 0, b: 1, c: 2 },
    traverse((n) => (n > 3 ? E.left("bad") : E.right("good")))
  )

  console.log(result)
})
