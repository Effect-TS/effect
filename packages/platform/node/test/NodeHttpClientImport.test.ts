import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { vi } from "vitest"

const state = vi.hoisted(() => ({ imports: 0 }))

vi.mock("undici", () => {
  state.imports++

  class Agent {
    destroy() {
      return Promise.resolve()
    }
  }

  return {
    Agent,
    default: { Agent },
    getGlobalDispatcher: () => new Agent()
  }
})

describe.sequential("Undici loading", () => {
  it("does not load Undici with the NodeHttpClient module", async () => {
    await import("@effect/platform-node/NodeHttpClient")
    assert.strictEqual(state.imports, 0)
  })

  it("does not load Undici with the package root", async () => {
    await import("@effect/platform-node")
    assert.strictEqual(state.imports, 0)
  })

  it.effect("loads Undici when the dispatcher is acquired", () =>
    Effect.gen(function*() {
      const NodeHttpClient = yield* Effect.promise(() => import("@effect/platform-node/NodeHttpClient"))
      yield* NodeHttpClient.makeDispatcher
      assert.strictEqual(state.imports, 1)
    }))
})
