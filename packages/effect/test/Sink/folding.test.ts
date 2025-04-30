import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { absurd, constTrue, pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("fold - empty", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.transduce(Sink.fold<number, number>(0, constTrue, (x, y) => x + y)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0])
    }))

  it.effect("fold - termination in the middle", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(Sink.fold<number, number>(0, (n) => n <= 5, (x, y) => x + y))
      )
      strictEqual(result, 6)
    }))

  it.effect("fold - immediate termination", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(Sink.fold<number, number>(0, (n) => n <= -1, (x, y) => x + y))
      )
      strictEqual(result, 0)
    }))

  it.effect("fold - no termination", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(Sink.fold<number, number>(0, (n) => n <= 500, (x, y) => x + y))
      )
      strictEqual(result, 45)
    }))

  it.effect("foldLeft equivalence with Chunk.reduce", () =>
    Effect.gen(function*() {
      const stream = Stream.range(1, 9)
      const result1 = yield* pipe(stream, Stream.run(Sink.foldLeft("", (s, n) => s + `${n}`)))
      const result2 = yield* pipe(stream, Stream.runCollect, Effect.map(Chunk.reduce("", (s, n) => s + `${n}`)))
      strictEqual(result1, result2)
    }))

  it.effect("foldEffect - empty", () =>
    Effect.gen(function*() {
      const sink = Sink.foldEffect(0, constTrue, (x, y: number) => Effect.succeed(x + y))
      const result = yield* pipe(Stream.empty, Stream.transduce(sink), Stream.runCollect)
      deepStrictEqual(Array.from(result), [0])
    }))

  it.effect("foldEffect - short circuits", () =>
    Effect.gen(function*() {
      const empty: Stream.Stream<number> = Stream.empty
      const single = Stream.make(1)
      const double = Stream.make(1, 2)
      const failed = Stream.fail("Ouch")
      const run = <E>(stream: Stream.Stream<number, E>) =>
        pipe(
          Ref.make(Chunk.empty<number>()),
          Effect.flatMap((ref) =>
            pipe(
              stream,
              Stream.transduce(Sink.foldEffect(
                0,
                constTrue,
                (_, y: number) => pipe(Ref.update(ref, Chunk.append(y)), Effect.as(30))
              )),
              Stream.runCollect,
              Effect.flatMap((exit) =>
                pipe(
                  Ref.get(ref),
                  Effect.map((result) => [Array.from(exit), Array.from(result)])
                )
              )
            )
          ),
          Effect.exit
        )
      const result1 = yield* run(empty)
      const result2 = yield* run(single)
      const result3 = yield* run(double)
      const result4 = yield* run(failed)
      deepStrictEqual(result1, Exit.succeed([[0], []]))
      deepStrictEqual(result2, Exit.succeed([[30], [1]]))
      deepStrictEqual(result3, Exit.succeed([[30], [1, 2]]))
      deepStrictEqual(result4, Exit.fail("Ouch"))
    }))

  it.effect("foldUntil", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1, 1, 1),
        Stream.transduce(Sink.foldUntil(0, 3, (x, y) => x + y)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [3, 3, 0])
    }))

  it.effect("foldUntilEffect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1, 1, 1),
        Stream.transduce(Sink.foldUntilEffect(0, 3, (x, y) => Effect.succeed(x + y))),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [3, 3, 0])
    }))

  it.effect("foldWeighted", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 5, 2, 3),
        Stream.transduce(Sink.foldWeighted({
          initial: Chunk.empty<number>(),
          maxCost: 12,
          cost: (_, n) => n * 2,
          body: (acc, curr) => pipe(acc, Chunk.append(curr))
        })),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 5], [2, 3]]
      )
    }))

  it.effect("foldWeightedDecompose - empty", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.transduce(Sink.foldWeightedDecompose({
          initial: 0,
          maxCost: 1_000,
          cost: (_, n) => n,
          decompose: Chunk.of,
          body: (acc, curr) => acc + curr
        })),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0])
    }))

  it.effect("foldWeightedDecompose - simple", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 5, 1),
        Stream.transduce(Sink.foldWeightedDecompose({
          initial: Chunk.empty<number>(),
          maxCost: 4,
          cost: (_, n) => n,
          decompose: (n) => n > 1 ? Chunk.make(n - 1, 1) : Chunk.of(n),
          body: (acc, curr) => pipe(acc, Chunk.append(curr))
        })),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 3], [1, 1, 1]]
      )
    }))

  it.effect("foldWeightedEffect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 5, 2, 3),
        Stream.transduce(Sink.foldWeightedEffect({
          initial: Chunk.empty<number>(),
          maxCost: 12,
          cost: (_, n) => Effect.succeed(n * 2),
          body: (acc, curr) => Effect.succeed(pipe(acc, Chunk.append(curr)))
        })),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 5], [2, 3]]
      )
    }))

  it.effect("foldWeightedDecomposeEffect - empty", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.transduce(Sink.foldWeightedDecomposeEffect({
          initial: 0,
          maxCost: 1_000,
          cost: (_, n) => Effect.succeed(n),
          decompose: (input) => Effect.succeed(Chunk.of(input)),
          body: (acc, curr) => Effect.succeed(acc + curr)
        })),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0])
    }))

  it.effect("foldWeightedDecomposeEffect - simple", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 5, 1),
        Stream.transduce(Sink.foldWeightedDecomposeEffect({
          initial: Chunk.empty<number>(),
          maxCost: 4,
          cost: (_, n) => Effect.succeed(n),
          decompose: (n) => Effect.succeed(n > 1 ? Chunk.make(n - 1, 1) : Chunk.of(n)),
          body: (acc, curr) => Effect.succeed(pipe(acc, Chunk.append(curr)))
        })),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 3], [1, 1, 1]]
      )
    }))

  it.effect("foldSink - handles leftovers", () =>
    Effect.gen(function*() {
      const sink = pipe(
        Sink.fail("boom"),
        Sink.foldSink({
          onFailure: (err) =>
            pipe(
              Sink.collectAll<number>(),
              Sink.map((chunk) => [Array.from(chunk), err] as const)
            ),
          onSuccess: (_) => absurd<Sink.Sink<readonly [Array<number>, string], number, never, string>>(_)
        })
      )
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.run(sink)
      )
      deepStrictEqual(result, [[1, 2, 3], "boom"])
    }))
})
