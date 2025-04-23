import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

describe("Channel", () => {
  it.effect("mapOut is stack safe", () =>
    Effect.gen(function*() {
      const N = 10_000
      const [chunk, value] = yield* pipe(
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
      strictEqual(Chunk.unsafeHead(chunk), expected)
      strictEqual(value, undefined)
    }), 20_000)

  it.effect("concatMap is stack safe", () =>
    Effect.gen(function*() {
      const N = 10_000
      const [chunk, value] = yield* pipe(
        Chunk.range(1, N),
        Chunk.reduce(
          Channel.write<number>(1),
          (channel, n) =>
            pipe(
              channel,
              Channel.concatMap(() => Channel.write(n)),
              Channel.asVoid
            )
        ),
        Channel.runCollect
      )
      strictEqual(Chunk.unsafeHead(chunk), N)
      strictEqual(value, undefined)
    }), 20_000)

  it.effect("flatMap is stack safe", () =>
    Effect.gen(function*() {
      const N = 10_000
      const [chunk, value] = yield* pipe(
        Chunk.range(1, N),
        Chunk.reduce(
          Channel.write<number>(0),
          (channel, n) => pipe(channel, Channel.flatMap(() => Channel.write(n)))
        ),
        Channel.runCollect
      )
      deepStrictEqual(Array.from(chunk), Array.from(Chunk.range(0, N)))
      strictEqual(value, undefined)
    }), 20_000)
})
