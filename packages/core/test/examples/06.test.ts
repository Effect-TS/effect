import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative"
import * as R from "../../src/Collections/Immutable/Dictionary"
import * as E from "../../src/Either"

test("06", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `${l} | ${r}`)
  )

  const traverse = R.forEachWithIndexF(ValidationApplicative)

  const result = pipe(
    { a: 0, b: 1, c: 2, d: 4, e: 5, g: 6 },
    traverse((k, n) => (n > 3 && k !== "c" ? E.left(`bad: ${k}`) : E.right("good")))
  )

  console.log(result)
})
