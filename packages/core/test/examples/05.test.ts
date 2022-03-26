import { pipe } from "@effect-ts/system/Function"

import * as R from "../../src/Collections/Immutable/Dictionary/index.js"
import * as T from "../../src/Collections/Immutable/Tuple/index.js"
import * as E from "../../src/Either/index.js"
import * as X from "../../src/XPure/XIO/index.js"

test("05", () => {
  const result: T.Tuple<[R.Dictionary<number>, R.Dictionary<number>]> = pipe(
    { a: 0, b: 1, c: 2, d: 3 },
    R.separateF(X.Applicative)((n) => X.succeed(n < 2 ? E.left(n) : E.right(n))),
    X.run
  )

  expect(result).toEqual(T.tuple({ a: 0, b: 1 }, { c: 2, d: 3 }))
})
