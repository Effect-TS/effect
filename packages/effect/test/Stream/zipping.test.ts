import { describe, it } from "@effect/vitest"
import { assertLeft, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as Take from "effect/Take"

const chunkArb = <A>(
  arb: fc.Arbitrary<A>,
  constraints?: fc.ArrayConstraints
): fc.Arbitrary<Chunk.Chunk<A>> => fc.array(arb, constraints).map(Chunk.unsafeFromArray)

const OrderByKey: Order.Order<readonly [number, number]> = pipe(
  Number.Order,
  Order.mapInput((tuple) => tuple[0])
)

export const splitChunks = <A>(chunks: Chunk.Chunk<Chunk.Chunk<A>>): fc.Arbitrary<Chunk.Chunk<Chunk.Chunk<A>>> => {
  const split = (chunks: Chunk.Chunk<Chunk.Chunk<A>>): fc.Arbitrary<Chunk.Chunk<Chunk.Chunk<A>>> =>
    fc.integer({ min: 0, max: Math.max(chunks.length - 1, 0) }).chain((i) => {
      const chunk = Chunk.unsafeGet(chunks, i)
      return fc.integer({ min: 0, max: Math.max(chunk.length - 1, 0) }).map((j) => {
        const [left, right] = pipe(chunk, Chunk.splitAt(j))
        return pipe(
          chunks,
          Chunk.take(i),
          Chunk.appendAll(Chunk.of(left)),
          Chunk.appendAll(Chunk.of(right)),
          Chunk.appendAll(pipe(chunks, Chunk.drop(i + 1)))
        )
      })
    })
  return fc.oneof(fc.constant(chunks), split(chunks).chain((chunks) => splitChunks(chunks)))
}

describe("Stream", () => {
  it("zipAllSortedByKeyWith", () => {
    const intArb = fc.integer({ min: 1, max: 100 })
    const chunkArb = fc.array(fc.tuple(intArb, intArb)).map((entries) =>
      pipe(Chunk.fromIterable(new Map(entries)), Chunk.sort(OrderByKey))
    )
    const chunksArb = chunkArb.chain((chunk) => splitChunks(Chunk.of(chunk)))
    return fc.assert(fc.asyncProperty(chunksArb, chunksArb, async (as, bs) => {
      const left = Stream.fromChunks(...as)
      const right = Stream.fromChunks(...bs)
      const actual = Stream.zipAllSortedByKeyWith(left, {
        other: right,
        onSelf: identity,
        onOther: identity,
        onBoth: (x, y) => x + y,
        order: Number.Order
      })
      const expected = pipe(
        Chunk.flatten(as),
        Chunk.reduce(new Map(Array.from(Chunk.flatten(bs))), (map, [k, v]) =>
          pipe(
            Option.fromNullable(map.get(k)),
            Option.match({
              onNone: () => map.set(k, v),
              onSome: (v1) => map.set(k, v + v1)
            })
          )),
        Chunk.fromIterable,
        Chunk.sort(OrderByKey)
      )
      const result = await Effect.runPromise(Stream.runCollect(actual))
      deepStrictEqual(Array.from(result), Array.from(expected))
    }))
  })

  it.effect("zip - does not pull too much when one of the streams is done", () =>
    Effect.gen(function*() {
      const left = pipe(
        Stream.fromChunks(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.of(5)),
        Stream.concat(Stream.fail("boom"))
      )
      const right = Stream.fromChunks(Chunk.make("a", "b"), Chunk.of("c"))
      const result = yield* pipe(left, Stream.zip(right), Stream.runCollect)
      deepStrictEqual(Array.from(result), [[1, "a"], [2, "b"], [3, "c"]])
    }))

  it("zip - equivalence with Chunk.zip", () =>
    fc.assert(
      fc.asyncProperty(fc.array(chunkArb(fc.integer())), fc.array(chunkArb(fc.integer())), async (left, right) => {
        const stream = pipe(
          Stream.fromChunks(...left),
          Stream.zip(Stream.fromChunks(...right))
        )
        const expected = pipe(
          Chunk.flatten(Chunk.unsafeFromArray(left)),
          Chunk.zip(Chunk.flatten(Chunk.unsafeFromArray(right)))
        )
        const actual = await Effect.runPromise(Stream.runCollect(stream))
        deepStrictEqual(Array.from(actual), Array.from(expected))
      })
    ))

  it.effect("zip - terminate in uninterruptible region", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.zip(Stream.make(2)),
        Stream.runDrain,
        Effect.uninterruptible
      )
      strictEqual(result, undefined)
    }))

  it.effect("zipWith - prioritizes failures", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.never,
        Stream.zipWith(Stream.fail("Ouch"), () => Option.none()),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("zipWith - dies if one of the streams throws an exception", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.flatMap(() =>
          Stream.sync(() => {
            throw new Cause.RuntimeException("Ouch")
          })
        ),
        Stream.zip(Stream.make(1)),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(
        result,
        Exit.failCause(Cause.die(new Cause.RuntimeException("Ouch")))
      )
    }))

  // TODO: handle Chunk.zipAllWith
  // it("zipAllWith", () =>
  //   fc.assert(fc.asyncProperty(
  //     fc.array(chunkArb(fc.integer()).filter((chunk) => chunk.length > 0)),
  //     fc.array(chunkArb(fc.integer()).filter((chunk) => chunk.length > 0)),
  //     async (left, right) => {
  //       const stream = pipe(
  //         Stream.fromChunks(...left),
  //         Stream.map(Option.some),
  //         Stream.zipAll(
  //           pipe(Stream.fromChunks(...right), Stream.map(Option.some)),
  //           Option.none() as Option.Option<number>,
  //           Option.none() as Option.Option<number>
  //         )
  //       )
  //       const actual = await Effect.runPromise(Stream.runCollect(stream))
  //       const expected = pipe(
  //         Chunk.flatten(Chunk.fromIterable(left)),
  //         Chunk.zipAllWith(
  //           Chunk.flatten(Chunk.fromIterable(right)),
  //           (a, b) => [Option.some(a), Option.some(b)] as const,
  //           (a) => [Option.some(a), Option.none()] as const,
  //           (b) => [Option.none(), Option.some(b)] as const
  //         )
  //       )
  //       deepStrictEqual(Array.from(actual), Array.from(expected))
  //     }
  //   )))

  it.effect("zipAll - prioritizes failures", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.never,
        Stream.zipAll({
          other: Stream.fail("Ouch"),
          defaultSelf: Option.none(),
          defaultOther: Option.none()
        }),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("zipWithIndex", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const { result1, result2 } = yield* Effect.all({
        result1: Stream.runCollect(Stream.zipWithIndex(stream)),
        result2: pipe(Stream.runCollect(stream), Effect.map(Chunk.map((a, i) => [a, i] as const)))
      })
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("zipLatest", () =>
    Effect.gen(function*() {
      const left = yield* Queue.unbounded<Chunk.Chunk<number>>()
      const right = yield* Queue.unbounded<Chunk.Chunk<number>>()
      const output = yield* Queue.bounded<Take.Take<readonly [number, number]>>(1)
      yield* pipe(
        Stream.fromChunkQueue(left),
        Stream.zipLatest(Stream.fromChunkQueue(right)),
        Stream.runIntoQueue(output),
        Effect.fork
      )
      yield* Queue.offer(left, Chunk.make(0))
      yield* Queue.offerAll(right, [Chunk.make(0), Chunk.make(1)])
      const chunk1 = yield* pipe(
        Queue.take(output),
        Effect.flatMap(Take.done),
        Effect.replicateEffect(2),
        Effect.map(Chunk.unsafeFromArray),
        Effect.map(Chunk.flatten)
      )
      yield* Queue.offerAll(left, [Chunk.make(1), Chunk.make(2)])
      const chunk2 = yield* pipe(
        Queue.take(output),
        Effect.flatMap(Take.done),
        Effect.replicateEffect(2),
        Effect.map(Chunk.unsafeFromArray),
        Effect.map(Chunk.flatten)
      )
      deepStrictEqual(Array.from(chunk1), [[0, 0], [0, 1]])
      deepStrictEqual(Array.from(chunk2), [[1, 1], [2, 1]])
    }))

  it.effect("zipLatestWith - handles empty pulls properly", () =>
    Effect.gen(function*() {
      const stream0 = Stream.fromChunks(
        Chunk.empty<number>(),
        Chunk.empty<number>(),
        Chunk.make(2)
      )
      const stream1 = Stream.fromChunks(Chunk.make(1), Chunk.make(1))
      const deferred = yield* Deferred.make<number>()
      const latch = yield* Deferred.make<void>()
      const fiber = yield* pipe(
        stream0,
        Stream.concat(Stream.fromEffect(Deferred.await(deferred))),
        Stream.concat(Stream.make(2)),
        Stream.zipLatestWith(
          pipe(
            Stream.make(1, 1),
            Stream.ensuring(Deferred.succeed(latch, void 0)),
            Stream.concat(stream1)
          ),
          (_, n) => n
        ),
        Stream.take(3),
        Stream.runCollect,
        Effect.fork
      )
      yield* Deferred.await(latch)
      yield* Deferred.succeed(deferred, 2)
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(Array.from(result), [1, 1, 1])
    }))

  it.effect("zipLatestWith - handles empty pulls properly (JVM Only - LOL)", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.unfold(0, (n) =>
          Option.some(
            [
              n < 3 ? Chunk.empty<number>() : Chunk.of(2),
              n + 1
            ] as const
          )),
        Stream.flattenChunks,
        Stream.forever,
        Stream.zipLatestWith(Stream.forever(Stream.make(1)), (_, n) => n),
        Stream.take(3),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 1, 1])
    }))

  it("zipLatestWith - preserves partial ordering of stream elements", () => {
    const sortedChunkArb = chunkArb(fc.integer({ min: 1, max: 100 }))
      .map(Chunk.sort(Number.Order))
    const sortedChunksArb = sortedChunkArb.chain((chunk) => splitChunks(Chunk.of(chunk)))
    return fc.assert(fc.asyncProperty(sortedChunksArb, sortedChunksArb, async (left, right) => {
      const stream = pipe(
        Stream.fromChunks(...left),
        Stream.zipLatestWith(Stream.fromChunks(...right), (l, r) => l + r)
      )
      const result = await Effect.runPromise(Stream.runCollect(stream))
      const [isSorted] = Chunk.isEmpty(result) ? [true] : pipe(
        result,
        Chunk.drop(1),
        Chunk.reduce(
          [true as boolean, pipe(result, Chunk.unsafeGet(0))] as const,
          ([isSorted, last], curr) => [isSorted && last <= curr, curr] as const
        )
      )
      assertTrue(isSorted)
    }))
  })

  it.effect("zipWithNext", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.zipWithNext,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        [1, Option.some(2)],
        [2, Option.some(3)],
        [3, Option.none()]
      ])
    }))

  it.effect("zipWithNext - should work with multiple chunks", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunks(Chunk.of(1), Chunk.of(2), Chunk.of(3)),
        Stream.zipWithNext,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        [1, Option.some(2)],
        [2, Option.some(3)],
        [3, Option.none()]
      ])
    }))

  it.effect("zipWithNext - should work with an empty stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.zipWithNext,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it("zipWithNext - should output the same values as zipping with the tail plus the last element", () =>
    fc.assert(fc.asyncProperty(fc.array(chunkArb(fc.integer())), async (chunks) => {
      const stream = Stream.fromChunks(...chunks)
      const { result1, result2 } = await Effect.runPromise(Effect.all({
        result1: pipe(
          stream,
          Stream.zipWithNext,
          Stream.runCollect
        ),
        result2: Stream.runCollect(
          Stream.zipAll(stream, {
            other: Stream.map(Stream.drop(stream, 1), Option.some),
            defaultSelf: 0,
            defaultOther: Option.none()
          })
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    })))

  it.effect("zipWithPrevious - should zip with previous element for a single chunk", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.zipWithPrevious,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        [Option.none(), 1],
        [Option.some(1), 2],
        [Option.some(2), 3]
      ])
    }))

  it.effect("zipWithPrevious - should work with multiple chunks", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunks(Chunk.of(1), Chunk.of(2), Chunk.of(3)),
        Stream.zipWithPrevious,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        [Option.none(), 1],
        [Option.some(1), 2],
        [Option.some(2), 3]
      ])
    }))

  it.effect("zipWithPrevious - should work with an empty stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.zipWithPrevious,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it("zipWithPrevious - should output same values as first element plus zipping with init", () =>
    fc.assert(fc.asyncProperty(fc.array(chunkArb(fc.integer())), async (chunks) => {
      const stream = Stream.fromChunks(...chunks)
      const { result1, result2 } = await Effect.runPromise(Effect.all({
        result1: pipe(
          stream,
          Stream.zipWithPrevious,
          Stream.runCollect
        ),
        result2: pipe(
          Stream.make(Option.none()),
          Stream.concat(pipe(stream, Stream.map(Option.some))),
          Stream.zip(stream),
          Stream.runCollect
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    })))

  it.effect("zipWithPreviousAndNext", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.zipWithPreviousAndNext,
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        [Option.none(), 1, Option.some(2)],
        [Option.some(1), 2, Option.some(3)],
        [Option.some(2), 3, Option.none()]
      ])
    }))

  it("zipWithPreviousAndNext - should output same values as zipping with both previous and next element", () =>
    fc.assert(fc.asyncProperty(fc.array(chunkArb(fc.integer()), { minLength: 0, maxLength: 5 }), async (chunks) => {
      const stream = Stream.fromChunks(...chunks)
      const previous = pipe(
        Stream.make(Option.none()),
        Stream.concat(pipe(stream, Stream.map(Option.some)))
      )
      const next = pipe(
        stream,
        Stream.drop(1),
        Stream.map(Option.some),
        Stream.concat(Stream.make(Option.none()))
      )
      const { result1, result2 } = await pipe(
        Effect.all({
          result1: pipe(
            stream,
            Stream.zipWithPreviousAndNext,
            Stream.runCollect
          ),
          result2: pipe(
            previous,
            Stream.zip(stream),
            Stream.zipFlatten(next),
            Stream.runCollect
          )
        }),
        Effect.runPromise
      )
      deepStrictEqual(Array.from(result1), Array.from(result2))
    })))

  it.effect("zipLatestAll", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.zipLatestAll(
          Stream.make(1, 2, 3).pipe(Stream.rechunk(1)),
          Stream.make("a", "b", "c").pipe(Stream.rechunk(1)),
          Stream.make(true, false, true).pipe(Stream.rechunk(1))
        ),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      deepStrictEqual(result, [
        [1, "a", true],
        [2, "a", true],
        [3, "a", true],
        [3, "b", true],
        [3, "c", true],
        [3, "c", false],
        [3, "c", true]
      ])
    }))
})
