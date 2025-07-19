import { describe, it, expect } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
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

  it("tapExit", async () => {
    let exitValue: Exit.Exit<number, TestError1> = Exit.succeed(1)
    Exit.match({
      onFailure: Effect.logError,
      onSuccess: Effect.log
    })

    await pipe(
      Effect.succeed(11),
      Effect.tapExit((exit) =>
        Effect.sync(() => {
          exitValue = exit
        })
      ),
      Effect.runPromise
    )

    expect(exitValue).toEqual(Exit.succeed(11))

    await pipe(
      Effect.fail(new TestError1()),
      Effect.tapExit((exit) =>
        Effect.sync(() => {
          exitValue = exit
        })
      ),
      Effect.ignore,
      Effect.runPromise
    )

    expect(exitValue).toEqual(Exit.fail(new TestError1()))
  })

})
