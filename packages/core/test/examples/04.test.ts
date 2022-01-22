import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative/index.js"
import * as R from "../../src/Collections/Immutable/Dictionary/index.js"
import * as E from "../../src/Either/index.js"

test("04", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `(${l})(${r})`)
  )

  const traverse = R.forEachF(ValidationApplicative)

  const result: E.Either<string, R.Dictionary<number>> = pipe(
    { a: 0, b: 1, c: 2 },
    traverse((n) => (n > 3 ? E.left("bad") : E.right(n)))
  )

  expect(result).toEqual(E.right({ a: 0, b: 1, c: 2 }))
})
