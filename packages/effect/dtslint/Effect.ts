import type { Cause } from "effect/Cause"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const string: Effect.Effect<"dep-1", "err-1", string>
declare const number: Effect.Effect<"dep-2", "err-2", number>
declare const stringArray: Array<Effect.Effect<"dep-3", "err-3", string>>
declare const numberRecord: Record<string, Effect.Effect<"dep-4", "err-4", number>>

// -------------------------------------------------------------------------------------
// forEach
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1", "err-1", string[]>
Effect.forEach(["a", "b"], (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string)

// $ExpectType Effect<"dep-1", "err-1", void>
Effect.forEach(["a", "b"], (
  // $ExpectType string
  _a,
  // $ExpectType number
  _i
) => string, { discard: true })

// $ExpectType Effect<"dep-1", "err-1", string[]>
pipe(
  ["a", "b"],
  Effect.forEach((
    // $ExpectType string
    _a,
    // $ExpectType number
    _i
  ) => string)
)

// $ExpectType Effect<"dep-1", "err-1", void>
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
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number])

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], undefined)

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], [string, number]>
Effect.all([string, number], { mode: "validate" })

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], void>
Effect.all([string, number], { mode: "validate", discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", never, [Either<"err-1", string>, Either<"err-2", number>]>
Effect.all([string, number], { mode: "either" })

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
Effect.all([string, number], { mode: "either", discard: true })
// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, undefined)

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, { a: string; b: number; }>
Effect.all({ a: string, b: number }, { mode: "validate" })

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, void>
Effect.all({ a: string, b: number }, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", never, { a: Either<"err-1", string>; b: Either<"err-2", number>; }>
Effect.all({ a: string, b: number }, { mode: "either" })

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
Effect.all({ a: string, b: number }, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray)

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, undefined)

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, {})

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-3", Option<"err-3">[], string[]>
Effect.all(stringArray, { mode: "validate" })

// $ExpectType Effect<"dep-3", Option<"err-3">[], void>
Effect.all(stringArray, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-3", never, Either<"err-3", string>[]>
Effect.all(stringArray, { mode: "either" })

// $ExpectType Effect<"dep-3", never, void>
Effect.all(stringArray, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord)

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, undefined)

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, {})

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, { [x: string]: number; }>
Effect.all(numberRecord, { mode: "validate" })

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, void>
Effect.all(numberRecord, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-4", never, { [x: string]: Either<"err-4", number>; }>
Effect.all(numberRecord, { mode: "either" })

// $ExpectType Effect<"dep-4", never, void>
Effect.all(numberRecord, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// allWith - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.allWith())

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.allWith(undefined))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.allWith({}))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe([string, number] as const, Effect.allWith({ discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe([string, number] as const, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], [string, number]>
pipe([string, number] as const, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], void>
pipe([string, number] as const, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", never, [Either<"err-1", string>, Either<"err-2", number>]>
pipe([string, number] as const, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
pipe([string, number] as const, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.allWith())

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.allWith(undefined))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.allWith({}))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe({ a: string, b: number }, Effect.allWith({ discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe({ a: string, b: number }, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, void>
pipe({ a: string, b: number }, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", never, { a: Either<"err-1", string>; b: Either<"err-2", number>; }>
pipe({ a: string, b: number }, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
pipe({ a: string, b: number }, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.allWith())

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.allWith(undefined))

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.allWith({}))

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-3", "err-3", void>
pipe(stringArray, Effect.allWith({ discard: true }))

// $ExpectType Effect<"dep-3", "err-3", void>
pipe(stringArray, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<"dep-3", Option<"err-3">[], string[]>
pipe(stringArray, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<"dep-3", Option<"err-3">[], void>
pipe(stringArray, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<"dep-3", never, Either<"err-3", string>[]>
pipe(stringArray, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<"dep-3", never, void>
pipe(stringArray, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// allWith - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.allWith())

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.allWith(undefined))

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.allWith({}))

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.allWith({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-4", "err-4", void>
pipe(numberRecord, Effect.allWith({ discard: true }))

// $ExpectType Effect<"dep-4", "err-4", void>
pipe(numberRecord, Effect.allWith({ discard: true, concurrency: "unbounded" }))

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, { [x: string]: number; }>
pipe(numberRecord, Effect.allWith({ mode: "validate" }))

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, void>
pipe(numberRecord, Effect.allWith({ mode: "validate", discard: true }))

// $ExpectType Effect<"dep-4", never, { [x: string]: Either<"err-4", number>; }>
pipe(numberRecord, Effect.allWith({ mode: "either" }))

// $ExpectType Effect<"dep-4", never, void>
pipe(numberRecord, Effect.allWith({ mode: "either", discard: true }))

// -------------------------------------------------------------------------------------
// tacit
// -------------------------------------------------------------------------------------

const tacitString = (s: string): Effect.Effect<never, never, string> => Effect.succeed(`string ${s}`)
const tacitStringCause = (s: Cause<string>): Effect.Effect<never, never, string> => Effect.succeed(`string ${s}`)
const tacitStringPredicate = (_s: string): boolean => true
const tacitStringError = (_s: string): "a" => "a"
const tacitStringErrorEffect = (_s: string): Effect.Effect<never, "a", never> => Effect.fail("a")

// $ExpectType Effect<never, "a", "a">
Effect.succeed("a" as const).pipe(Effect.filterOrFail(
  tacitStringPredicate,
  () => "a" as const
))

// $ExpectType Effect<never, "a", "a">
Effect.succeed("a" as const).pipe(Effect.filterOrFail(
  () => true,
  tacitStringError
))

// $ExpectType Effect<never, never, "a">
Effect.succeed("a" as const).pipe(Effect.filterOrDie(
  tacitStringPredicate,
  () => "fail"
))

// $ExpectType Effect<never, never, "a">
Effect.succeed("a" as const).pipe(Effect.filterOrDieMessage(
  tacitStringPredicate,
  "fail"
))

// $ExpectType Effect<never, "a", "a">
Effect.succeed("a" as const).pipe(Effect.filterOrElse(
  tacitStringPredicate,
  () => Effect.fail("a" as const)
))

// $ExpectType Effect<never, "a", "a">
Effect.succeed("a" as const).pipe(Effect.filterOrElse(
  () => true,
  tacitStringErrorEffect
))

// $ExpectType Effect<never, never, "a">
Effect.succeed("a" as const).pipe(Effect.tap(tacitString))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapError(tacitString))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapErrorCause(tacitStringCause))

// $ExpectType Effect<never, "a", never>
Effect.fail("a" as const).pipe(Effect.tapDefect(tacitStringCause))

// $ExpectType Effect<never, "a", "a">
pipe(
  Effect.succeed("a" as const) as Effect.Effect<never, "a", "a">,
  Effect.tapBoth({
    onFailure: tacitString,
    onSuccess: tacitString
  })
)

// -------------------------------------------------------------------------------------
// zip
// -------------------------------------------------------------------------------------

// $ExpectType Effect<never, never, [number, string]>
Effect.zip(Effect.succeed(1), Effect.succeed("a"))

// -------------------------------------------------------------------------------------
// validate
// -------------------------------------------------------------------------------------

// $ExpectType Effect<never, never, [number, string]>
Effect.validate(Effect.succeed(1), Effect.succeed("a"))

// -------------------------------------------------------------------------------------
// promise
// -------------------------------------------------------------------------------------

// $ExpectType Effect<never, never, string>
Effect.promise<string>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve("Async operation completed successfully!")
      }, 2000)
    })
)

class TestError1 {
  readonly _tag = "TestError1"
  constructor() {}
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

// $ExpectType Effect<never, Error, number>
pipe(
  Effect.fail<TestError1 | Error>(new TestError1()),
  Effect.catchTag("TestError1", () => Effect.succeed(1))
)

// $ExpectType Effect<never, Error | TestError1, never>
pipe(
  Effect.fail<TestError1 | Error>(new TestError1()),
  Effect.tapErrorTag("TestError1", () => Effect.succeed(1))
)

// $ExpectType Effect<never, Error, number>
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

// $ExpectType Effect<never, unknown, number>
pipe(
  Effect.fail(new TestError1() as unknown),
  Effect.catchTags({
    TestError1: () => Effect.succeed(1)
  })
)

// $ExpectType Effect<never, unknown, number>
Effect.catchTags(Effect.fail(new TestError1() as unknown), {
  TestError1: () => Effect.succeed(1)
})

// -------------------------------------------------------------------------------------
// iterate
// -------------------------------------------------------------------------------------

// predicate

// $ExpectType Effect<never, never, number>
Effect.iterate(100, {
  while: (
    n // $ExpectType number
  ) => n > 0,
  body: (
    n // $ExpectType number
  ) => Effect.succeed(n - 1)
})

// refinement

// $ExpectType Effect<never, never, number | null>
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

// $ExpectType Effect<never, never, number[]>
Effect.loop(0, {
  while: (n) => n < 5,
  step: (n) => n + 1,
  body: (n) => Effect.succeed(n * 2)
})

// $ExpectType Effect<never, never, void>
Effect.loop(0, {
  while: (n) => n < 5,
  step: (n) => n + 1,
  body: (n) => Effect.succeed(n * 2),
  discard: true
})

// refinement

// $ExpectType Effect<never, never, number[]>
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

// $ExpectType Effect<never, never, void>
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
declare const predicateNumbersOrStringsEffect: (input: number | string) => Effect.Effect<never, never, boolean>

Effect.dropWhile(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

pipe(
  numbersArray,
  Effect.dropWhile((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<never, never, number[]>
Effect.dropWhile(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<never, never, number[]>
pipe(numbersArray, Effect.dropWhile(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// dropUntil
// -------------------------------------------------------------------------------------

Effect.dropUntil(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

pipe(
  numbersArray,
  Effect.dropUntil((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<never, never, number[]>
Effect.dropUntil(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<never, never, number[]>
pipe(numbersArray, Effect.dropUntil(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// takeUntil
// -------------------------------------------------------------------------------------

Effect.takeUntil(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

pipe(
  numbersArray,
  Effect.takeUntil((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<never, never, number[]>
Effect.takeUntil(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<never, never, number[]>
pipe(numbersArray, Effect.takeUntil(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

Effect.takeWhile(numbersArray, (
  _item // $ExpectType number
) => Effect.succeed(true))

pipe(
  numbersArray,
  Effect.takeWhile((
    _item // $ExpectType number
  ) => Effect.succeed(true))
)

// $ExpectType Effect<never, never, number[]>
Effect.takeWhile(numbersArray, predicateNumbersOrStringsEffect)

// $ExpectType Effect<never, never, number[]>
pipe(numbersArray, Effect.takeWhile(predicateNumbersOrStringsEffect))

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", number>
Effect.andThen(string, number)

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", number>
Effect.andThen(string, () => number)

// $ExpectType Effect<"dep-1", "err-1" | UnknownException, number>
Effect.andThen(string, Promise.resolve(123))

// $ExpectType Effect<"dep-1", "err-1" | UnknownException, number>
Effect.andThen(string, () => Promise.resolve(123))

// $ExpectType Effect<"dep-1", "err-1", number>
Effect.andThen(string, 1)

// $ExpectType Effect<"dep-1", "err-1", number>
Effect.andThen(string, () => 1)

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", number>
string.pipe(Effect.andThen(number))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", number>
string.pipe(Effect.andThen(() => number))

// $ExpectType Effect<"dep-1", "err-1", number>
string.pipe(Effect.andThen(1))

// $ExpectType Effect<"dep-1", "err-1", number>
string.pipe(Effect.andThen(() => 1))

// $ExpectType Effect<"dep-1", "err-1" | UnknownException, number>
string.pipe(Effect.andThen(Promise.resolve(123)))

// $ExpectType Effect<"dep-1", "err-1" | UnknownException, number>
string.pipe(Effect.andThen(() => Promise.resolve(123)))
