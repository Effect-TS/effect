import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Classic/Associative"
import * as E from "../../src/Classic/Either"
import * as R from "../../src/Classic/Record"

test("06", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((r) => (l) => `${l} | ${r}`)
  )

  const traverse = R.foreachWithIndexF(ValidationApplicative)

  const result = pipe(
    { a: 0, b: 1, c: 2, d: 4, e: 5, g: 6 },
    traverse((k, n) => (n > 3 && k !== "c" ? E.left(`bad: ${k}`) : E.right("good")))
  )

  console.log(result)
})
