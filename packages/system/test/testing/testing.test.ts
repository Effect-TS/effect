import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import { assert, suite, test, testM } from "../../src/Testing"
import * as As from "../../src/Testing/Assertion"
import * as Ba from "../../src/Testing/BoolAlgebra"
import * as Tr from "../../src/Testing/TestRunner"

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
