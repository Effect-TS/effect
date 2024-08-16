import * as ClusterSchema from "@effect/cluster/ClusterSchema"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Effect, Schema, Stream } from "effect"

class StreamMessage extends Schema.TaggedRequest<StreamMessage>()("StreamMessage", {
  success: ClusterSchema.Stream({
    success: Schema.NumberFromString,
    failure: Schema.Never
  }),
  failure: Schema.Never,
  payload: {
    id: Schema.Number,
    name: Schema.String,
    date: Schema.Date
  }
}) {}

describe("ClusterSchema", () => {
  describe("Stream", () => {
    it("passes isStreamSchema", () => {
      assert.isTrue(ClusterSchema.isStreamSchema(StreamMessage.success))
    })

    it.effect("transforms a stream", () =>
      Effect.gen(function*() {
        const newStream = yield* Schema.encode(StreamMessage.success)(Stream.make(1, 2, 3))
        const values = Chunk.toReadonlyArray(yield* Stream.runCollect(newStream))
        assert.deepStrictEqual(values, ["1", "2", "3"])
      }))
  })
})
