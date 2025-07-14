import { describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("runFoldWhile", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1, 1),
        Stream.runFoldWhile(0, (n) => n < 3, (x, y) => x + y)
      )
      strictEqual(result, 3)
    }))

  it.effect("runForEach - with a small data set", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.make(1, 1, 1, 1, 1),
        Stream.runForEach((i) => Ref.update(ref, (n) => n + i))
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, 5)
    }))

  it.effect("runForEach - with a bigger data set", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.fromIterable(Array.from({ length: 1_000 }, () => 1)),
        Stream.runForEach((i) => Ref.update(ref, (n) => n + i))
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, 1_000)
    }))

  it.effect("runForEachWhile - with a small data set", () =>
    Effect.gen(function*() {
      const expected = 3
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.make(1, 1, 1, 1, 1, 1),
        Stream.runForEachWhile((n) =>
          Ref.modify(ref, (sum) =>
            sum >= expected ?
              [false, sum] as const :
              [true, sum + n])
        )
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, expected)
    }))

  it.effect("runForEachWhile - with a bigger data set", () =>
    Effect.gen(function*() {
      const expected = 500
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.fromIterable(Array.from({ length: 1_000 }, () => 1)),
        Stream.runForEachWhile((n) =>
          Ref.modify(ref, (sum) =>
            sum >= expected ?
              [false, sum] as const :
              [true, sum + n] as const)
        )
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, expected)
    }))

  it.effect("runForEachWhile - short circuits", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(true))
      yield* pipe(
        Stream.make(true, true, false),
        Stream.concat(Stream.drain(Stream.fromEffect(Ref.set(ref, false)))),
        Stream.runForEachWhile(Effect.succeed)
      )
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("runHead - non-empty stream", () =>
    Effect.gen(function*() {
      const result = yield* (Stream.runHead(Stream.make(1, 2, 3, 4)))
      assertSome(result, 1)
    }))

  it.effect("runHead - empty stream", () =>
    Effect.gen(function*() {
      const result = yield* (Stream.runHead(Stream.empty))
      assertNone(result)
    }))

  it.effect("runHead - pulls up to the first non-empty chunk", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const head = yield* pipe(
        Stream.make(
          Stream.drain(Stream.fromEffect(Ref.update(ref, Chunk.prepend(1)))),
          Stream.drain(Stream.fromEffect(Ref.update(ref, Chunk.prepend(2)))),
          Stream.make(1),
          Stream.drain(Stream.fromEffect(Ref.update(ref, Chunk.prepend(3))))
        ),
        Stream.flatten(),
        Stream.runHead
      )
      const result = yield* (Ref.get(ref))
      assertSome(head, 1)
      deepStrictEqual(Array.from(result), [2, 1])
    }))

  it.effect("runLast - non-empty stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4),
        Stream.runLast
      )
      assertSome(result, 4)
    }))

  it.effect("runLast - empty stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Stream.empty, Stream.runLast)
      assertNone(result)
    }))

  it.effect("runScoped - properly closes resources", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const resource = Effect.acquireRelease(
        Effect.succeed(1),
        () => Ref.set(ref, true)
      )
      const stream = pipe(Stream.scoped(resource), Stream.flatMap((a) => Stream.make(a, a, a)))
      const [result, state] = yield* pipe(
        stream,
        Stream.runScoped(Sink.collectAll()),
        Effect.flatMap((chunk) => pipe(Ref.get(ref), Effect.map((closed) => [chunk, closed] as const))),
        Effect.scoped
      )
      const finalState = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [1, 1, 1])
      assertFalse(state)
      assertTrue(finalState)
    }))
})
