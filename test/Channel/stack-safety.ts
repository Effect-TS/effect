import * as it from "effect-test/utils/extend"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Channel", () => {
  it.effect("mapOut is stack safe", () =>
    Effect.gen(function*($) {
      const N = 10_000
      const [chunk, value] = yield* $(
        Chunk.range(1, N),
        Chunk.reduce(
          Channel.write<number>(1),
          (channel, n) => pipe(channel, Channel.mapOut((i) => i + n))
        ),
        Channel.runCollect
      )
      const expected = pipe(
        Chunk.range(1, N),
        Chunk.reduce(1, (x, y) => x + y)
      )
      assert.strictEqual(Chunk.unsafeHead(chunk), expected)
      assert.isUndefined(value)
    }), 20_000)

  it.effect("concatMap is stack safe", () =>
    Effect.gen(function*($) {
      const N = 10_000
      const [chunk, value] = yield* $(
        Chunk.range(1, N),
        Chunk.reduce(
          Channel.write<number>(1),
          (channel, n) =>
            pipe(
              channel,
              Channel.concatMap(() => Channel.write(n)),
              Channel.asUnit
            )
        ),
        Channel.runCollect
      )
      assert.strictEqual(Chunk.unsafeHead(chunk), N)
      assert.isUndefined(value)
    }), 20_000)

  it.effect("flatMap is stack safe", () =>
    Effect.gen(function*($) {
      const N = 10_000
      const [chunk, value] = yield* $(
        Chunk.range(1, N),
        Chunk.reduce(
          Channel.write<number>(0),
          (channel, n) => pipe(channel, Channel.flatMap(() => Channel.write(n)))
        ),
        Channel.runCollect
      )
      assert.deepStrictEqual(Array.from(chunk), Array.from(Chunk.range(0, N)))
      assert.isUndefined(value)
    }), 20_000)
})
