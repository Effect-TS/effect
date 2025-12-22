import type { Either, Types } from "effect"
import { Array as Arr, Context, Effect, hole, Option, pipe, Predicate, Schedule } from "effect"
import type { NonEmptyArray, NonEmptyReadonlyArray } from "effect/Array"
import type { Cause, NoSuchElementException, UnknownException } from "effect/Cause"
import type { Exit } from "effect/Exit"
import { describe, expect, it, when } from "tstyche"

class TestError1 {
  readonly _tag = "TestError1"
}
class TestError2 {
  readonly _tag = "TestError2"
}

class TestService extends Context.Tag("TestService")<TestService, {}>() {}

declare const string: Effect.Effect<string, "err-1", "dep-1">
declare const number: Effect.Effect<number, "err-2", "dep-2">
declare const boolean: Effect.Effect<boolean, never, "dep-3">
declare const stringArray: Array<Effect.Effect<string, "err-3", "dep-3">>
declare const numberRecord: Record<string, Effect.Effect<number, "err-4", "dep-4">>

declare const numberArray: Array<number>
declare const numberEffectIterable: Array<Effect.Effect<number>>

declare const readonlyNonEmptyStrings: NonEmptyReadonlyArray<string>
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

describe("Effect", () => {
  describe("forEach", () => {
    it("array", () => {
      expect(Effect.forEach(strings, (a, i) => {
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return string
      })).type.toBe<Effect.Effect<Array<string>, "err-1", "dep-1">>()
      expect(pipe(
        strings,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<string>()
          expect(i).type.toBe<number>()
          return string
        })
      )).type.toBe<Effect.Effect<Array<string>, "err-1", "dep-1">>()

      expect(Effect.forEach(strings, (a, i) => {
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return string
      }, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
      expect(pipe(
        strings,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<string>()
          expect(i).type.toBe<number>()
          return string
        }, { discard: true })
      )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
    })

    it("non empty array", () => {
      expect(Effect.forEach(readonlyNonEmptyStrings, (a, i) => {
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return string
      })).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()
      expect(pipe(
        readonlyNonEmptyStrings,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<string>()
          expect(i).type.toBe<number>()
          return string
        })
      )).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

      expect(Effect.forEach(readonlyNonEmptyStrings, (a, i) => {
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return string
      }, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
      expect(pipe(
        readonlyNonEmptyStrings,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<string>()
          expect(i).type.toBe<number>()
          return string
        }, { discard: true })
      )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
    })

    it("tuple as non empty array", () => {
      const tuple = ["a", "b"] as const
      expect(Effect.forEach(tuple, (a, i) => {
        expect(a).type.toBe<"a" | "b">()
        expect(i).type.toBe<number>()
        return string
      })).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()
      expect(pipe(
        tuple,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<"a" | "b">()
          expect(i).type.toBe<number>()
          return string
        })
      )).type.toBe<Effect.Effect<[string, ...Array<string>], "err-1", "dep-1">>()

      expect(Effect.forEach(tuple, (a, i) => {
        expect(a).type.toBe<"a" | "b">()
        expect(i).type.toBe<number>()
        return string
      }, { discard: true })).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
      expect(pipe(
        tuple,
        Effect.forEach((a, i) => {
          expect(a).type.toBe<"a" | "b">()
          expect(i).type.toBe<number>()
          return string
        }, { discard: true })
      )).type.toBe<Effect.Effect<void, "err-1", "dep-1">>()
    })
  })

  describe("all", () => {
    it("tuple", () => {
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

    it("struct", () => {
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
        Effect.Effect<
          { a: Either.Either<string, "err-1">; b: Either.Either<number, "err-2"> },
          never,
          "dep-1" | "dep-2"
        >
      >()
      expect(Effect.all({ a: string, b: number }, { mode: "either", discard: true })).type.toBe<
        Effect.Effect<void, never, "dep-1" | "dep-2">
      >()
    })

    it("array", () => {
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

    it("record", () => {
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
  })

  describe("allWith", () => {
    it("tuple", () => {
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

    it("struct", () => {
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
        Effect.Effect<
          { a: Either.Either<string, "err-1">; b: Either.Either<number, "err-2"> },
          never,
          "dep-1" | "dep-2"
        >
      >()
      expect(pipe({ a: string, b: number }, Effect.allWith({ mode: "either", discard: true }))).type.toBe<
        Effect.Effect<void, never, "dep-1" | "dep-2">
      >()
    })

    it("array", () => {
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

    it("record", () => {
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
  })

  it("filterOrFail", () => {
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrFail(
          tacitStringPredicate,
          (x) => {
            expect(x).type.toBe<"a">()
            return "a" as const
          }
        )
      )
    ).type.toBe<Effect.Effect<"a", "a">>()
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrFail(
          (x) => {
            expect(x).type.toBe<"a">()
            return true
          },
          tacitStringError
        )
      )
    ).type.toBe<Effect.Effect<"a", "a">>()
    expect(
      Effect.succeed<"a" | "b">("a").pipe(
        Effect.filterOrFail(
          (s): s is "a" => s === "a",
          (x) => {
            expect(x).type.toBe<"b">()
            return "a" as const
          }
        )
      )
    ).type.toBe<Effect.Effect<"a", "a">>()
  })

  it("filterOrDie", () => {
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrDie(
          tacitStringPredicate,
          (x) => {
            expect(x).type.toBe<"a">()
            return "fail"
          }
        )
      )
    ).type.toBe<Effect.Effect<"a">>()

    expect(
      Effect.succeed<"a" | "b">("a").pipe(
        Effect.filterOrDie(
          (s): s is "a" => s === "a",
          (x) => {
            expect(x).type.toBe<"b">()
            return "fail"
          }
        )
      )
    ).type.toBe<Effect.Effect<"a">>()
  })

  it("filterOrDieMessage", () => {
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrDieMessage(
          tacitStringPredicate,
          "fail"
        )
      )
    ).type.toBe<Effect.Effect<"a">>()
  })

  it("filterOrElse", () => {
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrElse(
          tacitStringPredicate,
          (x) => {
            expect(x).type.toBe<"a">()
            return Effect.fail("a" as const)
          }
        )
      )
    ).type.toBe<Effect.Effect<"a", "a">>()
    expect(
      Effect.succeed("a" as const).pipe(
        Effect.filterOrElse(
          (x) => {
            expect(x).type.toBe<"a">()
            return true
          },
          tacitStringErrorEffect
        )
      )
    ).type.toBe<Effect.Effect<"a", "a">>()

    expect(
      Effect.succeed(numberArray).pipe(
        Effect.filterOrElse(
          Arr.isNonEmptyArray,
          () => Effect.fail("a" as const)
        )
      )
    ).type.toBe<Effect.Effect<NonEmptyArray<number>, "a">>()
  })

  it("tap", () => {
    when(Effect.succeed("a" as const).pipe).isCalledWith(
      expect(Effect.tap).type.not.toBeCallableWith(tacitStringError, { onlyEffect: true })
    )
    when(Effect.succeed("a" as const).pipe).isCalledWith(
      expect(Effect.tap).type.not.toBeCallableWith("a", { onlyEffect: true })
    )

    expect(Effect.succeed("a" as const).pipe(Effect.tap(tacitString))).type.toBe<Effect.Effect<"a">>()

    expect(Effect.succeed("a" as const).pipe(Effect.tap(tacitString, { onlyEffect: true })))
      .type.toBe<Effect.Effect<"a">>()

    expect(Effect.succeed("a" as const).pipe(Effect.tap(tacitString("a"), { onlyEffect: true })))
      .type.toBe<Effect.Effect<"a">>()
  })

  it("tapError", () => {
    expect(
      Effect.fail("a" as const).pipe(Effect.tapError(tacitString))
    ).type.toBe<Effect.Effect<never, "a">>()
  })

  it("tapErrorCause", () => {
    expect(
      Effect.fail("a" as const).pipe(Effect.tapErrorCause(tacitStringCause))
    ).type.toBe<Effect.Effect<never, "a">>()
  })

  it("tapDefect", () => {
    expect(
      Effect.fail("a" as const).pipe(Effect.tapDefect(tacitStringCause))
    ).type.toBe<Effect.Effect<never, "a">>()
  })

  it("tapBoth", () => {
    expect(pipe(
      Effect.succeed("a" as const) as Effect.Effect<"a", "a">,
      Effect.tapBoth({
        onFailure: tacitString,
        onSuccess: tacitString
      })
    )).type.toBe<Effect.Effect<"a", "a">>()
  })

  it("zip", () => {
    expect(Effect.zip(Effect.succeed(1), Effect.succeed("a"))).type.toBe<
      Effect.Effect<[number, string]>
    >()
  })

  it("validate", () => {
    expect(Effect.validate(Effect.succeed(1), Effect.succeed("a"))).type.toBe<
      Effect.Effect<[number, string]>
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
    )).type.toBe<Effect.Effect<string>>()
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
      Effect.tapErrorTag("TestError1", (x) => {
        expect(x).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<never, TestError1>>()

    expect(pipe(
      Effect.fail(new TestError1()),
      Effect.tapErrorTag("TestError1", (x) => {
        expect(x).type.toBe<TestError1>()
        return Effect.fail(new Error(""))
      })
    )).type.toBe<Effect.Effect<never, Error | TestError1>>()

    expect(pipe(
      Effect.fail<TestError1 | Error>(new TestError1()),
      Effect.tapErrorTag("TestError1", (x) => {
        expect(x).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<never, Error | TestError1>>()

    expect(
      hole<Effect.Effect<number, TestError1 | TestError2>>().pipe(
        Effect.tapErrorTag("TestError1", Effect.log)
      )
    ).type.toBe<Effect.Effect<number, TestError1 | TestError2>>()
  })

  it("catchIf", () => {
    expect(pipe(
      Effect.fail<TestError1 | Error>(new TestError1()),
      Effect.catchIf(
        (error) => {
          expect(error).type.toBe<TestError1 | Error>()
          return true
        },
        Effect.succeed
      ),
      Effect.exit
    )).type.toBe<Effect.Effect<Exit<Error | TestError1, Error | TestError1>, never, never>>()
  })

  it("catchTag", () => {
    expect(Effect.catchTag).type.not.toBeCallableWith(
      hole<Effect.Effect<number, TestError1>>(),
      "wrong",
      () => Effect.succeed(1)
    )
    when(pipe).isCalledWith(
      hole<Effect.Effect<number, TestError1>>(),
      expect(Effect.catchTag).type.not.toBeCallableWith("wrong", () => Effect.succeed(1))
    )

    expect(Effect.catchTag).type.not.toBeCallableWith(
      hole<Effect.Effect<number, Error | TestError1>>(),
      "wrong",
      () => Effect.succeed(1)
    )
    when(pipe).isCalledWith(
      hole<Effect.Effect<number, Error | TestError1>>(),
      expect(Effect.catchTag).type.not.toBeCallableWith("wrong", () => Effect.succeed(1))
    )

    expect(Effect.catchTag(
      hole<Effect.Effect<number, Error | TestError1 | TestError2>>(),
      "TestError1",
      (e) => {
        expect(e).type.toBe<TestError1>()
        return Effect.succeed(1)
      }
    )).type.toBe<Effect.Effect<number, Error | TestError2>>()

    expect(
      Effect.catchTag(hole<Effect.Effect<number, TestError1>>(), "TestError1", (e) => {
        expect(e).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    ).type.toBe<
      Effect.Effect<number>
    >()

    expect(
      hole<Effect.Effect<number, TestError1 | TestError2>>().pipe(
        Effect.catchTag("TestError1", Effect.log)
      )
    ).type.toBe<Effect.Effect<number | void, TestError2>>()

    expect(pipe(
      hole<Effect.Effect<number, TestError1>>(),
      Effect.catchTag("TestError1", (e) => {
        expect(e).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number>>()

    expect(Effect.catchTag(hole<Effect.Effect<number, TestError1 | TestError2>>(), "TestError1", Effect.succeed)).type
      .toBe<Effect.Effect<number | TestError1, TestError2>>()

    expect(pipe(
      hole<Effect.Effect<number, TestError1 | TestError2>>(),
      Effect.catchTag("TestError1", (e) => {
        expect(e).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number, TestError2>>()

    expect(
      Effect.catchTag(
        hole<Effect.Effect<number, TestError1 | Error>>(),
        "TestError1",
        (e) => {
          expect(e).type.toBe<TestError1>()
          return Effect.succeed(1)
        }
      )
    ).type.toBe<Effect.Effect<number, Error>>()

    expect(pipe(
      hole<Effect.Effect<number, TestError1 | Error>>(),
      Effect.catchTag("TestError1", (e) => {
        expect(e).type.toBe<TestError1>()
        return Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number, Error>>()

    expect(pipe(
      hole<Effect.Effect<number, TestError1 | Error>>(),
      Effect.catchTag(
        "TestError1",
        Effect.fn(function*(e) {
          expect(e).type.toBe<TestError1>()
          return 1
        })
      )
    )).type.toBe<Effect.Effect<number, Error>>()
  })

  it("catchTags", () => {
    expect(pipe(
      Effect.fail<TestError1 | Error>(new Error()),
      Effect.catchTags({
        TestError1: (e) => {
          expect(e).type.toBe<TestError1>()
          return Effect.succeed(1)
        }
      })
    )).type.toBe<Effect.Effect<number, Error>>()

    when(pipe).isCalledWith(
      Effect.fail(new TestError1()),
      expect(Effect.catchTags).type.not.toBeCallableWith({
        TestError1: () => Effect.succeed(1),
        Other: () => Effect.succeed(1)
      })
    )

    expect(Effect.catchTags).type.not.toBeCallableWith(Effect.fail(new TestError1()), {
      TestError1: () => Effect.succeed(1),
      Other: () => Effect.succeed(1)
    })

    when(pipe).isCalledWith(
      Effect.fail(new TestError1() as TestError1 | string),
      expect(Effect.catchTags).type.not.toBeCallableWith({
        TestError1: () => Effect.succeed(1),
        Other: () => Effect.succeed(1)
      })
    )

    expect(Effect.catchTags).type.not.toBeCallableWith(Effect.fail(new TestError1() as TestError1 | string), {
      TestError1: () => Effect.succeed(1),
      Other: () => Effect.succeed(1)
    })

    expect(pipe(
      Effect.fail(new TestError1() as unknown),
      Effect.catchTags({
        TestError1: () => Effect.succeed(1)
      })
    )).type.toBe<Effect.Effect<number, unknown>>()

    expect(Effect.catchTags(Effect.fail(new TestError1() as unknown), {
      TestError1: () => Effect.succeed(1)
    })).type.toBe<Effect.Effect<number, unknown>>()
  })

  it("iterate", () => {
    // predicate
    expect(Effect.iterate(100, {
      while: (n) => {
        expect(n).type.toBe<number>()
        return n > 0
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n - 1)
      }
    })).type.toBe<Effect.Effect<number>>()

    // refinement
    expect(Effect.iterate(100 as null | number, {
      while: (n): n is number => {
        expect(n).type.toBe<number | null>()
        return Predicate.isNotNull(n) && n > 0
      },
      body: (n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(n - 1)
      }
    })).type.toBe<Effect.Effect<number | null>>()
  })

  it("loop", () => {
    // predicate
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
    })).type.toBe<Effect.Effect<Array<number>>>()

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
      },
      discard: true
    })).type.toBe<Effect.Effect<void>>()

    // refinement
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
    })).type.toBe<Effect.Effect<Array<number>>>()

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
    })).type.toBe<Effect.Effect<void>>()
  })

  it("dropWhile", () => {
    expect(Effect.dropWhile(numbersArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Array<number>>>()

    expect(pipe(
      numbersArray,
      Effect.dropWhile((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(pipe(
      numbersArray,
      Effect.dropWhile((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(Effect.dropWhile(numbersArray, predicateNumbersOrStringsEffect)).type.toBe<
      Effect.Effect<Array<number>>
    >()
    expect(pipe(numbersArray, Effect.dropWhile(predicateNumbersOrStringsEffect))).type.toBe<
      Effect.Effect<Array<number>>
    >()
  })

  it("dropUntil", () => {
    expect(Effect.dropUntil(numbersArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<
      Effect.Effect<Array<number>>
    >()

    expect(pipe(
      numbersArray,
      Effect.dropUntil((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(pipe(
      numbersArray,
      Effect.dropUntil((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(Effect.dropUntil(numbersArray, predicateNumbersOrStringsEffect)).type.toBe<
      Effect.Effect<Array<number>>
    >()
    expect(pipe(numbersArray, Effect.dropUntil(predicateNumbersOrStringsEffect))).type.toBe<
      Effect.Effect<Array<number>>
    >()
  })

  it("andThen", () => {
    expect(Effect.andThen(string, number)).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(string.pipe(Effect.andThen(number))).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()

    expect(Effect.andThen(string, () => number)).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()
    expect(string.pipe(Effect.andThen(() => number))).type.toBe<
      Effect.Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
    >()

    expect(Effect.andThen(string, Promise.resolve(123))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
    expect(string.pipe(Effect.andThen(Promise.resolve(123)))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()

    expect(Effect.andThen(string, () => Promise.resolve(123))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()
    expect(string.pipe(Effect.andThen(() => Promise.resolve(123)))).type.toBe<
      Effect.Effect<number, "err-1" | UnknownException, "dep-1">
    >()

    expect(Effect.andThen(string, 1)).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.andThen(1))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()

    expect(Effect.andThen(string, () => 1)).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(string.pipe(Effect.andThen(() => 1))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
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
      until: (e) => {
        expect(e).type.toBe<"err-1">()
        return true
      }
    })).type.toBe<Effect.Effect<string, "err-1", "dep-1">>()
    expect(string.pipe(Effect.retry({
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<"err-1">()
        return true
      }
    }))).type.toBe<Effect.Effect<string, "err-1", "dep-1">>()

    expect(Effect.retry(string, {
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<"err-1">()
        return boolean
      }
    })).type.toBe<Effect.Effect<string, "err-1", "dep-1" | "dep-3">>()
    expect(string.pipe(Effect.retry({
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<"err-1">()
        return boolean
      }
    }))).type.toBe<Effect.Effect<string, "err-1", "dep-1" | "dep-3">>()

    expect(Effect.retry(Effect.fail(""), {
      until: (e): e is "err" => {
        expect(e).type.toBe<string>()
        return true
      }
    })).type.toBe<Effect.Effect<never, "err">>()
    expect(
      Effect.fail("").pipe(Effect.retry({
        until: (e): e is "err" => {
          expect(e).type.toBe<string>()
          return true
        }
      }))
    ).type.toBe<Effect.Effect<never, "err">>()

    expect(Effect.retry(Effect.fail(""), {
      schedule: Schedule.forever,
      until: (e): e is "err" => {
        expect(e).type.toBe<string>()
        return true
      }
    })).type.toBe<Effect.Effect<never, string>>()
    expect(
      Effect.fail("").pipe(Effect.retry({
        schedule: Schedule.forever,
        until: (e): e is "err" => {
          expect(e).type.toBe<string>()
          return true
        }
      }))
    ).type.toBe<Effect.Effect<never, string>>()
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
      until: (e) => {
        expect(e).type.toBe<string>()
        return true
      }
    })).type.toBe<Effect.Effect<number, "err-1", "dep-1">>()
    expect(string.pipe(Effect.repeat({
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<string>()
        return true
      }
    }))).type.toBe<
      Effect.Effect<number, "err-1", "dep-1">
    >()
    expect(Effect.repeat(string, {
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<string>()
        return boolean
      }
    })).type.toBe<Effect.Effect<number, "err-1", "dep-1" | "dep-3">>()
    expect(string.pipe(Effect.repeat({
      schedule: Schedule.forever,
      until: (e) => {
        expect(e).type.toBe<string>()
        return boolean
      }
    }))).type.toBe<Effect.Effect<number, "err-1", "dep-1" | "dep-3">>()

    expect(Effect.repeat(Effect.succeed(123), {
      until: (e): e is 123 => {
        expect(e).type.toBe<number>()
        return true
      }
    })).type.toBe<Effect.Effect<123>>()
    expect(
      Effect.succeed(123).pipe(Effect.repeat({
        until: (e): e is 123 => {
          expect(e).type.toBe<number>()
          return true
        }
      }))
    ).type.toBe<Effect.Effect<123>>()

    expect(Effect.repeat(Effect.succeed(""), {
      schedule: Schedule.forever,
      until: (e): e is "hello" => {
        expect(e).type.toBe<string>()
        return true
      }
    })).type.toBe<Effect.Effect<number>>()
    expect(
      Effect.succeed("").pipe(Effect.repeat({
        schedule: Schedule.forever,
        until: (e): e is "hello" => {
          expect(e).type.toBe<string>()
          return true
        }
      }))
    ).type.toBe<Effect.Effect<number>>()
  })

  it("filter", () => {
    expect(Effect.filter(numberArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Array<number>>>()
    expect(pipe(
      numberArray,
      Effect.filter((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(Effect.filter(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>>
    >()
    expect(pipe(numberArray, Effect.filter((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>>
    >()
  })

  it("findFirst", () => {
    expect(Effect.findFirst(numberArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Option.Option<number>>>()
    expect(pipe(
      numberArray,
      Effect.findFirst((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Option.Option<number>>>()

    expect(Effect.findFirst(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Option.Option<number>>
    >()
    expect(pipe(numberArray, Effect.findFirst((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Option.Option<number>>
    >()
  })

  it("reduceEffect", () => {
    expect(Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (n) => {
      expect(n).type.toBe<number>()
      return 0
    })).type.toBe<Effect.Effect<number>>()
    expect(pipe(
      numberEffectIterable,
      Effect.reduceEffect(Effect.succeed(0), (n) => {
        expect(n).type.toBe<number>()
        return 0
      })
    )).type.toBe<Effect.Effect<number>>()

    expect(Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (_n: unknown): number | string => 0)).type.toBe<
      Effect.Effect<string | number>
    >()
    expect(pipe(numberEffectIterable, Effect.reduceEffect(Effect.succeed(0), (_n: unknown): number | string => 0))).type
      .toBe<Effect.Effect<string | number>>()
  })

  it("takeUntil", () => {
    expect(Effect.takeUntil(numberArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Array<number>>>()
    expect(pipe(
      numberArray,
      Effect.takeUntil((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(Effect.takeUntil(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>>
    >()
    expect(pipe(numberArray, Effect.takeUntil((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>>
    >()
  })

  it("takeWhile", () => {
    expect(Effect.takeWhile(numberArray, (n) => {
      expect(n).type.toBe<number>()
      return Effect.succeed(true)
    })).type.toBe<Effect.Effect<Array<number>>>()
    expect(pipe(
      numberArray,
      Effect.takeWhile((n) => {
        expect(n).type.toBe<number>()
        return Effect.succeed(true)
      })
    )).type.toBe<Effect.Effect<Array<number>>>()

    expect(Effect.takeWhile(numberArray, (_n: unknown) => Effect.succeed(true))).type.toBe<
      Effect.Effect<Array<number>>
    >()
    expect(pipe(numberArray, Effect.takeWhile((_n: unknown) => Effect.succeed(true)))).type.toBe<
      Effect.Effect<Array<number>>
    >()
  })

  it("catchSome", () => {
    expect(pipe(
      string,
      Effect.catchSome((e) => {
        expect(e).type.toBe<"err-1">()
        return Option.some(Effect.succeed(1))
      })
    )).type.toBe<Effect.Effect<string | number, "err-1", "dep-1">>()

    expect(Effect.catchSome(string, (e) => {
      expect(e).type.toBe<"err-1">()
      return Option.some(Effect.succeed(1))
    })).type.toBe<
      Effect.Effect<string | number, "err-1", "dep-1">
    >()

    expect(Effect.catchSome(string, (_e: string) => Option.some(Effect.succeed(1)))).type.toBe<
      Effect.Effect<string | number, "err-1", "dep-1">
    >()
    expect(pipe(string, Effect.catchSome((_e: string) => Option.some(Effect.succeed(1))))).type.toBe<
      Effect.Effect<string | number, "err-1", "dep-1">
    >()
  })

  it("retryOrElse", () => {
    expect(Effect.retryOrElse(string, Schedule.forever, (e) => {
      expect(e).type.toBe<"err-1">()
      return Effect.succeed(0)
    })).type.toBe<Effect.Effect<string | number, never, "dep-1">>()
    expect(string.pipe(Effect.retryOrElse(Schedule.forever, (e) => {
      expect(e).type.toBe<"err-1">()
      return Effect.succeed(0)
    }))).type.toBe<Effect.Effect<string | number, never, "dep-1">>()

    expect(Effect.retryOrElse(string, Schedule.forever, (_e: string) => Effect.succeed(0))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
    expect(string.pipe(Effect.retryOrElse(Schedule.forever, (_e: string) => Effect.succeed(0)))).type.toBe<
      Effect.Effect<string | number, never, "dep-1">
    >()
  })

  it("do notation", () => {
    expect(pipe(
      Effect.Do,
      Effect.bind("a", (scope) => {
        expect(scope).type.toBe<{}>()
        return Effect.succeed(1)
      }),
      Effect.bind("b", (scope) => {
        expect(scope).type.toBe<{ a: number }>()
        return Effect.succeed("b")
      }),
      Effect.let("c", (scope) => {
        expect(scope).type.toBe<{ a: number; b: string }>()
        return true
      })
    )).type.toBe<Effect.Effect<{ a: number; b: string; c: boolean }>>()

    expect(pipe(
      Effect.succeed(1),
      Effect.bindTo("a"),
      Effect.bind("b", (scope) => {
        expect(scope).type.toBe<{ a: number }>()
        return Effect.succeed("b")
      }),
      Effect.let("c", (scope) => {
        expect(scope).type.toBe<{ a: number; b: string }>()
        return true
      })
    )).type.toBe<Effect.Effect<{ a: number; b: string; c: boolean }>>()
  })

  it("liftPredicate", () => {
    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(Predicate.isString, (sn) => {
        expect(sn).type.toBe<number>()
        return "b" as const
      })
    )).type.toBe<Effect.Effect<string, "b">>()
    expect(Effect.liftPredicate(primitiveNumberOrString, Predicate.isString, (sn) => {
      expect(sn).type.toBe<number>()
      return "b" as const
    })).type.toBe<Effect.Effect<string, "b">>()

    expect(Effect.liftPredicate(hole<Predicate.Refinement<string | number, number>>(), (sn) => {
      expect(sn).type.toBe<string>()
      return "b" as const
    })).type.toBe<(a: string | number) => Effect.Effect<number, "b">>()
    expect(Effect.liftPredicate(Predicate.isString, (sn) => {
      expect(sn).type.toBe<unknown>()
      return "b" as const
    })).type.toBe<(a: unknown) => Effect.Effect<string, "b">>()

    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(
        (sn): sn is number => {
          expect(sn).type.toBe<string | number>()
          return typeof sn === "number"
        },
        (sn) => {
          expect(sn).type.toBe<string>()
          return "b" as const
        }
      )
    )).type.toBe<Effect.Effect<number, "b">>()
    expect(Effect.liftPredicate(primitiveNumberOrString, (sn): sn is number => {
      expect(sn).type.toBe<string | number>()
      return typeof sn === "number"
    }, (sn) => {
      expect(sn).type.toBe<string>()
      return "b" as const
    })).type.toBe<Effect.Effect<number, "b">>()

    expect(pipe(
      primitiveNumberOrString,
      Effect.liftPredicate(predicateNumbersOrStrings, (sn) => {
        expect(sn).type.toBe<string | number>()
        return "b" as const
      })
    )).type.toBe<Effect.Effect<string | number, "b">>()
    expect(Effect.liftPredicate(primitiveNumberOrString, predicateNumbersOrStrings, (sn) => {
      expect(sn).type.toBe<string | number>()
      return "b" as const
    })).type.toBe<Effect.Effect<string | number, "b">>()

    expect(pipe(
      primitiveNumber,
      Effect.liftPredicate(predicateNumbersOrStrings, (n) => {
        expect(n).type.toBe<number>()
        return "b" as const
      })
    )).type.toBe<Effect.Effect<number, "b">>()
    expect(Effect.liftPredicate(primitiveNumber, predicateNumbersOrStrings, (n) => {
      expect(n).type.toBe<number>()
      return "b" as const
    })).type.toBe<Effect.Effect<number, "b">>()

    expect(pipe(
      primitiveNumber,
      Effect.liftPredicate(
        (n) => {
          expect(n).type.toBe<number>()
          return true
        },
        (n) => {
          expect(n).type.toBe<number>()
          return "b" as const
        }
      )
    )).type.toBe<Effect.Effect<number, "b">>()
    expect(Effect.liftPredicate(
      primitiveNumber,
      (n) => {
        expect(n).type.toBe<number>()
        return true
      },
      (n) => {
        expect(n).type.toBe<number>()
        return "b" as const
      }
    )).type.toBe<Effect.Effect<number, "b">>()
  })

  it("mapAccum", () => {
    expect(Effect.mapAccum(strings, 0, (s, a, i) => {
      expect(s).type.toBe<number>()
      expect(a).type.toBe<string>()
      expect(i).type.toBe<number>()
      return Effect.succeed([s + i, a])
    })).type.toBe<Effect.Effect<[number, Array<string>]>>()
    expect(pipe(
      strings,
      Effect.mapAccum(0, (s, a, i) => {
        expect(s).type.toBe<number>()
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Effect.succeed([s + i, a])
      })
    )).type.toBe<Effect.Effect<[number, Array<string>]>>()

    expect(Effect.mapAccum(readonlyNonEmptyStrings, 0, (s, a, i) => {
      expect(s).type.toBe<number>()
      expect(a).type.toBe<string>()
      expect(i).type.toBe<number>()
      return Effect.succeed([s + i, a])
    })).type.toBe<Effect.Effect<[number, [string, ...Array<string>]]>>()
    expect(pipe(
      readonlyNonEmptyStrings,
      Effect.mapAccum(0, (s, a, i) => {
        expect(s).type.toBe<number>()
        expect(a).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Effect.succeed([s + i, a])
      })
    )).type.toBe<Effect.Effect<[number, [string, ...Array<string>]]>>()
  })

  it("Tag.Proxy", () => {
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", {}>>>()).type.toBe<{}>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: () => 1 }>>>())
      .type.toBe<{ a: () => Effect.Effect<1, never, "R"> }>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: (...args: ReadonlyArray<number>) => void }>>>())
      .type.toBe<{ a: (...args: ReadonlyArray<number>) => Effect.Effect<void, never, "R"> }>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: (...args: [1] | [2, 3]) => void }>>>())
      .type.toBe<{ a: (...args: Readonly<[1] | [2, 3]>) => Effect.Effect<void, never, "R"> }>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: (...args: [1] | [2, 3]) => Effect.Effect<1, 2, 3> }>>>())
      .type.toBe<{ a: (...args: Readonly<[1] | [2, 3]>) => Effect.Effect<1, 2, 3 | "R"> }>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: 1 }>>>())
      .type.toBe<{ a: Effect.Effect<1, never, "R"> }>()
    expect(hole<Types.Simplify<Effect.Tag.Proxy<"R", { a: () => Promise<1> }>>>())
      .type.toBe<{ a: () => Effect.Effect<1, UnknownException, "R"> }>()
  })

  it("transposeOption", () => {
    expect(Effect.transposeOption(Option.none())).type.toBe<Effect.Effect<Option.Option<never>>>()
    expect(Effect.transposeOption(Option.some(string))).type.toBe<
      Effect.Effect<Option.Option<string>, "err-1", "dep-1">
    >()
  })

  it("transposeMapOption", () => {
    expect(Effect.transposeMapOption(Option.none(), (value) => {
      expect(value).type.toBe<never>()
      return string
    })).type.toBe<
      Effect.Effect<Option.Option<string>, "err-1", "dep-1">
    >()
    expect(pipe(
      Option.none(),
      Effect.transposeMapOption((value) => {
        expect(value).type.toBe<never>()
        return string
      })
    )).type.toBe<
      Effect.Effect<Option.Option<string>, "err-1", "dep-1">
    >()
    expect(Effect.transposeMapOption(Option.some(42), (value) => {
      expect(value).type.toBe<number>()
      return string
    })).type.toBe<
      Effect.Effect<Option.Option<string>, "err-1", "dep-1">
    >()
    expect(pipe(
      Option.some(42),
      Effect.transposeMapOption((value) => {
        expect(value).type.toBe<number>()
        return string
      })
    )).type.toBe<
      Effect.Effect<Option.Option<string>, "err-1", "dep-1">
    >()
  })

  it("fn", () => {
    const fn = Effect.fn((a?: string) => Effect.succeed(a), Effect.asVoid)
    expect(fn).type.toBe<(a?: string | undefined) => Effect.Effect<void, never, never>>()
  })

  it("fn returns Effect subtype", () => {
    const fnNonGen = Effect.fn((a?: string) => Effect.succeed(a), () => Option.some("test"))
    const fnGen = Effect.fn(function*(a?: string) {
      return Effect.succeed(a)
    }, () => Option.some("test"))

    expect(fnNonGen).type.toBe<
      (a?: string | undefined) => Effect.Effect<string, NoSuchElementException, never>
    >()

    expect(fnGen).type.toBe<
      (a?: string | undefined) => Effect.Effect<string, NoSuchElementException, never>
    >()
  })

  it("ensureSuccessType", () => {
    expect(Effect.succeed(123).pipe(Effect.ensureSuccessType<number>())).type.toBe<
      Effect.Effect<number, never, never>
    >()
  })

  it("ensureErrorType", () => {
    const withoutError = Effect.succeed("no error")
    expect(withoutError.pipe(Effect.ensureErrorType<never>())).type.toBe<Effect.Effect<string, never, never>>()

    const withError = Effect.fail(new TestError1())
    expect(withError.pipe(Effect.ensureErrorType<TestError1>())).type.toBe<Effect.Effect<never, TestError1, never>>()
  })

  it("ensureRequirementsType", () => {
    const withoutRequirements = Effect.never
    expect(withoutRequirements.pipe(Effect.ensureRequirementsType<never>())).type.toBe<
      Effect.Effect<never, never, never>
    >()

    const withRequirement = Effect.flatMap(TestService, () => Effect.never)
    expect(withRequirement.pipe(Effect.ensureRequirementsType<TestService>())).type.toBe<
      Effect.Effect<never, never, TestService>
    >()
  })
})
