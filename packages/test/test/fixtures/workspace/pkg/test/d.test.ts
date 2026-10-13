import * as Effect from "effect/Effect"
import * as Assert from "../../../../../src/Assert.ts"
import * as Test from "../../../../../src/Test.ts"
import { both, record } from "../../shared.ts"

export default Test.suite("d", [
  Test.test(
    "records",
    Effect.gen(function*() {
      yield* record("d")
      Assert.isTrue(true)
    })
  )
]).pipe(Test.provide(both))
