import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Common/Associative"
import * as E from "../../src/Common/Either"
import * as R from "../../src/Common/Record"

test("04", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((r) => (l) => `(${l})(${r})`)
  )

  const traverse = R.foreachF(ValidationApplicative)

  const result = pipe(
    { a: 0, b: 1, c: 2 },
    traverse((n) => (n > 3 ? E.left("bad") : E.right("good")))
  )

  console.log(result)
})
