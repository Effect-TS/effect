import type { Chunk, Effect, Scope } from "effect"
import { Cause, pipe, Predicate, Stream } from "effect"
import { describe, expect, it } from "tstyche"

declare const numbers: Stream.Stream<number>
declare const numbersOrStrings: Stream.Stream<number | string>
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

describe("Stream", () => {
  it("filter", () => {
    Stream.filter(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      Stream.filter((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )

    expect(Stream.filter(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(Stream.filter(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.filter(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbers, Stream.filter(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(Stream.filter(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.filter(Predicate.isNumber))).type.toBe<
      Stream.Stream<number, never, never>
    >()
  })

  it("find", () => {
    Stream.find(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      Stream.find((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )

    expect(Stream.find(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.find(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(Stream.find(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.find(Predicate.isNumber))).type.toBe<
      Stream.Stream<number, never, never>
    >()
  })

  it("partition", () => {
    Stream.partition(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      Stream.partition((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )

    // The expected type is an Effect that yields a tuple of two Streams.
    expect(Stream.partition(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Effect.Effect<
        [
          excluded: Stream.Stream<string | number, never, never>,
          satisfying: Stream.Stream<string | number, never, never>
        ],
        never,
        Scope.Scope
      >
    >()

    expect(pipe(numbersOrStrings, Stream.partition(predicateNumbersOrStrings))).type.toBe<
      Effect.Effect<
        [
          excluded: Stream.Stream<string | number, never, never>,
          satisfying: Stream.Stream<string | number, never, never>
        ],
        never,
        Scope.Scope
      >
    >()

    expect(Stream.partition(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Effect.Effect<
        [excluded: Stream.Stream<string>, satisfying: Stream.Stream<number>],
        never,
        Scope.Scope
      >
    >()

    expect(pipe(numbersOrStrings, Stream.partition(Predicate.isNumber)))
      .type.toBe<
      Effect.Effect<
        [excluded: Stream.Stream<string>, satisfying: Stream.Stream<number>],
        never,
        Scope.Scope
      >
    >()
  })

  it("takeWhile", () => {
    Stream.takeWhile(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      Stream.takeWhile((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )

    expect(Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(Stream.takeWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.takeWhile(Predicate.isNumber))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    // Additional variations:
    expect(Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(Stream.takeWhile(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbers, Stream.takeWhile(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(Stream.takeWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.takeWhile(Predicate.isNumber))).type.toBe<
      Stream.Stream<number, never, never>
    >()
  })

  it("dropWhile", () => {
    expect(Stream.dropWhile(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbers, Stream.dropWhile(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(Stream.dropWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.dropWhile(Predicate.isNumber))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()
  })

  it("dropUntil", () => {
    expect(Stream.dropUntil(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbers, Stream.dropUntil(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(Stream.dropUntil(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.dropUntil(Predicate.isNumber))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()
  })

  it("split", () => {
    expect(Stream.split(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<Chunk.Chunk<number>, never, never>
    >()

    expect(pipe(numbers, Stream.split(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<Chunk.Chunk<number>, never, never>
    >()

    expect(Stream.split(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<Chunk.Chunk<string>, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.split(Predicate.isNumber))).type.toBe<
      Stream.Stream<Chunk.Chunk<string>, never, never>
    >()
  })

  it("takeUntil", () => {
    expect(Stream.takeUntil(numbers, predicateNumbersOrStrings)).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(pipe(numbers, Stream.takeUntil(predicateNumbersOrStrings))).type.toBe<
      Stream.Stream<number, never, never>
    >()

    expect(Stream.takeUntil(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Stream.Stream<string | number, never, never>
    >()

    expect(pipe(numbersOrStrings, Stream.takeUntil(Predicate.isNumber))).type.toBe<
      Stream.Stream<string | number, never, never>
    >()
  })

  it("Do Notation", () => {
    expect(
      pipe(
        Stream.Do,
        Stream.bind("a", (scope) => {
          expect(scope).type.toBe<{}>()
          return Stream.succeed(1)
        }),
        Stream.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Stream.succeed("b")
        }),
        Stream.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Stream.Stream<{ a: number; b: string; c: boolean }, never, never>>()

    expect(
      pipe(
        Stream.succeed(1),
        Stream.bindTo("a"),
        Stream.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Stream.succeed("b")
        }),
        Stream.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Stream.Stream<{ a: number; b: string; c: boolean }, never, never>>()
  })

  it("zipLatestAll", () => {
    expect(Stream.zipLatestAll()).type.toBe<Stream.Stream<never, never, never>>()

    expect(Stream.zipLatestAll(numbers, numbersOrStrings)).type.toBe<
      Stream.Stream<[number, string | number], never, never>
    >()

    expect(Stream.zipLatestAll(numbers, numbersOrStrings, Stream.fail(new Error("")))).type.toBe<
      Stream.Stream<[number, string | number, never], Error, never>
    >()
  })

  it("mergeWithTag", () => {
    expect(
      Stream.mergeWithTag(
        {
          a: pipe(Stream.make(0), Stream.tap(() => new Cause.NoSuchElementException())),
          b: Stream.make("")
        },
        { concurrency: 1 }
      )
    ).type.toBe<
      Stream.Stream<
        { _tag: "a"; value: number } | { _tag: "b"; value: string },
        Cause.NoSuchElementException,
        never
      >
    >()
  })
})
