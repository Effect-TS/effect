import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as fc from "effect/FastCheck"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

const weirdStringForSplitLines: fc.Arbitrary<ReadonlyArray<string>> = fc.array(
  fc.string().filter((s) => s !== "\n" && s !== "\r")
).map((strings) => {
  if (strings.length > 0 && strings[strings.length - 1] === "") {
    return [...strings, "a"]
  }
  return strings
})

const testSplitLines = (
  input: ReadonlyArray<Chunk.Chunk<string>>
): Effect.Effect<readonly [ReadonlyArray<string>, ReadonlyArray<string>]> => {
  const str = input.flatMap((chunk) => Chunk.toReadonlyArray(chunk).join("")).join("")
  const expected = str.split(/\r?\n/)
  return pipe(
    Stream.fromChunks(...input),
    Stream.splitLines,
    Stream.runCollect,
    Effect.map((chunk) => [expected, Chunk.toReadonlyArray(chunk)] as const)
  )
}

describe("Stream", () => {
  it.effect("split - should split properly", () =>
    Effect.gen(function*() {
      const chunks = Chunk.make(
        Chunk.range(1, 2),
        Chunk.range(3, 4),
        Chunk.range(5, 6),
        Chunk.make(7, 8, 9),
        Chunk.of(10)
      )
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(
          Stream.range(0, 9),
          Stream.split((n) => n % 4 === 0),
          Stream.runCollect
        ),
        result2: pipe(
          Stream.fromChunks(...chunks),
          Stream.split((n) => n % 3 === 0),
          Stream.runCollect
        )
      }))
      deepStrictEqual(
        Array.from(result1).map((chunk) => Array.from(chunk)),
        [[1, 2, 3], [5, 6, 7], [9]]
      )
      deepStrictEqual(
        Array.from(result2).map((chunk) => Array.from(chunk)),
        [[1, 2], [4, 5], [7, 8], [10]]
      )
    }))

  it.effect("split - is equivalent to identity when the predicate is not satisfied", () =>
    Effect.gen(function*() {
      const stream = Stream.range(1, 10)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.split((n) => n % 11 === 0), Stream.runCollect),
        result2: pipe(
          Stream.runCollect(stream),
          Effect.map((chunk) => pipe(Chunk.of(chunk), Chunk.filter(Chunk.isNonEmpty)))
        )
      }))
      deepStrictEqual(
        Array.from(result1).map((chunk) => Array.from(chunk)),
        [Array.from(Chunk.range(1, 10))]
      )
      deepStrictEqual(
        Array.from(result1).map((chunk) => Array.from(chunk)),
        Array.from(result2).map((chunk) => Array.from(chunk))
      )
    }))

  it.effect("split - should output empty chunk when stream is empty", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.split((n: number) => n % 11 === 0),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("splitOnChunk - consecutive delimiter yields empty Chunk", () =>
    Effect.gen(function*() {
      const input = Stream.make(
        Chunk.make(1, 2),
        Chunk.of(1),
        Chunk.make(2, 1, 2, 3, 1, 2),
        Chunk.make(1, 2)
      )
      const splitSequence = Chunk.make(1, 2)
      const result = yield* pipe(
        Stream.flattenChunks(input),
        Stream.splitOnChunk(splitSequence),
        Stream.map(Chunk.size),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 0, 0, 1, 0])
    }))

  it.effect("splitOnChunk - preserves data", () =>
    Effect.gen(function*() {
      const splitSequence = Chunk.make(0, 1)
      const stream = Stream.make(1, 1, 1, 1, 1, 1)
      const result = yield* pipe(
        stream,
        Stream.splitOnChunk(splitSequence),
        Stream.runCollect,
        Effect.map(Chunk.flatten)
      )
      deepStrictEqual(Array.from(result), [1, 1, 1, 1, 1, 1])
    }))

  it.effect("splitOnChunk - handles leftovers", () =>
    Effect.gen(function*() {
      const splitSequence = Chunk.make(0, 1)
      const result = yield* pipe(
        Stream.fromChunks(Chunk.make(1, 0, 2, 0, 1, 2), Chunk.of(2)),
        Stream.splitOnChunk(splitSequence),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 0, 2], [2, 2]]
      )
    }))

  it.effect("splitOnChunk - works", () =>
    Effect.gen(function*() {
      const splitSequence = Chunk.make(0, 1)
      const result = yield* pipe(
        Stream.make(1, 2, 0, 1, 3, 4, 0, 1, 5, 6, 5, 6),
        Stream.splitOnChunk(splitSequence),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2], [3, 4], [5, 6, 5, 6]]
      )
    }))

  it.effect("splitOnChunk - works from Chunks", () =>
    Effect.gen(function*() {
      const splitSequence = Chunk.make(0, 1)
      const result = yield* pipe(
        Stream.fromChunks(
          Chunk.make(1, 2),
          splitSequence,
          Chunk.make(3, 4),
          splitSequence,
          Chunk.make(5, 6),
          Chunk.make(5, 6)
        ),
        Stream.splitOnChunk(splitSequence),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2], [3, 4], [5, 6, 5, 6]]
      )
    }))

  it.effect("splitOnChunk - single delimiter edge case", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(0),
        Stream.splitOnChunk(Chunk.make(0)),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[]]
      )
    }))

  it.effect("splitOnChunk - no delimiter in data", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunks(Chunk.make(1, 2), Chunk.make(1, 2), Chunk.make(1, 2)),
        Stream.splitOnChunk(Chunk.make(1, 1)),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2, 1, 2, 1, 2]]
      )
    }))

  it.effect("splitOnChunk - delimiter on the boundary", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunks(Chunk.make(1, 2), Chunk.make(1, 2)),
        Stream.splitOnChunk(Chunk.make(2, 1)),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1], [2]]
      )
    }))

  it("splitLines - preserves data", () =>
    fc.assert(fc.asyncProperty(weirdStringForSplitLines, async (lines) => {
      const data = lines.join("\n")
      const program = pipe(
        Stream.fromChunk(Chunk.of(data)),
        Stream.splitLines,
        Stream.runCollect,
        Effect.map((chunk) => Chunk.toReadonlyArray(chunk).join("\n"))
      )
      const result = await Effect.runPromise(program)
      strictEqual(result, data)
    })))

  // it("splitLines - preserves data in chunks", () =>
  //   fc.asyncProperty(fc.property(weirdStringForSplitLines), async (lines) => {
  //     const data =
  //   })
  // )
  // //   test("preserves data in chunks") {
  // //     check(weirdStringGenForSplitLines) { xs =>
  // //       val data = Chunk.fromIterable(xs.sliding(2, 2).toList.map(_.mkString("\n")))
  // //       testSplitLines(Seq(data))
  // //     }
  // //   },

  it.effect("splitLines - handles leftovers", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.of("abc\nbc")]
      const [expected, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(expected, result)
    }))

  it.effect("splitLines - handles leftovers 2", () =>
    Effect.gen(function*() {
      const chunks = [
        Chunk.make("aa", "bb"),
        Chunk.make("\nbbc\n", "ddb", "bd"),
        Chunk.make("abc", "\n"),
        Chunk.of("abc")
      ]
      const [expected, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(expected, result)
    }))

  it.effect("splitLines - aggregates chunks", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.make("abc", "\n", "bc", "\n", "bcd", "bcd")]
      const [expected, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(expected, result)
    }))

  it.effect("splitLines - single newline edge case", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.of("\n")]
      const [, result] = yield* (testSplitLines(chunks))
      // JavaScript arrays split `"\n"` into `["", ""]`, so we manually assert
      // that the output should be the empty string here
      deepStrictEqual([""], result)
    }))

  it.effect("splitLines - no newlines", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.make("abc", "abc", "abc")]
      const [expected, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(expected, result)
    }))

  it.effect("splitLines - \\r\\n on the boundary", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.make("abc\r", "\nabc")]
      const [expected, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(expected, result)
    }))

  it.effect("splitLines - ZIO issue #6360", () =>
    Effect.gen(function*() {
      const chunks = [Chunk.make("AAAAABBBB#\r\r\r\n", "test")]
      const [_, result] = yield* (testSplitLines(chunks))
      deepStrictEqual(["AAAAABBBB#\r\r", "test"], result)
    }))
})
