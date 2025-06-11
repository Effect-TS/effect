import { Headers } from "@effect/platform"
import { Rpc, RpcGroup } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

const TestGroup = RpcGroup.make(
  Rpc.make("one"),
  Rpc.make("two", {
    success: Schema.String
  })
)

describe("Rpc", () => {
  it.effect("can implement a single handler", () =>
    Effect.gen(function*() {
      const TwoHandler = TestGroup.toLayerHandler("two", () => Effect.succeed("two"))
      const handler = yield* TestGroup.accessHandler("two").pipe(
        Effect.provide(TwoHandler)
      )
      const result = yield* handler(void 0, Headers.empty)
      assert.strictEqual(result, "two")
    }))
})
