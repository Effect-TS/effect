import { describe, it } from "@effect/vitest"
import { assertFalse, assertLeft, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import { chunkCoordination } from "../utils/coordination.js"

const chunkArb = <A>(
  arb: fc.Arbitrary<A>,
  constraints?: fc.ArrayConstraints
): fc.Arbitrary<Chunk.Chunk<A>> => fc.array(arb, constraints).map(Chunk.fromIterable)

const grouped = <A>(arr: Array<A>, size: number): Array<Array<A>> => {
  const builder: Array<Array<A>> = []
  for (let i = 0; i < arr.length; i = i + size) {
    builder.push(arr.slice(i, i + size))
  }
  return builder
}

describe("Stream", () => {
  it("concatAll", () =>
    fc.assert(fc.asyncProperty(fc.array(chunkArb(fc.integer())), async (chunks) => {
      const stream = pipe(
        Chunk.fromIterable(chunks),
        Chunk.map(Stream.fromChunk),
        Stream.concatAll
      )
      const actual = await Effect.runPromise(Stream.runCollect(stream))
      const expected = Chunk.flatten(Chunk.fromIterable(chunks))
      deepStrictEqual(Array.from(actual), Array.from(expected))
    })))

  it.effect("finalizer - happy path", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<string>()))
      yield* pipe(
        Stream.acquireRelease(
          Ref.update(ref, Chunk.append("Acquire")),
          () => Ref.update(ref, Chunk.append("Release"))
        ),
        Stream.flatMap(() => Stream.finalizer(Ref.update(ref, Chunk.append("Use")))),
        Stream.ensuring(Ref.update(ref, Chunk.append("Ensuring"))),
        Stream.runDrain
      )
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), ["Acquire", "Use", "Release", "Ensuring"])
    }))

  it.effect("finalizer - finalizer is not run if stream is not pulled", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      // @effect-diagnostics-next-line floatingEffect:off
      yield* pipe(
        Stream.finalizer(Ref.set(ref, true)),
        Stream.toPull,
        Effect.scoped
      )
      const result = yield* (Ref.get(ref))
      assertFalse(result)
    }))

  it("fromChunk", () =>
    fc.assert(fc.asyncProperty(chunkArb(fc.integer()), async (chunk) => {
      const stream = Stream.fromChunk(chunk)
      const result = await Effect.runPromise(Stream.runCollect(stream))
      deepStrictEqual(Array.from(result), Array.from(chunk))
    })))

  it("fromChunks", () =>
    fc.assert(fc.asyncProperty(fc.array(chunkArb(fc.integer())), async (chunks) => {
      const stream = Stream.fromChunks(...chunks)
      const result = await Effect.runPromise(Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(result),
        Array.from(Chunk.flatten(Chunk.fromIterable(chunks)))
      )
    })))

  it.effect("fromChunks - discards empty chunks", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.of(1), Chunk.empty<number>(), Chunk.of(1)]
      const result = yield* pipe(
        Stream.fromChunks(...chunks),
        Stream.toPull,
        Effect.flatMap((pull) =>
          pipe(
            Chunk.range(1, 3),
            Effect.forEach(() => pipe(Effect.either(pull), Effect.map(Either.map(Chunk.toReadonlyArray))))
          )
        ),
        Effect.scoped
      )
      deepStrictEqual(Array.from(result), [
        Either.right([1]),
        Either.right([1]),
        Either.left(Option.none())
      ])
    }))

  it.effect("fromEffect - failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromEffect(Effect.fail("error")),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, "error")
    }))

  it.effect("fromEffectOption - emit one element with success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromEffectOption(Effect.succeed(5)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [5])
    }))

  it.effect("fromEffectOption - emit one element with failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromEffectOption(Effect.fail(Option.some(5))),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, 5)
    }))

  it.effect("fromEffectOption - do not emit any element", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromEffectOption(Effect.fail(Option.none())),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("fromSchedule", () =>
    Effect.gen(function*() {
      const schedule = pipe(
        Schedule.exponential(Duration.seconds(1)),
        Schedule.zipLeft(Schedule.recurs(5))
      )
      const fiber = yield* pipe(
        Stream.fromSchedule(schedule),
        Stream.runCollect,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.seconds(62)))
      const result = yield* (Fiber.join(fiber))
      const expected = [
        Duration.seconds(1),
        Duration.seconds(2),
        Duration.seconds(4),
        Duration.seconds(8),
        Duration.seconds(16)
      ]
      deepStrictEqual(Array.from(result), expected)
    }))

  it.effect("fromQueue - emits queued elements", () =>
    Effect.gen(function*() {
      const coordination = yield* (chunkCoordination([Chunk.make(1, 2)]))
      const fiber = yield* pipe(
        Stream.fromQueue(coordination.queue),
        Stream.filterMapWhile(Exit.match({
          onFailure: Option.none,
          onSuccess: Option.some
        })),
        Stream.flattenChunks,
        Stream.tap(() => coordination.proceed),
        Stream.runCollect,
        Effect.fork
      )
      yield* (coordination.offer)
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("fromQueue - chunks up to the max chunk size", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<number>())
      yield* (Queue.offerAll(queue, [1, 2, 3, 4, 5, 6, 7]))
      const result = yield* pipe(
        Stream.fromQueue(queue, { maxChunkSize: 2 }),
        Stream.mapChunks((chunk) => Chunk.of(Array.from(chunk))),
        Stream.take(3),
        Stream.runCollect
      )
      assertTrue(Array.from(result).every((array) => array.length <= 2))
    }))

  it.effect("fromAsyncIterable", () =>
    Effect.gen(function*() {
      async function* asyncIterable() {
        yield 1
        yield 2
        yield 3
      }

      const stream = Stream.fromAsyncIterable(asyncIterable(), identity)
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("fromReadableStream", () =>
    Effect.gen(function*() {
      class FromReadableStreamError {
        readonly _tag = "FromReadableStreamError"
        constructor(readonly error: unknown) {}
      }
      class NumberSource implements UnderlyingDefaultSource<number> {
        #counter = 0
        pull(controller: ReadableStreamDefaultController<number>) {
          controller.enqueue(this.#counter)
          this.#counter = this.#counter + 1
        }
      }

      const result = yield* pipe(
        Stream.fromReadableStream({
          evaluate: () => new ReadableStream(new NumberSource()),
          onError: (error) => new FromReadableStreamError(error)
        }),
        Stream.take(10),
        Stream.runCollect
      )

      deepStrictEqual(Array.from(result), Array.from({ length: 10 }, (_, i) => i))
    }))

  it.effect("iterate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.iterate(1, (n) => n + 1),
        Stream.take(10),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(1, 10)))
    }))

  it.effect("range - includes both endpoints", () =>
    Effect.gen(function*() {
      const result = yield* (Stream.runCollect(Stream.range(1, 2)))
      deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("range - two large ranges can be concatenated", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 1_000),
        Stream.concat(Stream.range(1_001, 2_000)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(1, 2000)))
    }))

  it.effect("range - two small ranges can be concatenated", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 10),
        Stream.concat(Stream.range(11, 20)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(1, 20)))
    }))

  it.effect("range - emits no values when start > end", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(2, 1),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("range - emits 1 value when start === end", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 1),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("range - emits values in chunks of chunkSize", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9, 2),
        Stream.mapChunks((chunk) => Chunk.make(pipe(chunk, Chunk.reduce(0, (x, y) => x + y)))),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result),
        [1 + 2, 3 + 4, 5 + 6, 7 + 8, 9]
      )
    }))

  it("rechunk", () =>
    fc.assert(
      fc.asyncProperty(fc.array(chunkArb(fc.integer())), fc.integer({ min: 1, max: 100 }), async (chunks, n) => {
        const stream = pipe(
          Stream.fromChunks(...chunks),
          Stream.rechunk(n),
          Stream.mapChunks(Chunk.of)
        )
        const actual = await Effect.runPromise(Stream.runCollect(stream))
        const expected = chunks.map((chunk) => Array.from(chunk)).flat()
        deepStrictEqual(
          Array.from(actual).map((chunk) => Array.from(chunk)),
          grouped(expected, n)
        )
      })
    ))

  it.effect("unfold", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.unfold(0, (n) =>
          n < 10 ?
            Option.some([n, n + 1] as const) :
            Option.none()),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, 9)))
    }))

  it.effect("unfoldChunk", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.unfoldChunk(0, (n) =>
          n < 10 ?
            Option.some([Chunk.make(n, n + 1), n + 2] as const) :
            Option.none()),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, 9)))
    }))

  it.effect("unfoldChunkEffect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.unfoldChunkEffect(0, (n) =>
          n < 10 ?
            Effect.succeed(Option.some([Chunk.make(n, n + 1), n + 2] as const)) :
            Effect.succeed(Option.none())),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, 9)))
    }))

  it.effect("unfoldEffect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.unfoldEffect(0, (n) =>
          n < 10 ?
            Effect.succeed(Option.some([n, n + 1] as const)) :
            Effect.succeed(Option.none())),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, 9)))
    }))
})
