import * as T from "../../src/Effect/index.js"
import { pipe } from "../../src/Function/index.js"
import * as As from "../../src/Testing/Assertion/index.js"
import * as Ba from "../../src/Testing/BoolAlgebra/index.js"
import { assert, suite, test, testM } from "../../src/Testing/index.js"
import * as Tr from "../../src/Testing/TestRunner/index.js"

export const emptyString = test("empty string")(() =>
  pipe(
    assert("")(As.isEmptyString),
    Ba.and(assert("")(As.isEmptyString)),
    Ba.and(assert("")(As.isEmptyString))
  )
)

export const emptyStringM = testM("empty string")(() =>
  T.gen(function* (_) {
    const s = yield* _(T.succeed(""))

    const isEmpty1 = assert(s)(As.isEmptyString)
    const isEmpty2 = assert(s)(As.isEmptyString)

    return isEmpty1["&&"](isEmpty2)
  })
)

export const empty = suite("empty strings")(emptyString, emptyStringM)

it("run suite", () =>
  pipe(
    Tr.defaultTestRunner.run(empty),
    T.provideLayer(Tr.defaultTestRunner.bootstrap),
    T.runPromise
  ))
