import { assert, describe, it } from "@effect/vitest"
import { type Array, Channel, ChannelSchema, Effect, Schema } from "effect"

describe("ChannelSchema", () => {
  it.effect("decodeUnknown decodes unknown input chunks", () =>
    Effect.gen(function*() {
      const input: Array.NonEmptyReadonlyArray<unknown> = ["1", "2"]
      const result = yield* Channel.fromArray([input]).pipe(
        Channel.pipeTo(ChannelSchema.decodeUnknown(Schema.NumberFromString)()),
        Channel.runCollect
      )

      assert.deepStrictEqual(result, [[1, 2]])
    }))
})
