import { Headers } from "@effect/platform"
import { Rpc, RpcGroup } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Schema } from "effect"

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

  it("exitSchema uses custom defect schema", () => {
    const DetailedDefect = Schema.Struct({
      message: Schema.String,
      stack: Schema.String,
      code: Schema.Number
    })

    const myRpc = Rpc.make("customDefect", {
      success: Schema.String,
      defect: DetailedDefect
    })

    const schema = Rpc.exitSchema(myRpc)
    const encode = Schema.encodeSync(schema)
    const decode = Schema.decodeSync(schema)

    const error = { message: "boom", stack: "Error: boom\n  at foo.ts:1", code: 42 }
    const exit = Exit.die(error)

    // With a custom defect schema, structured error info survives the round-trip
    const roundTripped = decode(encode(exit))

    assert.isTrue(Exit.isFailure(roundTripped))
    const defect = Cause.squash((roundTripped as Exit.Failure<any, any>).cause)
    assert.deepStrictEqual(defect, error)
  })
})
