import { assert, beforeAll, beforeEach, describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("effectful hooks", () => {
  let initialized = false
  const prepared = new WeakSet<object>()

  beforeAll(() =>
    Effect.sync(() => {
      initialized = true
    })
  )

  beforeEach((ctx) =>
    Effect.sync(() => {
      prepared.add(ctx)
    })
  )

  it("runs an Effect returned by beforeAll", (ctx) => {
    assert.isTrue(initialized)
    assert.isTrue(prepared.has(ctx))
  })

  it("runs an Effect returned by beforeEach", (ctx) => {
    assert.isTrue(prepared.has(ctx))
  })
})
