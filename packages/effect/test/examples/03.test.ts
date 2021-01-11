import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Common/Array"
import { makeAssociative } from "../../src/Common/Associative"
import * as E from "../../src/Common/Either"

test("03", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((r) => (l) => `(${l})(${r})`)
  )

  const traverse = A.foreachF(ValidationApplicative)

  const result = pipe(
    [0, 1, 2, 3],
    traverse((n) => (n > 3 ? E.left("bad") : E.right("good")))
  )

  console.log(result)
})
