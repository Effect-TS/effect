import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Cause } from "effect/Cause"
import * as Effect from "effect/Effect"
import { hole, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import type { Simplify } from "../src/Types.js"

declare const string: Effect.Effect<string, "err-1", "dep-1">
declare const number: Effect.Effect<number, "err-2", "dep-2">
declare const boolean: Effect.Effect<boolean, never, "dep-3">
declare const stringArray: Array<Effect.Effect<string, "err-3", "dep-3">>
declare const numberRecord: Record<string, Effect.Effect<number, "err-4", "dep-4">>

declare const numberArray: Array<number>
declare const numberEffectIterable: Array<Effect.Effect<number>>

// -------------------------------------------------------------------------------------
// forEach - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string[], "err-1", "dep-1">
Effect.forEach(["a", "b"] as Array<string>, (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string)

// $ExpectType Effect<void, "err-1", "dep-1">
Effect.forEach(["a", "b"] as Array<string>, (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string, { discard: true })

// $ExpectType Effect<string[], "err-1", "dep-1">
pipe(
  ["a", "b"],
  Effect.forEach((
    // $ExpectType string
    _a,
    // $ExpectType number
    _i
  ) => string)
)

// $ExpectType Effect<void, "err-1", "dep-1">
pipe(
  ["a", "b"],
  Effect.forEach((
    // $ExpectType string
    _a,
    // $ExpectType number
    _i
  ) => string, { discard: true })
)

// -------------------------------------------------------------------------------------
// forEach - nonempty
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[string, ...string[]], "err-1", "dep-1">
Effect.forEach(["a", "b"] as NonEmptyReadonlyArray<string>, (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string)

// $ExpectType Effect<void, "err-1", "dep-1">
Effect.forEach(["a", "b"], (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string, { discard: true })

// $ExpectType Effect<[string, ...string[]], "err-1", "dep-1">
pipe(
  ["a", "b"] as NonEmptyReadonlyArray<string>,
  Effect.forEach((
    // $ExpectType string
    _a,
    // $ExpectType number
    _i
  ) => string)
)

// $ExpectType Effect<void, "err-1", "dep-1">
pipe(
  ["a", "b"] as NonEmptyReadonlyArray<string>,
  Effect.forEach((
    // $ExpectType string
    _a,
    // $ExpectType number
    _i
  ) => string, { discard: true })
)

// -------------------------------------------------------------------------------------
// forEach - tuple as non empty array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[string, ...string[]], "err-1", "dep-1">
Effect.forEach(["a", "b"] as const, (
  // $ExpectType "a" | "b"
  _a,
  // $ExpectType number
  _i
) => string)

// $ExpectType Effect<void, "err-1", "dep-1">
Effect.forEach(["a", "b"] as const, (
  // $ExpectType "a" | "b"
  _a,
  // $ExpectType number
  _i
) => string, { discard: true })

// $ExpectType Effect<[string, ...string[]], "err-1", "dep-1">
pipe(
  ["a", "b"] as const,
  Effect.forEach((
    // $ExpectType "a" | "b"
    _a,
    // $ExpectType number
    _i
  ) => string)
)

// $ExpectType Effect<void, "err-1", "dep-1">
pipe(
  ["a", "b"] as const,
  Effect.forEach((
    // $ExpectType "a" | "b"
    _a,
    // $ExpectType number
    _i
  ) => string, { discard: true })
)

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number])

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number], undefined)

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number], {})

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number], { concurrency: "unbounded" })

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number], { discard: true })

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all([string, number], { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<[string, number], [Option<"err-1">, Option<"err-2">], "dep-1" | "dep-2">
Effect.all([string, number], { mode: "validate" })

// $ExpectType Effect<void, [Option<"err-1">, Option<"err-2">], "dep-1" | "dep-2">
Effect.all([string, number], { mode: "validate", discard: true })

// $ExpectType Effect<[Either<string, "err-1">, Either<number, "err-2">], never, "dep-1" | "dep-2">
Effect.all([string, number], { mode: "either" })

// $ExpectType Effect<void, never, "dep-1" | "dep-2">
Effect.all([string, number], { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number })

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, undefined)

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, {})

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { concurrency: "unbounded" })

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { discard: true })

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<{ a: string; b: number; }, { a: Option<"err-1">; b: Option<"err-2">; }, "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { mode: "validate" })

