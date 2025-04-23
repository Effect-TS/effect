import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

class TestError1 {
  readonly _tag = "TestError1"
  constructor() {}
}

class TestError2 {
  readonly _tag = "TestError2"
  constructor() {}
}

describe("Effect", () => {
  it("tapErrorTag", async () => {
    let val = 0

    await pipe(
      Effect.fail<TestError1 | TestError2>(new TestError2()),
      Effect.tapErrorTag("TestError1", () => Effect.sync(() => val += 1)), // not called
      Effect.tapErrorTag("TestError2", () => Effect.sync(() => val += 1)), // called
      Effect.catchAll(() => Effect.succeed("")),
      Effect.runPromise
    )

    strictEqual(val, 1)
  })
})
