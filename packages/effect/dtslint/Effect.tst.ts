import type { Either } from "effect"
import { Effect, hole, Option, pipe, Predicate, Schedule } from "effect"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Cause, UnknownException } from "effect/Cause"
import { describe, expect, it } from "tstyche"
import type { Simplify } from "../src/Types.js"

class TestError1 {
  readonly _tag = "TestError1"
}
class TestError2 {
  readonly _tag = "TestError2"
}

// -----------------------------------------------------------------------------
// Declarations
// -----------------------------------------------------------------------------

declare const string: Effect.Effect<string, "err-1", "dep-1">
declare const number: Effect.Effect<number, "err-2", "dep-2">
declare const boolean: Effect.Effect<boolean, never, "dep-3">
declare const stringArray: Array<Effect.Effect<string, "err-3", "dep-3">>
declare const numberRecord: Record<string, Effect.Effect<number, "err-4", "dep-4">>

declare const numberArray: Array<number>
declare const numberEffectIterable: Array<Effect.Effect<number>>

// For do notation & mapAccum tests:
declare const nonEmptyReadonlyStrings: NonEmptyReadonlyArray<string>
declare const strings: Array<string>
declare const numbersArray: Array<number>
declare const predicateNumbersOrStringsEffect: (input: number | string) => Effect.Effect<boolean>
declare const primitiveNumber: number
declare const primitiveNumberOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// Tacit helpers
const tacitString = (s: string): Effect.Effect<string> => Effect.succeed(`string ${s}`)
const tacitStringCause = (s: Cause<string>): Effect.Effect<string> => Effect.succeed(`string ${s}`)
const tacitStringPredicate = (_s: string): boolean => true
const tacitStringError = (_s: string): "a" => "a"
const tacitStringErrorEffect = (_s: string): Effect.Effect<never, "a"> => Effect.fail("a")

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe("Effect", () => {
  it("forEach - array", () => {
    expect(Effect.forEach(["a", "b"] as Array<string>, (
      _a, // _a is string
      _i // _i is number
    ) => string)).type.toBe<Effect.Effect<Array<string>, "err-1", "dep-1">>()

    expect(Effect.forEach(["a", "b"] as Array<string>, (
      _a,
      _i
    ) => string, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"],
      Effect.forEach((_a, _i) => string)
    )).type.toBe<Effect.Effect<Array<string>, "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"],
      Effect.forEach((_a, _i) => string, { discard: true })
    )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
  })

  it("forEach - nonempty", () => {
    expect(Effect.forEach(["a", "b"] as NonEmptyReadonlyArray<string>, (
      _a, // _a is string
      _i // _i is number
    ) => string)).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

    expect(Effect.forEach(["a", "b"], (
      _a,
      _i
    ) => string, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"] as NonEmptyReadonlyArray<string>,
      Effect.forEach((_a, _i) => string)
    )).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"] as NonEmptyReadonlyArray<string>,
      Effect.forEach((_a, _i) => string, { discard: true })
    )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
  })

  it("forEach - tuple as non empty array", () => {
    expect(Effect.forEach(["a", "b"] as const, (
      _a, // _a is "a" | "b"
      _i // _i is number
    ) => string)).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

    expect(Effect.forEach(["a", "b"] as const, (
      _a,
      _i
    ) => string, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"] as const,
      Effect.forEach((_a, _i) => string)
    )).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

    expect(pipe(
      ["a", "b"] as const,
      Effect.forEach((_a, _i) => string, { discard: true })
    )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
  })

  it("all - tuple", () => {
    expect(Effect.all([string, number])).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], undefined)).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], {})).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { concurrency: "unbounded" })).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { discard: true })).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { discard: true, concurrency: "unbounded" })).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { mode: "validate" })).type.toBe<
      Effect.Effect<[string, number], [Option.Option<"err-1">, Option.Option<"err-2">], "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { mode: "validate", discard: true })).type.toBe<
      Effect.Effect<void, [Option.Option<"err-1">, Option.Option<"err-2">], "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { mode: "either" })).type.toBe<
      Effect.Effect<[Either.Either<string, "err-1">, Either.Either<number, "err-2">], never, "dep-1" | "dep-2">
    >()
    expect(Effect.all([string, number], { mode: "either", discard: true })).type.toBe<
      Effect.Effect<void, never, "dep-1" | "dep-2">
    >()
  })

  it("all - struct", () => {
    expect(Effect.all({ a: string, b: number })).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, undefined)).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, {})).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { concurrency: "unbounded" })).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { discard: true })).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { discard: true, concurrency: "unbounded" })).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { mode: "validate" })).type.toBe<
      Effect.Effect<
        { a: string; b: number },
        { a: Option.Option<"err-1">; b: Option.Option<"err-2"> },
        "dep-1" | "dep-2"
      >
    >()
    expect(Effect.all({ a: string, b: number }, { mode: "validate", discard: true })).type.toBe<
      Effect.Effect<void, { a: Option.Option<"err-1">; b: Option.Option<"err-2"> }, "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { mode: "either" })).type.toBe<
      Effect.Effect<{ a: Either.Either<string, "err-1">; b: Either.Either<number, "err-2"> }, never, "dep-1" | "dep-2">
    >()
    expect(Effect.all({ a: string, b: number }, { mode: "either", discard: true })).type.toBe<
      Effect.Effect<void, never, "dep-1" | "dep-2">
    >()
  })

  it("all - array", () => {
    expect(Effect.all(stringArray)).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, undefined)).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, {})).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, { concurrency: "unbounded" })).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, { discard: true })).type.toBe<
      Effect.Effect<void, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, { discard: true, concurrency: "unbounded" })).type.toBe<
      Effect.Effect<void, "err-3", "dep-3">
    >()
    expect(Effect.all(stringArray, { mode: "validate" })).type.toBe<
      Effect.Effect<Array<string>, Array<Option.Option<"err-3">>, "dep-3">
    >()
    expect(Effect.all(stringArray, { mode: "validate", discard: true })).type.toBe<
      Effect.Effect<void, Array<Option.Option<"err-3">>, "dep-3">
    >()
    expect(Effect.all(stringArray, { mode: "either" })).type.toBe<
      Effect.Effect<Array<Either.Either<string, "err-3">>, never, "dep-3">
    >()
    expect(Effect.all(stringArray, { mode: "either", discard: true })).type.toBe<
      Effect.Effect<void, never, "dep-3">
    >()
  })

  it("all - record", () => {
    expect(Effect.all(numberRecord)).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, undefined)).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, {})).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, { concurrency: "unbounded" })).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, { discard: true })).type.toBe<
      Effect.Effect<void, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, { discard: true, concurrency: "unbounded" })).type.toBe<
      Effect.Effect<void, "err-4", "dep-4">
    >()
    expect(Effect.all(numberRecord, { mode: "validate" })).type.toBe<
      Effect.Effect<{ [x: string]: number }, { [x: string]: Option.Option<"err-4"> }, "dep-4">
    >()
    expect(Effect.all(numberRecord, { mode: "validate", discard: true })).type.toBe<
      Effect.Effect<void, { [x: string]: Option.Option<"err-4"> }, "dep-4">
    >()
    expect(Effect.all(numberRecord, { mode: "either" })).type.toBe<
      Effect.Effect<{ [x: string]: Either.Either<number, "err-4"> }, never, "dep-4">
    >()
    expect(Effect.all(numberRecord, { mode: "either", discard: true })).type.toBe<
      Effect.Effect<void, never, "dep-4">
    >()
  })

  it("allWith - tuple", () => {
    expect(pipe([string, number] as const, Effect.allWith())).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith(undefined))).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({}))).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ discard: true }))).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ discard: true, concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ mode: "validate" }))).type.toBe<
      Effect.Effect<[string, number], [Option.Option<"err-1">, Option.Option<"err-2">], "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ mode: "validate", discard: true }))).type.toBe<
      Effect.Effect<void, [Option.Option<"err-1">, Option.Option<"err-2">], "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ mode: "either" }))).type.toBe<
      Effect.Effect<[Either.Either<string, "err-1">, Either.Either<number, "err-2">], never, "dep-1" | "dep-2">
    >()
    expect(pipe([string, number] as const, Effect.allWith({ mode: "either", discard: true }))).type.toBe<
      Effect.Effect<void, never, "dep-1" | "dep-2">
    >()
  })

  it("allWith - struct", () => {
    expect(pipe({ a: string, b: number }, Effect.allWith())).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith(undefined))).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({}))).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<{ a: string; b: number }, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ discard: true }))).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ discard: true, concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ mode: "validate" }))).type.toBe<
      Effect.Effect<
        { a: string; b: number },
        { a: Option.Option<"err-1">; b: Option.Option<"err-2"> },
        "dep-1" | "dep-2"
      >
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ mode: "validate", discard: true }))).type.toBe<
      Effect.Effect<void, { a: Option.Option<"err-1">; b: Option.Option<"err-2"> }, "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ mode: "either" }))).type.toBe<
      Effect.Effect<{ a: Either.Either<string, "err-1">; b: Either.Either<number, "err-2"> }, never, "dep-1" | "dep-2">
    >()
    expect(pipe({ a: string, b: number }, Effect.allWith({ mode: "either", discard: true }))).type.toBe<
      Effect.Effect<void, never, "dep-1" | "dep-2">
    >()
  })

  it("allWith - array", () => {
    expect(pipe(stringArray, Effect.allWith())).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith(undefined))).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({}))).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<Array<string>, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ discard: true }))).type.toBe<
      Effect.Effect<void, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ discard: true, concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<void, "err-3", "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ mode: "validate" }))).type.toBe<
      Effect.Effect<Array<string>, Array<Option.Option<"err-3">>, "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ mode: "validate", discard: true }))).type.toBe<
      Effect.Effect<void, Array<Option.Option<"err-3">>, "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ mode: "either" }))).type.toBe<
      Effect.Effect<Array<Either.Either<string, "err-3">>, never, "dep-3">
    >()
    expect(pipe(stringArray, Effect.allWith({ mode: "either", discard: true }))).type.toBe<
      Effect.Effect<void, never, "dep-3">
    >()
  })

  it("allWith - record", () => {
    expect(pipe(numberRecord, Effect.allWith())).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith(undefined))).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({}))).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<{ [x: string]: number }, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ discard: true }))).type.toBe<
      Effect.Effect<void, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ discard: true, concurrency: "unbounded" }))).type.toBe<
      Effect.Effect<void, "err-4", "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ mode: "validate" }))).type.toBe<
      Effect.Effect<{ [x: string]: number }, { [x: string]: Option.Option<"err-4"> }, "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ mode: "validate", discard: true }))).type.toBe<
      Effect.Effect<void, { [x: string]: Option.Option<"err-4"> }, "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ mode: "either" }))).type.toBe<
      Effect.Effect<{ [x: string]: Either.Either<number, "err-4"> }, never, "dep-4">
    >()
    expect(pipe(numberRecord, Effect.allWith({ mode: "either", discard: true }))).type.toBe<
      Effect.Effect<void, never, "dep-4">
    >()
  })

  it("tacit", () => {
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrFail(
          tacitStringPredicate,
          () => "a" as const
        )
      )
    ).type.toBe<Effect.Effect<"a", "a", never>>()

    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrFail(
          () => true,
          tacitStringError
        )
      )
    ).type.toBe<Effect.Effect<"a", "a", never>>()

    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrDie(
          tacitStringPredicate,
          () => "fail"
        )
      )
    ).type.toBe<Effect.Effect<"a", never, never>>()

    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrDieMessage(
          tacitStringPredicate,
          "fail"
        )
      )
    ).type.toBe<Effect.Effect<"a", never, never>>()

    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrElse(
          tacitStringPredicate,
          () => Effect.fail("a" as const)
        )
      )
    ).type.toBe<Effect.Effect<"a", "a", never>>()

    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrElse(
          () => true,
          tacitStringErrorEffect
        )
      )
    ).type.toBe<Effect.Effect<"a", "a", never>>()

    expect(
      Effect.succeed("a" as const).pipe(Effect.tap(tacitString))
    ).type.toBe<Effect.Effect<"a", never, never>>()

    expect(
      Effect.succeed("a" as const).pipe(Effect.tap(tacitString, { onlyEffect: true }))
    ).type.toBe<Effect.Effect<"a", never, never>>()

    // @ts-expect-error
    Effect.succeed("a" as const).pipe(Effect.tap(tacitStringError, { onlyEffect: true }))

    expect(
      Effect.succeed("a" as const).pipe(Effect.tap(tacitString("a"), { onlyEffect: true }))
    ).type.toBe<Effect.Effect<"a", never, never>>()

    // @ts-expect-error
    Effect.succeed("a" as const).pipe(Effect.tap("a", { onlyEffect: true }))

    expect(
      Effect.fail("a" as const).pipe(Effect.tapError(tacitString))
    ).type.toBe<Effect.Effect<never, "a", never>>()

    expect(
      Effect.fail("a" as const).pipe(Effect.tapErrorCause(tacitStringCause))
    ).type.toBe<Effect.Effect<never, "a", never>>()

    expect(
      Effect.fail("a" as const).pipe(Effect.tapDefect(tacitStringCause))
    ).type.toBe<Effect.Effect<never, "a", never>>()

    expect(pipe(
      Effect.succeed("a" as const) as Effect.Effect<"a", "a">,
      Effect.tapBoth({
        onFailure: tacitString,
        onSuccess: tacitString
      })
    )).type.toBe<Effect.Effect<"a", "a", never>>()
  })

  it("zip", () => {
    expect(Effect.zip(Effect.succeed(1), Effect.succeed("a"))).type.toBe<
      Effect.Effect<[number, string], never, never>
    >()
  })

  it("validate", () => {
    expect(Effect.validate(Effect.succeed(1), Effect.succeed("a"))).type.toBe<
      Effect.Effect<[number, string], never, never>
    >()
  })

  it("promise", () => {
    expect(Effect.promise<string>(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve("Async operation completed successfully!")
          }, 2000)
        })
    )).type.toBe<Effect.Effect<string, never, never>>()
  })

  it("tapErrorTag", () => {
    class TestError1 {
      readonly _tag = "TestError1"
    }
    class TestError2 {
      readonly _tag = "TestError2"
    }

    expect(pipe(
      Effect.fail(new TestError1()),
      Effect.tapErrorTag("TestError1", () => Effect.succeed(1))
    )).type.toBe<Effect.Effect<never, TestError1, never>>()

    expect(pipe(
      Effect.fail(new TestError1()),
      Effect.tapErrorTag("TestError1", () => Effect.fail(new Error("")))
    )).type.toBe<Effect.Effect<never, Error | TestError1, never>>()

    expect(pipe(
      Effect.fail<TestError1 | Error>(new TestError1()),
      Effect.tapErrorTag("TestError1", () => Effect.succeed(1))
    )).type.toBe<Effect.Effect<never, Error | TestError1, never>>()

    expect(
      hole<Effect.Effect<number, TestError1 | TestError2>>().pipe(
        Effect.tapErrorTag("TestError1", Effect.log)
      )
    ).type.toBe<Effect.Effect<number, TestError1 | TestError2, never>>()
  })

  it("catchTag", () => {
    // @ts-expect-error
    Effect.catchTag(hole<Effect.Effect<number, TestError1>>(), "wrong", () => Effect.succeed(1))
    // @ts-expect-error
    pipe(hole<Effect.Effect<number, TestError1>>(), Effect.catchTag("wrong", () => Effect.succeed(1)))
    // @ts-expect-error
    Effect.catchTag(hole<Effect.Effect<number, Error | TestError1>>(), "wrong", () => Effect.succeed(1))
    // @ts-expect-error
    pipe(hole<Effect.Effect<number, Error | TestError1>>(), Effect.catchTag("wrong", () => Effect.succeed(1)))

    expect(Effect.catchTag(
      hole<Effect.Effect<number, Error | TestError1 | TestError2>>(),
      "TestError1",
      (_e: TestError1) => Effect.succeed(1)
    )).type.toBe<Effect.Effect<number, Error | TestError2, never>>()

    expect(
      Effect.catchTag(hole<Effect.Effect<number, TestError1>>(), "TestError1", (_e: TestError1) => Effect.succeed(1))
    ).type.toBe<
      Effect.Effect<number, never, never>
    >()

    expect(
      hole<Effect.Effect<number, TestError1 | TestError2>>().pipe(
        Effect.catchTag("TestError1", Effect.log)
      )
    ).type.toBe<Effect.Effect<number | void, TestError2, never>>()

    expect(pipe(
      hole<Effect.Effect<number, TestError1>>(),
      Effect.catchTag("TestError1", (_e: TestError1) => Effect.succeed(1))
    )).type.toBe<Effect.Effect<number, never, never>>()

    expect(Effect.catchTag(hole<Effect.Effect<number, TestError1 | TestError2>>(), "TestError1", Effect.succeed)).type
      .toBe<
        Effect.Effect<number | TestError1, TestError2, never>
      >()

    expect(pipe(
      hole<Effect.Effect<number, TestError1 | TestError2>>(),
      Effect.catchTag("TestError1", (_e: TestError1) => Effect.succeed(1))
    )).type.toBe<Effect.Effect<number, TestError2, never>>()

    expect(
      Effect.catchTag(
        hole<Effect.Effect<number, TestError1 | Error>>(),
        "TestError1",
        (_e: TestError1) => Effect.succeed(1)
      )
    ).type.toBe<
      Effect.Effect<number, Error, never>
    >()
    expect(pipe(
      hole<Effect.Effect<number, TestError1 | Error>>(),
      Effect.catchTag("TestError1", (_e: TestError1) => Effect.succeed(1))
    )).type.toBe<Effect.Effect<number, Error, never>>()
  })

  it("catchTags", () => {
    expect(pipe(
      Effect.fail<TestError1 | Error>(new Error()),
      Effect.catchTags({
        TestError1: (_e) => Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number, Error, never>>()

    pipe(
      Effect.fail(new TestError1()),
      Effect.catchTags({
        TestError1: () => Effect.succeed(1),
        // @ts-expect-error
        Other: () => Effect.succeed(1)
      })
    )

    Effect.catchTags(Effect.fail(new TestError1()), {
      TestError1: () => Effect.succeed(1),
      // @ts-expect-error
      Other: () => Effect.succeed(1)
    })

    pipe(
      Effect.fail(new TestError1() as TestError1 | string),
      Effect.catchTags({
        TestError1: () => Effect.succeed(1),
        // @ts-expect-error
        Other: () => Effect.succeed(1)
      })
    )

    Effect.catchTags(Effect.fail(new TestError1() as TestError1 | string), {
      TestError1: () => Effect.succeed(1),
      // @ts-expect-error
      Other: () => Effect.succeed(1)
    })

    expect(pipe(
      Effect.fail(new TestError1() as unknown),
      Effect.catchTags({
        TestError1: () => Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number, unknown, never>>()

    expect(Effect.catchTags(Effect.fail(new TestError1() as unknown), {
      TestError1: () => Effect.succeed(1)
    })).type.toBe<Effect.Effect<number, unknown, never>>()
  })

  it("iterate", () => {
    expect(Effect.iterate(100, {
      while: (n) => {
        expect(n).type.toBe<number>()
        return n > 0
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n - 1)
      }
    })).type.toBe<Effect.Effect<number, never, never>>()

    expect(Effect.iterate(100 as null | number, {
      while: (n): n is number => {
        expect(n).type.toBe<number | null>()
        return Predicate.isNotNull(n) && n > 0
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n - 1)
      }
    })).type.toBe<Effect.Effect<number | null, never, never>>()
  })

  it("loop", () => {
    expect(Effect.loop(0, {
      while: (n) => {
        expect(n).type.toBe<number>()
        return n < 5
      },
      step: (n) => {
        expect(n).type.toBe<number>()
        return n + 1
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n * 2)
      }
    })).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(Effect.loop(0, {
      while: (n) => n < 5,
      step: (n) => n + 1,
      body: (n) => Effect.succeed(n * 2),
      discard: true
    })).type.toBe<Effect.Effect<void, never, never>>()

    expect(Effect.loop(0 as null | number, {
      while: (n): n is number => {
        expect(n).type.toBe<number | null>()
        return Predicate.isNotNull(n) && n < 5
      },
      step: (n) => {
        expect(n).type.toBe<number>()
        return n + 1
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n * 2)
      }
    })).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(Effect.loop(0 as null | number, {
      while: (n): n is number => {
        expect(n).type.toBe<number | null>()
        return Predicate.isNotNull(n) && n < 5
      },
      step: (n) => {
        expect(n).type.toBe<number>()
        return n + 1
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n * 2)
      },
      discard: true
    })).type.toBe<Effect.Effect<void, never, never>>()
  })

  it("dropWhile", () => {
    expect(Effect.dropWhile(numbersArray, (_item: number) => {
      // _item is number
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(pipe(
      numbersArray,
      Effect.dropWhile((_item: number) => Effect.succeed(true))
    )).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(pipe(
      numbersArray,
      Effect.dropWhile((_item: string | number) => Effect.succeed(true))
    )).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(Effect.dropWhile(numbersArray, predicateNumbersOrStringsEffect)).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numbersArray, Effect.dropWhile(predicateNumbersOrStringsEffect))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
  })

  it("dropUntil", () => {
    expect(Effect.dropUntil(numbersArray, (_item: number) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()

    expect(pipe(
      numbersArray,
      Effect.dropUntil((_item: number) => Effect.succeed(true))
    )).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(pipe(
      numbersArray,
      Effect.dropUntil((_item: string | number) => Effect.succeed(true))
    )).type.toBe<Effect.Effect<Array<number>, never, never>>()

    expect(Effect.dropUntil(numbersArray, predicateNumbersOrStringsEffect)).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numbersArray, Effect.dropUntil(predicateNumbersOrStringsEffect))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
  })

  it("andThen", () => {
    expect(Effect.andThen(string, number)).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.andThen(string, () => number)).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(Effect.andThen(string, Promise.resolve(123))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
    expect(Effect.andThen(string, () => Promise.resolve(123))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
    expect(Effect.andThen(string, 1)).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(Effect.andThen(string, () => 1)).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()

    expect(string.pipe(Effect.andThen(number))).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(string.pipe(Effect.andThen(() => number))).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(string.pipe(Effect.andThen(1))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.andThen(() => 1))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.andThen(Promise.resolve(123)))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
    expect(string.pipe(Effect.andThen(() => Promise.resolve(123)))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
  })

  it("retry", () => {
    expect(Effect.retry(string, Schedule.forever)).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.retry(Schedule.forever))).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(Effect.retry(string, { schedule: Schedule.forever })).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.retry({ schedule: Schedule.forever }))).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(Effect.retry(string, {
      schedule: Schedule.forever,
      until: (_: "err-1") => true
    })).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(Effect.retry(string, {
      schedule: Schedule.forever,
      until: (_: string) => true
    })).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.retry({
      schedule: Schedule.forever,
      until: (_: "err-1") => true
    }))).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.retry({
      schedule: Schedule.forever,
      until: (_: string) => true
    }))).type.toBe<
      Effect.Effect<string, "err-1", "dep-1">
    >()
    expect(Effect.retry(string, {
      schedule: Schedule.forever,
      until: (_: "err-1") => boolean
    })).type.toBe<
      Effect.Effect<string, "err-1", "dep-1" | "dep-3">
    >()
    expect(string.pipe(Effect.retry({
      schedule: Schedule.forever,
      until: (_: "err-1") => boolean
    }))).type.toBe<
      Effect.Effect<string, "err-1", "dep-1" | "dep-3">
    >()
    expect(Effect.retry(Effect.fail(""), {
      until: (_: string): _ is "err" => true
    })).type.toBe<
      Effect.Effect<never, "err", never>
    >()
    expect(
      Effect.fail("").pipe(Effect.retry({
        until: (_: string): _ is "err" => true
      }))
    ).type.toBe<
      Effect.Effect<never, "err", never>
    >()
    expect(Effect.retry(Effect.fail(""), {
      schedule: Schedule.forever,
      until: (_: string): _ is "err" => true
    })).type.toBe<
      Effect.Effect<never, string, never>
    >()
  })

  it("repeat", () => {
    expect(Effect.repeat(string, Schedule.forever)).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.repeat(Schedule.forever))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(Effect.repeat(string, { schedule: Schedule.forever })).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.repeat({ schedule: Schedule.forever }))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(Effect.repeat(string, {
      schedule: Schedule.forever,
      until: (_: string) => true
    })).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.repeat({
      schedule: Schedule.forever,
      until: (_: string) => true
    }))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(Effect.repeat(string, {
      schedule: Schedule.forever,
      until: (_: string) => boolean
    })).type.toBe<
      Effect.Effect<number, "err-1", "dep-1" | "dep-3">
    >()
    expect(string.pipe(Effect.repeat({
      schedule: Schedule.forever,
      until: (_: string) => boolean
    }))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1" | "dep-3">
    >()
    expect(Effect.repeat(Effect.succeed(123), {
      until: (_: number): _ is 123 => true
    })).type.toBe<
      Effect.Effect<123, never, never>
    >()
    expect(
      Effect.succeed(123).pipe(Effect.repeat({
        until: (_: number): _ is 123 => true
      }))
    ).type.toBe<
      Effect.Effect<123, never, never>
    >()
    expect(Effect.repeat(Effect.succeed(""), {
      schedule: Schedule.forever,
      until: (_: string): _ is "hello" => true
    })).type.toBe<
      Effect.Effect<number, never, never>
    >()
  })

  it("filter", () => {
    expect(Effect.filter(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(Effect.filter(numberArray, (_n: number) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.filter((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.filter((_n: number) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
  })

  it("findFirst", () => {
    expect(Effect.findFirst(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Option.Option<number>, never, never>
    >()
    expect(Effect.findFirst(numberArray, (_n: number) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Option.Option<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.findFirst((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Option.Option<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.findFirst((_n: number) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Option.Option<number>, never, never>
    >()
  })

  it("reduceEffect", () => {
    expect(Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (_n: unknown): number | string => 0)).type.toBe<
      Effect.Effect<string | number, never, never>
    >()
    expect(Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (_n: number) => 0)).type.toBe<
      Effect.Effect<number, never, never>
    >()
    expect(pipe(numberEffectIterable, Effect.reduceEffect(Effect.succeed(0), (_n: unknown): number | string => 0))).type
      .toBe<
        Effect.Effect<string | number, never, never>
      >()
    expect(pipe(numberEffectIterable, Effect.reduceEffect(Effect.succeed(0), (_n: number) => 0))).type.toBe<
      Effect.Effect<number, never, never>
    >()
  })

  it("takeUntil", () => {
    expect(Effect.takeUntil(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(Effect.takeUntil(numberArray, (_n: number) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.takeUntil((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.takeUntil((_n: number) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
  })

  it("takeWhile", () => {
    expect(Effect.takeWhile(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(Effect.takeWhile(numberArray, (_n: number) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.takeWhile((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(pipe(numberArray, Effect.takeWhile((_n: number) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
  })

  it("catchSome", () => {
    expect(pipe(
      string,
      Effect.catchSome((_e: string) => Option.some(Effect.succeed(1)))
    )).type.toBe<Effect.Effect<string | number, "err-1", "dep-1">>()

    expect(pipe(
      string,
      Effect.catchSome((_e: "err-1") => Option.some(Effect.succeed(1)))
    )).type.toBe<Effect.Effect<string | number, "err-1", "dep-1">>()

    expect(Effect.catchSome(string, (_e: string) => Option.some(Effect.succeed(1)))).type.toBe<
      Effect.Effect<string | number, "err-1", "dep-1">
    >()
  })

  it("retryOrElse", () => {
    expect(Effect.retryOrElse(string, Schedule.forever, (_e: string) => Effect.succeed(0))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
    expect(Effect.retryOrElse(string, Schedule.forever, (_e: "err-1") => Effect.succeed(0))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
    expect(string.pipe(Effect.retryOrElse(Schedule.forever, (_e: string) => Effect.succeed(0)))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
    expect(string.pipe(Effect.retryOrElse(Schedule.forever, (_e: "err-1") => Effect.succeed(0)))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
  })

  it("do notation", () => {
    expect(pipe(
      Effect.Do,
      Effect.bind("a", (_scope: {}) => Effect.succeed(1)),
      Effect.bind("b", (_scope: { a: number }) => Effect.succeed("b")),
      Effect.let("c", (_scope: { a: number; b: string }) => true)
    )).type.toBe<
      Effect.Effect<{ a: number; b: string; c: boolean }, never, never>
    >()

    expect(pipe(
      Effect.succeed(1),
      Effect.bindTo("a"),
      Effect.bind("b", (_scope: { a: number }) => Effect.succeed("b")),
      Effect.let("c", (_scope: { a: number; b: string }) => true)
    )).type.toBe<
      Effect.Effect<{ a: number; b: string; c: boolean }, never, never>
    >()
  })

  it("liftPredicate", () => {
    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(Predicate.isString, (_s: string | number) => "b" as const)
    )).type.toBe<Effect.Effect<string, "b", never>>()

    expect(Effect.liftPredicate(primitiveNumberOrString, Predicate.isString, (_s: string | number) => "b" as const))
      .type.toBe<Effect.Effect<string, "b", never>>()

    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(
        (n: string | number): n is number => typeof n === "number",
        (_s: string | number) => "b" as const
      )
    )).type.toBe<Effect.Effect<number, "b", never>>()

    expect(Effect.liftPredicate(
      primitiveNumberOrString,
      (n: string | number): n is number => typeof n === "number",
      (_s: string | number) => "b" as const
    )).type.toBe<Effect.Effect<number, "b", never>>()

    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(predicateNumbersOrStrings, (_s: string | number) => "b" as const)
    )).type.toBe<Effect.Effect<string | number, "b", never>>()

    expect(pipe(
      primitiveNumber,
      Effect.liftPredicate(predicateNumbersOrStrings, (_s: number) => "b" as const)
    )).type.toBe<Effect.Effect<number, "b", never>>()

    expect(pipe(
      primitiveNumber,
      Effect.liftPredicate(
        (_n: number) => true,
        (_s: number) => "b" as const
      )
    )).type.toBe<Effect.Effect<number, "b", never>>()
  })

  it("mapAccum", () => {
    expect(Effect.mapAccum(strings, 0, (s, a, i) => {
      expect(s).type.toBe<number>()
      expect(a).type.toBe<string>()
      expect(i).type.toBe<number>()
      return Effect.succeed([s + i, a])
    })).type.toBe<Effect.Effect<[number, Array<string>], never, never>>()

    expect(Effect.mapAccum(nonEmptyReadonlyStrings, 0, (s, a, i) => {
      expect(s).type.toBe<number>()
      expect(a).type.toBe<string>()
      expect(i).type.toBe<number>()
      return Effect.succeed([s + i, a])
    })).type.toBe<Effect.Effect<[number, [string, ...Array<string>]], never, never>>()

    expect(pipe(
      strings,
      Effect.mapAccum(0, (s, a, i) => {
        expect(s).type.toBe<number>()
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Effect.succeed([s + i, a])
      })
    )).type.toBe<Effect.Effect<[number, Array<string>], never, never>>()

    expect(pipe(
      nonEmptyReadonlyStrings,
      Effect.mapAccum(0, (s, a, i) => {
        expect(s).type.toBe<number>()
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Effect.succeed([s + i, a])
      })
    )).type.toBe<Effect.Effect<[number, [string, ...Array<string>]], never, never>>()
  })

  it("Tag.Proxy", () => {
    expect(hole<Simplify<Effect.Tag.Proxy<"R", {}>>>()).type.toBe<{}>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: () => 1 }>>>())
      .type.toBe<{ a: () => Effect.Effect<1, never, "R"> }>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: (...args: ReadonlyArray<number>) => void }>>>())
      .type.toBe<{ a: (...args: ReadonlyArray<number>) => Effect.Effect<void, never, "R"> }>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: (...args: [1] | [2, 3]) => void }>>>())
      .type.toBe<{ a: (...args: Readonly<[1] | [2, 3]>) => Effect.Effect<void, never, "R"> }>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: (...args: [1] | [2, 3]) => Effect.Effect<1, 2, 3> }>>>())
      .type.toBe<{ a: (...args: Readonly<[1] | [2, 3]>) => Effect.Effect<1, 2, 3 | "R"> }>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: 1 }>>>())
      .type.toBe<{ a: Effect.Effect<1, never, "R"> }>()
    expect(hole<Simplify<Effect.Tag.Proxy<"R", { a: () => Promise<1> }>>>())
      .type.toBe<{ a: () => Effect.Effect<1, UnknownException, "R"> }>()
  })
})
