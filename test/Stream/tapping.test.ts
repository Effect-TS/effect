import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("tap", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const result = yield* $(
        Stream.make(1, 1),
        Stream.tap((i) => Ref.update(ref, (n) => i + n)),
        Stream.runCollect
      )
      const sum = yield* $(Ref.get(ref))
      assert.strictEqual(sum, 2)
      assert.deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("tap - laziness on chunks", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.tap((n) => pipe(Effect.fail("error"), Effect.when(() => n === 3))),
        Stream.either,
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), [
        Either.right(1),
        Either.right(2),
        Either.left("error")
      ])
    }))

  it.effect("tapBoth - just tap values", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const values = Chunk.make(1, 1)
      const result = yield* $(
        Stream.fromChunk(values),
        Stream.tapBoth({
          onSuccess: (v) => Ref.update(ref, (_) => _ + v),
          onFailure: (e) => Effect.die(`Unexpected attempt to tap an error ${e}`)
        }),
        Stream.runCollect
      )

      assert.deepStrictEqual(Array.from(result), Array.from(values))
      assert.strictEqual(yield* $(Ref.get(ref)), 2)
    }))

  it.effect("tapBoth - just tap an error", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(""))
      const result = yield* $(
        Stream.fail("Ouch"),
        Stream.tapBoth({
          onSuccess: (v) => Effect.die(`Unexpected attempt to tap a value ${v}`),
          onFailure: (e) => Ref.update(ref, (_) => _ + e)
        }),
        Stream.runCollect,
        Effect.either
      )

      assert.deepStrictEqual(result, Either.left("Ouch"))
      assert.strictEqual(yield* $(Ref.get(ref)), "Ouch")
    }))

  it.effect("tapBoth - tap values and then error", () =>
    Effect.gen(function*($) {
      const error = yield* $(Ref.make(""))
      const sum = yield* $(Ref.make(0))
      const values = Chunk.make(1, 1)
      const result = yield* $(
        Stream.fromChunk(values),
        Stream.concat(Stream.fail("Ouch")),
        Stream.tapBoth({
          onSuccess: (v) => Ref.update(sum, (_) => _ + v),
          onFailure: (e) => Ref.update(error, (_) => _ + e)
        }),
        Stream.runCollect,
        Effect.either
      )

      assert.deepStrictEqual(result, Either.left("Ouch"))
      assert.strictEqual(yield* $(Ref.get(error)), "Ouch")
      assert.strictEqual(yield* $(Ref.get(sum)), 2)
    }))

  it.effect("tapBoth - tap chunks lazily", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.tapBoth({
          onSuccess: (n) => pipe(Effect.fail("error"), Effect.when(() => n === 3)),
          onFailure: () => Effect.unit
        }),
        Stream.either,
        Stream.runCollect
      )

      assert.deepStrictEqual(Array.from(result), [
        Either.right(1),
        Either.right(2),
        Either.left("error")
      ])
    }))

  it.effect("tapError", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(""))
      const result = yield* $(
        Stream.make(1, 1),
        Stream.concat(Stream.fail("Ouch")),
        Stream.tapError((e) => Ref.update(ref, (s) => s + e)),
        Stream.runCollect,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("tapSink - sink that is done after stream", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const sink = Sink.forEach((i: number) => Ref.update(ref, (n) => i + n))
      const result = yield* $(
        Stream.make(1, 1, 2, 3, 5, 8),
        Stream.tapSink(sink),
        Stream.runCollect
      )
      const sum = yield* $(Ref.get(ref))
      assert.strictEqual(sum, 20)
      assert.deepStrictEqual(Array.from(result), [1, 1, 2, 3, 5, 8])
    }))

  it.effect("tapSink - sink that is done before stream", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const sink = pipe(
        Sink.take<number>(3),
        Sink.map(Chunk.reduce(0, (x, y) => x + y)),
        Sink.mapEffect((i) => Ref.update(ref, (n) => n + i))
      )
      const result = yield* $(
        Stream.make(1, 1, 2, 3, 5, 8),
        Stream.rechunk(1),
        Stream.tapSink(sink),
        Stream.runCollect
      )
      const sum = yield* $(Ref.get(ref))
      assert.strictEqual(sum, 4)
      assert.deepStrictEqual(Array.from(result), [1, 1, 2, 3, 5, 8])
    }))

  it.effect("tapSink - sink that fails before stream", () =>
    Effect.gen(function*($) {
      const sink = Sink.fail("error")
      const result = yield* $(
        Stream.never,
        Stream.tapSink(sink),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(result, "error")
    }))

  it.effect("tapSink - does not read ahead", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const sink = Sink.forEach((i: number) => Ref.update(ref, (n) => i + n))
      yield* $(
        Stream.make(1, 2, 3, 4, 5),
        Stream.rechunk(1),
        Stream.forever,
        Stream.tapSink(sink),
        Stream.take(3),
        Stream.runDrain
      )
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 6)
    }))
})