// $ExpectType Effect<void, { a: Option<"err-1">; b: Option<"err-2">; }, "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { mode: "validate", discard: true })

// $ExpectType Effect<{ a: Either<string, "err-1">; b: Either<number, "err-2">; }, never, "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { mode: "either" })

// $ExpectType Effect<void, never, "dep-1" | "dep-2">
Effect.all({ a: string, b: number }, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string[], "err-3", "dep-3">
Effect.all(stringArray)

// $ExpectType Effect<string[], "err-3", "dep-3">
Effect.all(stringArray, undefined)

// $ExpectType Effect<string[], "err-3", "dep-3">
Effect.all(stringArray, {})

// $ExpectType Effect<string[], "err-3", "dep-3">
Effect.all(stringArray, { concurrency: "unbounded" })

// $ExpectType Effect<void, "err-3", "dep-3">
Effect.all(stringArray, { discard: true })

// $ExpectType Effect<void, "err-3", "dep-3">
Effect.all(stringArray, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<string[], Option<"err-3">[], "dep-3">
Effect.all(stringArray, { mode: "validate" })

// $ExpectType Effect<void, Option<"err-3">[], "dep-3">
Effect.all(stringArray, { mode: "validate", discard: true })

// $ExpectType Effect<Either<string, "err-3">[], never, "dep-3">
Effect.all(stringArray, { mode: "either" })

// $ExpectType Effect<void, never, "dep-3">
Effect.all(stringArray, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
Effect.all(numberRecord)

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
Effect.all(numberRecord, undefined)

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
Effect.all(numberRecord, {})

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
Effect.all(numberRecord, { concurrency: "unbounded" })

// $ExpectType Effect<void, "err-4", "dep-4">
Effect.all(numberRecord, { discard: true })

// $ExpectType Effect<void, "err-4", "dep-4">
Effect.all(numberRecord, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<{ [x: string]: number; }, { [x: string]: Option<"err-4">; }, "dep-4">
Effect.all(numberRecord, { mode: "validate" })

// $ExpectType Effect<void, { [x: string]: Option<"err-4">; }, "dep-4">
Effect.all(numberRecord, { mode: "validate", discard: true })

// $ExpectType Effect<{ [x: string]: Either<number, "err-4">; }, never, "dep-4">
Effect.all(numberRecord, { mode: "either" })

// $ExpectType Effect<void, never, "dep-4">
Effect.all(numberRecord, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// allWith - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith())

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith(undefined))

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({}))

// $ExpectType Effect<[string, number], "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ discard: true }))

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<[string, number], [Option<"err-1">, Option<"err-2">], "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<void, [Option<"err-1">, Option<"err-2">], "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<[Either<string, "err-1">, Either<number, "err-2">], never, "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<void, never, "dep-1" | "dep-2">
pipe([string, number] as const, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith())

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith(undefined))

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({}))

// $ExpectType Effect<{ a: string; b: number; }, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ discard: true }))

// $ExpectType Effect<void, "err-1" | "err-2", "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<{ a: string; b: number; }, { a: Option<"err-1">; b: Option<"err-2">; }, "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<void, { a: Option<"err-1">; b: Option<"err-2">; }, "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<{ a: Either<string, "err-1">; b: Either<number, "err-2">; }, never, "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<void, never, "dep-1" | "dep-2">
pipe({ a: string, b: number }, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string[], "err-3", "dep-3">
pipe(stringArray, Effect.allWith())

// $ExpectType Effect<string[], "err-3", "dep-3">
pipe(stringArray, Effect.allWith(undefined))

// $ExpectType Effect<string[], "err-3", "dep-3">
pipe(stringArray, Effect.allWith({}))

// $ExpectType Effect<string[], "err-3", "dep-3">
pipe(stringArray, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<void, "err-3", "dep-3">
pipe(stringArray, Effect.allWith({ discard: true }))

// $ExpectType Effect<void, "err-3", "dep-3">
pipe(stringArray, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<string[], Option<"err-3">[], "dep-3">
pipe(stringArray, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<void, Option<"err-3">[], "dep-3">
pipe(stringArray, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<Either<string, "err-3">[], never, "dep-3">
pipe(stringArray, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<void, never, "dep-3">
pipe(stringArray, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith())

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith(undefined))

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith({}))

// $ExpectType Effect<{ [x: string]: number; }, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<void, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith({ discard: true }))

// $ExpectType Effect<void, "err-4", "dep-4">
pipe(numberRecord, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<{ [x: string]: number; }, { [x: string]: Option<"err-4">; }, "dep-4">
pipe(numberRecord, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<void, { [x: string]: Option<"err-4">; }, "dep-4">
pipe(numberRecord, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<{ [x: string]: Either<number, "err-4">; }, never, "dep-4">
pipe(numberRecord, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<void, never, "dep-4">
pipe(numberRecord, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// tacit
// -------------------------------------------------------------------------------------

const tacitString = (s: string): Effect.Effect<string> => Effect.succeed(`string ${s}`)
const tacitStringCause = (s: Cause<string>): Effect.Effect<string> => Effect.succeed(`string ${s}`)
const tacitStringPredicate = (_s: string): boolean => true
const tacitStringError = (_s: string): "a" => "a"
const tacitStringErrorEffect = (_s: string): Effect.Effect<never, "a"> => Effect.fail("a")

// $ExpectType Effect<"a", "a", never>
Effect.succeed("a" as const).pipe(Effect.filterOrFail(
  tacitStringPredicate,
  () => "a" as const
))

// $ExpectType Effect<"a", "a", never>
Effect.succeed("a" as const).pipe(Effect.filterOrFail(
  () => true,
  tacitStringError
))

// $ExpectType Effect<"a", never, never>
Effect.succeed("a" as const).pipe(Effect.filterOrDie(
  tacitStringPredicate,
  () => "fail"
))

// $ExpectType Effect<"a", never, never>
Effect.succeed("a" as const).pipe(Effect.filterOrDieMessage(
  tacitStringPredicate,
  "fail"
))

// $ExpectType Effect<"a", "a", never>
Effect.succeed("a" as const).pipe(Effect.filterOrElse(
  tacitStringPredicate,
  () => Effect.fail("a" as const)
))

// $ExpectType Effect<"a", "a", never>
Effect.succeed("a" as const).pipe(Effect.filterOrElse(
  () => true,
  tacitStringErrorEffect
))

// $ExpectType Effect<"a", never, never>
Effect.succeed("a" as const).pipe(Effect.tap(tacitString))

// $ExpectType Effect<"a", never, never>
Effect.succeed("a" as const).pipe(Effect.tap(tacitString, { onlyEffect: true }))

// @ts-expect-error
Effect.succeed("a" as const).pipe(Effect.tap(tacitStringError, { onlyEffect: true }))

// $ExpectType Effect<"a", never, never>
Effect.succeed("a" as const).pipe(Effect.tap(tacitString("a"), { onlyEffect: true }))

// @ts-expect-error
Effect.succeed("a" as const).pipe(Effect.tap("a", { onlyEffect: true }))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapError(tacitString))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapErrorCause(tacitStringCause))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapDefect(tacitStringCause))

// $ExpectType Effect<"a", "a", never>
pipe(
  Effect.succeed("a" as const) as Effect.Effect<"a", "a">,
  Effect.tapBoth({
    onFailure: tacitString,
    onSuccess: tacitString
  })
)

// -------------------------------------------------------------------------------------
// zip
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[number, string], never, never>
Effect.zip(Effect.succeed(1), Effect.succeed("a"))

// -------------------------------------------------------------------------------------
// validate
// -------------------------------------------------------------------------------------

// $ExpectType Effect<[number, string], never, never>
Effect.validate(Effect.succeed(1), Effect.succeed("a"))

// -------------------------------------------------------------------------------------
// promise
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string, never, never>
Effect.promise<string>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve("Async operation completed successfully!")
      }, 2000)
    })
)

// -------------------------------------------------------------------------------------
// tapErrorTag
// -------------------------------------------------------------------------------------

class TestError1 {
  readonly _tag = "TestError1"
}
class TestError2 {
  readonly _tag = "TestError2"
}

// $ExpectType Effect<never, TestError1, never>
pipe(
  Effect.fail(new TestError1()),
  Effect.tapErrorTag("TestError1", () => Effect.succeed(1))
)

// $ExpectType Effect<never, Error | TestError1, never>
pipe(
  Effect.fail(new TestError1()),
  Effect.tapErrorTag("TestError1", () => Effect.fail(new Error("")))
)

// $ExpectType Effect<never, Error | TestError1, never>
pipe(
  Effect.fail<TestError1 | Error>(new TestError1()),
  Effect.tapErrorTag("TestError1", () => Effect.succeed(1))
)

// $ExpectType Effect<number, TestError1 | TestError2, never>
hole<Effect.Effect<number, TestError1 | TestError2>>()
  .pipe(Effect.tapErrorTag("TestError1", Effect.log))

// -------------------------------------------------------------------------------------
// catchTag
// -------------------------------------------------------------------------------------

// @ts-expect-error
Effect.catchTag(hole<Effect.Effect<number, TestError1>>(), "wrong", () => Effect.succeed(1))

// @ts-expect-error
pipe(hole<Effect.Effect<number, TestError1>>(), Effect.catchTag("wrong", () => Effect.succeed(1)))

// @ts-expect-error
Effect.catchTag(hole<Effect.Effect<number, Error | TestError1>>(), "wrong", () => Effect.succeed(1))

// @ts-expect-error
pipe(hole<Effect.Effect<number, Error | TestError1>>(), Effect.catchTag("wrong", () => Effect.succeed(1)))

Effect.catchTag(
  hole<Effect.Effect<number, Error | TestError1 | TestError2>>(),
  "TestError1",
  (
    _e // $ExpectType TestError1
  ) => Effect.succeed(1)
)

// $ExpectType Effect<number, never, never>
Effect.catchTag(hole<Effect.Effect<number, TestError1>>(), "TestError1", (
  _e // $ExpectType TestError1
) => Effect.succeed(1))

// $ExpectType Effect<number | void, TestError2, never>
hole<Effect.Effect<number, TestError1 | TestError2>>()
  .pipe(Effect.catchTag("TestError1", Effect.log))

// $ExpectType Effect<number, never, never>
pipe(
  hole<Effect.Effect<number, TestError1>>(),
  Effect.catchTag("TestError1", (
    _e // $ExpectType TestError1
  ) => Effect.succeed(1))
)

// $ExpectType Effect<number | TestError1, TestError2, never>
Effect.catchTag(hole<Effect.Effect<number, TestError1 | TestError2>>(), "TestError1", Effect.succeed)

// $ExpectType Effect<number, TestError2, never>
pipe(
  hole<Effect.Effect<number, TestError1 | TestError2>>(),
  Effect.catchTag("TestError1", (
    _e // $ExpectType TestError1
  ) => Effect.succeed(1))
)

// $ExpectType Effect<number, Error, never>
Effect.catchTag(hole<Effect.Effect<number, TestError1 | Error>>(), "TestError1", (
  _e // $ExpectType TestError1
) => Effect.succeed(1))

// $ExpectType Effect<number, Error, never>
pipe(
  hole<Effect.Effect<number, TestError1 | Error>>(),
  Effect.catchTag("TestError1", (
    _e // $ExpectType TestError1
  ) => Effect.succeed(1))
)

// -------------------------------------------------------------------------------------
// catchTags
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number, Error, never>
pipe(
  Effect.fail<TestError1 | Error>(new Error()),
  Effect.catchTags({
    TestError1: (_e) => Effect.succeed(1)
  })
)

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

// $ExpectType Effect<number, unknown, never>
pipe(
  Effect.fail(new TestError1() as unknown),
  Effect.catchTags({
    TestError1: () => Effect.succeed(1)
  })
)

// $ExpectType Effect<number, unknown, never>
Effect.catchTags(Effect.fail(new TestError1() as unknown), {
  TestError1: () => Effect.succeed(1)
})

// -------------------------------------------------------------------------------------
// iterate
// -------------------------------------------------------------------------------------

// predicate

// $ExpectType Effect<number, never, never>
Effect.iterate(100, {
  while: (
    n // $ExpectType number
  ) => n > 0,
  body: (
    n // $ExpectType number
  ) => Effect.succeed(n - 1)
})

// refinement

// $ExpectType Effect<number | null, never, never>
Effect.iterate(100 as null | number, {
  while: (
    n // $ExpectType number | null
  ): n is number => Predicate.isNotNull(n) && n > 0,
  body: (
    n // $ExpectType number
  ) => Effect.succeed(n - 1)
})

// -------------------------------------------------------------------------------------
// loop
// -------------------------------------------------------------------------------------

// predicate

// $ExpectType Effect<number[], never, never>
Effect.loop(0, {
  while: (n) => n < 5,
  step: (n) => n + 1,
  body: (n) => Effect.succeed(n * 2)
})

// $ExpectType Effect<void, never, never>
Effect.loop(0, {
  while: (n) => n < 5,
  step: (n) => n + 1,
  body: (n) => Effect.succeed(n * 2),
  discard: true
})

// refinement

// $ExpectType Effect<number[], never, never>
Effect.loop(0 as null | number, {
  while: (
    n // $ExpectType number | null
  ): n is number => Predicate.isNotNull(n) && n < 5,
  step: (
    n // $ExpectType number
  ) => n + 1,
  body: (
    n // $ExpectType number
  ) => Effect.succeed(n * 2)
})

// $ExpectType Effect<void, never, never>
Effect.loop(0 as null | number, {
  while: (
    n // $ExpectType number | null
  ): n is number => Predicate.isNotNull(n) && n < 5,
  step: (
    n // $ExpectType number
  ) => n + 1,
  body: (
    n // $ExpectType number
  ) => Effect.succeed(n * 2),
  discard: true
})

// -------------------------------------------------------------------------------------
// dropWhile
// -------------------------------------------------------------------------------------

declare const numbersArray: Array<number>
declare const predicateNumbersOrStringsEffect: (input: number | string) => Effect.Effect<boolean>

Effect.dropWhile(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<number[], never, never>
pipe(
  numbersArray,
  Effect.dropWhile((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<number[], never, never>
pipe(
  numbersArray,
  Effect.dropWhile((
    _item: number | string
  ) => Effect.succeed(true))
)

// $ExpectType Effect<number[], never, never>
Effect.dropWhile(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<number[], never, never>
pipe(numbersArray, Effect.dropWhile(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// dropUntil
// -------------------------------------------------------------------------------------

Effect.dropUntil(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<number[], never, never>
pipe(
  numbersArray,
  Effect.dropUntil((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<number[], never, never>
pipe(
  numbersArray,
  Effect.dropUntil((
    _item: string | number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<number[], never, never>
Effect.dropUntil(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<number[], never, never>
pipe(numbersArray, Effect.dropUntil(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.andThen(string, number)

// $ExpectType Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
Effect.andThen(string, () => number)

// $ExpectType Effect<number, "err-1" | UnknownException, "dep-1">
Effect.andThen(string, Promise.resolve(123))

// $ExpectType Effect<number, "err-1" | UnknownException, "dep-1">
Effect.andThen(string, () => Promise.resolve(123))

// $ExpectType Effect<number, "err-1", "dep-1">
Effect.andThen(string, 1)

// $ExpectType Effect<number, "err-1", "dep-1">
Effect.andThen(string, () => 1)

// $ExpectType Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
string.pipe(Effect.andThen(number))

// $ExpectType Effect<number, "err-1" | "err-2", "dep-1" | "dep-2">
string.pipe(Effect.andThen(() => number))

// $ExpectType Effect<number, "err-1", "dep-1">
string.pipe(Effect.andThen(1))

// $ExpectType Effect<number, "err-1", "dep-1">
string.pipe(Effect.andThen(() => 1))

// $ExpectType Effect<number, "err-1" | UnknownException, "dep-1">
string.pipe(Effect.andThen(Promise.resolve(123)))

// $ExpectType Effect<number, "err-1" | UnknownException, "dep-1">
string.pipe(Effect.andThen(() => Promise.resolve(123)))

// -------------------------------------------------------------------------------------
// retry
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string, "err-1", "dep-1">
Effect.retry(string, Schedule.forever)

// $ExpectType Effect<string, "err-1", "dep-1">
string.pipe(Effect.retry(Schedule.forever))

// $ExpectType Effect<string, "err-1", "dep-1">
Effect.retry(string, { schedule: Schedule.forever })

// $ExpectType Effect<string, "err-1", "dep-1">
string.pipe(Effect.retry({ schedule: Schedule.forever }))

// $ExpectType Effect<string, "err-1", "dep-1">
Effect.retry(string, {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType "err-1"
  ) => true
})

// $ExpectType Effect<string, "err-1", "dep-1">
Effect.retry(string, {
  schedule: Schedule.forever,
  until: (_: string) => true
})

// $ExpectType Effect<string, "err-1", "dep-1">
string.pipe(Effect.retry({
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType "err-1"
  ) => true
}))

// $ExpectType Effect<string, "err-1", "dep-1">
string.pipe(Effect.retry({
  schedule: Schedule.forever,
  until: (_: string) => true
}))

// $ExpectType Effect<string, "err-1", "dep-1" | "dep-3">
Effect.retry(string, {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType "err-1"
  ) => boolean
})

// $ExpectType Effect<string, "err-1", "dep-1" | "dep-3">
string.pipe(Effect.retry({
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType "err-1"
  ) => boolean
}))

// $ExpectType Effect<never, "err", never>
Effect.retry(Effect.fail(""), {
  until: (
    _ // $ExpectType string
  ): _ is "err" => true
})

// $ExpectType Effect<never, "err", never>
Effect.fail("").pipe(Effect.retry({
  until: (
    _ // $ExpectType string
  ): _ is "err" => true
}))

// $ExpectType Effect<never, string, never>
Effect.retry(Effect.fail(""), {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ): _ is "err" => true
})

// -------------------------------------------------------------------------------------
// repeat
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number, "err-1", "dep-1">
Effect.repeat(string, Schedule.forever)

// $ExpectType Effect<number, "err-1", "dep-1">
string.pipe(Effect.repeat(Schedule.forever))

// $ExpectType Effect<number, "err-1", "dep-1">
Effect.repeat(string, { schedule: Schedule.forever })

// $ExpectType Effect<number, "err-1", "dep-1">
string.pipe(Effect.repeat({ schedule: Schedule.forever }))

// $ExpectType Effect<number, "err-1", "dep-1">
Effect.repeat(string, {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ) => true
})

// $ExpectType Effect<number, "err-1", "dep-1">
string.pipe(Effect.repeat({
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ) => true
}))

// $ExpectType Effect<number, "err-1", "dep-1" | "dep-3">
Effect.repeat(string, {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ) => boolean
})

// $ExpectType Effect<number, "err-1", "dep-1" | "dep-3">
string.pipe(Effect.repeat({
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ) => boolean
}))

// $ExpectType Effect<123, never, never>
Effect.repeat(Effect.succeed(123), {
  until: (
    _ // $ExpectType number
  ): _ is 123 => true
})

// $ExpectType Effect<123, never, never>
Effect.succeed(123).pipe(Effect.repeat({
  until: (
    _ // $ExpectType number
  ): _ is 123 => true
}))

// $ExpectType Effect<number, never, never>
Effect.repeat(Effect.succeed(""), {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType string
  ): _ is "hello" => true
})

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number[], never, never>
Effect.filter(numberArray, (_n: unknown) => Effect.succeed(true))

Effect.filter(numberArray, (
  _n // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<number[], never, never>
pipe(numberArray, Effect.filter((_n: unknown) => Effect.succeed(true)))

pipe(
  numberArray,
  Effect.filter((
    _n // $ExpectType number
  ) => Effect.succeed(true))
)

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

// $ExpectType Effect<Option<number>, never, never>
Effect.findFirst(numberArray, (_n: unknown) => Effect.succeed(true))

Effect.findFirst(numberArray, (
  _n // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<Option<number>, never, never>
pipe(numberArray, Effect.findFirst((_n: unknown) => Effect.succeed(true)))

pipe(
  numberArray,
  Effect.findFirst((
    _n // $ExpectType number
  ) => Effect.succeed(true))
)

// -------------------------------------------------------------------------------------
// reduceEffect
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string | number, never, never>
Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (_n: unknown): number | string => 0)

Effect.reduceEffect(numberEffectIterable, Effect.succeed(0), (
  _n // $ExpectType number
) => 0)

// $ExpectType Effect<string | number, never, never>
pipe(numberEffectIterable, Effect.reduceEffect(Effect.succeed(0), (_n: unknown): number | string => 0))

pipe(
  numberEffectIterable,
  Effect.reduceEffect(Effect.succeed(0), (
    _n // $ExpectType number
  ) => 0)
)

// -------------------------------------------------------------------------------------
// takeUntil
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number[], never, never>
Effect.takeUntil(numberArray, (_n: unknown) => Effect.succeed(true))

Effect.takeUntil(numberArray, (
  _n // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<number[], never, never>
pipe(numberArray, Effect.takeUntil((_n: unknown) => Effect.succeed(true)))

pipe(
  numberArray,
  Effect.takeUntil((
    _n // $ExpectType number
  ) => Effect.succeed(true))
)

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

// $ExpectType Effect<number[], never, never>
Effect.takeWhile(numberArray, (_n: unknown) => Effect.succeed(true))

Effect.takeWhile(numberArray, (
  _n // $ExpectType number
) => Effect.succeed(true))

// $ExpectType Effect<number[], never, never>
pipe(numberArray, Effect.takeWhile((_n: unknown) => Effect.succeed(true)))

pipe(
  numberArray,
  Effect.takeWhile((
    _n // $ExpectType number
  ) => Effect.succeed(true))
)

// -------------------------------------------------------------------------------------
// catchSome
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string | number, "err-1", "dep-1">
pipe(string, Effect.catchSome((_e: string) => Option.some(Effect.succeed(1))))

pipe(
  string,
  Effect.catchSome(
    (
      _e // $ExpectType "err-1"
    ) => Option.some(Effect.succeed(1))
  )
)

// $ExpectType Effect<string | number, "err-1", "dep-1">
Effect.catchSome(string, (_e: string) => Option.some(Effect.succeed(1)))

Effect.catchSome(string, (
  _e // $ExpectType "err-1"
) => Option.some(Effect.succeed(1)))

// $ExpectType Effect<string, "err-1", "dep-1">
Effect.retry(string, {
  schedule: Schedule.forever,
  until: (
    _ // $ExpectType "err-1"
  ) => true
})

// -------------------------------------------------------------------------------------
// retryOrElse
// -------------------------------------------------------------------------------------

// $ExpectType Effect<string | number, never, "dep-1">
Effect.retryOrElse(string, Schedule.forever, (_e: string) => Effect.succeed(0))

Effect.retryOrElse(string, Schedule.forever, (
  _e // $ExpectType "err-1"
) => Effect.succeed(0))

// $ExpectType Effect<string | number, never, "dep-1">
string.pipe(Effect.retryOrElse(Schedule.forever, (_e: string) => Effect.succeed(0)))

string.pipe(Effect.retryOrElse(Schedule.forever, (
  _e // $ExpectType "err-1"
) => Effect.succeed(0)))

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

// $ExpectType Effect<{ a: number; b: string; c: boolean; }, never, never>
pipe(
  Effect.Do,
  Effect.bind("a", (
    _scope // $ExpectType {}
  ) => Effect.succeed(1)),
  Effect.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Effect.succeed("b")),
  Effect.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// $ExpectType Effect<{ a: number; b: string; c: boolean; }, never, never>
pipe(
  Effect.succeed(1),
  Effect.bindTo("a"),
  Effect.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Effect.succeed("b")),
  Effect.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// -------------------------------------------------------------------------------------
// liftPredicate
// -------------------------------------------------------------------------------------

declare const primitiveNumber: number
declare const primitiveNumberOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// $ExpectType Effect<string, "b", never>
pipe(
  primitiveNumberOrString,
  Effect.liftPredicate(Predicate.isString, (
    _s // $ExpectType string | number
  ) => "b" as const)
)

// $ExpectType Effect<string, "b", never>
Effect.liftPredicate(primitiveNumberOrString, Predicate.isString, (
  _s // $ExpectType string | number
) => "b" as const)

// $ExpectType Effect<number, "b", never>
pipe(
  primitiveNumberOrString,
  Effect.liftPredicate(
    (
      n // $ExpectType string | number
    ): n is number => typeof n === "number",
    (
      _s // $ExpectType string | number
    ) => "b" as const
  )
)

// $ExpectType Effect<number, "b", never>
Effect.liftPredicate(
  primitiveNumberOrString,
  (
    n // $ExpectType string | number
  ): n is number => typeof n === "number",
  (
    _s // $ExpectType string | number
  ) => "b" as const
)

// $ExpectType Effect<string | number, "b", never>
pipe(
  primitiveNumberOrString,
  Effect.liftPredicate(predicateNumbersOrStrings, (
    _s // $ExpectType string | number
  ) => "b" as const)
)

// $ExpectType Effect<number, "b", never>
pipe(
  primitiveNumber,
  Effect.liftPredicate(predicateNumbersOrStrings, (
    _s // $ExpectType number
  ) => "b" as const)
)

// $ExpectType Effect<number, "b", never>
pipe(
  primitiveNumber,
  Effect.liftPredicate(
    (
      _n // $ExpectType number
    ) => true,
    (
      _s // $ExpectType number
    ) => "b" as const
  )
)

// -------------------------------------------------------------------------------------
// mapAccum
// -------------------------------------------------------------------------------------

declare const nonEmptyReadonlyStrings: NonEmptyReadonlyArray<string>
declare const strings: Array<string>

// $ExpectType Effect<[number, string[]], never, never>
Effect.mapAccum(strings, 0, (s, a, i) => Effect.succeed([s + i, a]))

// $ExpectType Effect<[number, [string, ...string[]]], never, never>
Effect.mapAccum(nonEmptyReadonlyStrings, 0, (s, a, i) => Effect.succeed([s + i, a]))

// $ExpectType Effect<[number, string[]], never, never>
pipe(
  strings,
  Effect.mapAccum(0, (s, a, i) => Effect.succeed([s + i, a]))
)

// $ExpectType Effect<[number, [string, ...string[]]], never, never>
pipe(
  nonEmptyReadonlyStrings,
  Effect.mapAccum(0, (s, a, i) => Effect.succeed([s + i, a]))
)

// -------------------------------------------------------------------------------------
// Tag.Proxy
// -------------------------------------------------------------------------------------

// $ExpectType {}
hole<Simplify<Effect.Tag.Proxy<"R", {}>>>()

// $ExpectType { a: () => Effect<1, never, "R">; }
hole<
  Simplify<
    Effect.Tag.Proxy<"R", {
      a: () => 1
    }>
  >
>()

// $ExpectType { a: (...args: readonly number[]) => Effect<void, never, "R">; }
hole<
  Simplify<
    Effect.Tag.Proxy<"R", {
      a: (...args: ReadonlyArray<number>) => void
    }>
  >
>()

// $ExpectType { a: (...args: Readonly<[1] | [2, 3]>) => Effect<void, never, "R">; }
hole<
  Simplify<
    Effect.Tag.Proxy<"R", {
      a: (...args: [1] | [2, 3]) => void
    }>
  >
>()

// $ExpectType { a: (...args: Readonly<[1] | [2, 3]>) => Effect<1, 2, 3 | "R">; }
hole<
  Simplify<
    Effect.Tag.Proxy<"R", {
      a: (...args: [1] | [2, 3]) => Effect.Effect<1, 2, 3>
    }>
  >
>()

// $ExpectType { a: Effect<1, never, "R">; }
hole<
  Simplify<
    Effect.Tag.Proxy<"R", {
      a: 1
    }>
  >
>()
