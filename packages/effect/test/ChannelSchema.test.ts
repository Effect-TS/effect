import { assert, describe, it } from "@effect/vitest"
import { Channel, ChannelSchema, Effect, Schema } from "effect"

describe("ChannelSchema", () => {
  it.effect("decodeUnknown decodes unknown input chunks", () =>
    Effect.gen(function*() {
      const result = yield* Channel.fromArray([["1", "2"] as [unknown, ...Array<unknown>]]).pipe(
        Channel.pipeTo(ChannelSchema.decodeUnknown(Schema.NumberFromString)()),
        Channel.runCollect
      )

      assert.deepStrictEqual(result, [[1, 2]])
    }))
})
