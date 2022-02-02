import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative"
import * as A from "../../src/Collections/Immutable/Array"
import * as E from "../../src/Either"

test("03", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `(${l})(${r})`)
  )

  const traverse = A.forEachF(ValidationApplicative)

  const result = pipe(
    [0, 1, 2, 3],
    traverse((n) => (n > 3 ? E.left("bad") : E.right("good")))
  )

  console.log(result)
})
