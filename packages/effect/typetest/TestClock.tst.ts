import type { Effect, Scope } from "effect"
import { TestClock } from "effect/testing"
import { describe, expect, it } from "tstyche"

describe("TestClock", () => {
  it("make succeeds with a TestClock", () => {
    expect(TestClock.make()).type.toBe<Effect.Effect<TestClock.TestClock, never, Scope.Scope>>()
  })
})
