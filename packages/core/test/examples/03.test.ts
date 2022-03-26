import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative/index.js"
import * as A from "../../src/Collections/Immutable/Array/index.js"
import * as E from "../../src/Either/index.js"

test("03", () => {
  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `(${l})(${r})`)
  )

  const traverse = A.forEachF(ValidationApplicative)

  const result: E.Either<string, A.Array<number>> = pipe(
    [0, 1, 2, 3],
    traverse((n) => (n > 3 ? E.left("bad") : E.right(n)))
  )

  expect(result).toEqual(E.right([0, 1, 2, 3]))
})
