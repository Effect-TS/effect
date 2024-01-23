import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"

declare const string$string: Either.Either<string, string>
declare const string$number: Either.Either<string, number>
declare const string$boolean: Either.Either<string, boolean>
declare const error$boolean: Either.Either<Error, boolean>

declare const error$a: Either.Either<Error, "a">

declare const predicateUnknown: Predicate.Predicate<unknown>

// -------------------------------------------------------------------------------------
// flip
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, string>
Either.flip(string$number)

// -------------------------------------------------------------------------------------
// try
// -------------------------------------------------------------------------------------

// $ExpectType Either<unknown, number>
Either.try(() => 1)

// $ExpectType Either<Error, number>
Either.try({ try: () => 1, catch: () => new Error() })

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, []>
Either.all([])

// $ExpectType Either<string, [number]>
Either.all([string$number])

// $ExpectType Either<string, [number, boolean]>
Either.all([string$number, string$boolean])

// $ExpectType Either<string | Error, [number, boolean]>
Either.all([string$number, error$boolean])

// $ExpectType Either<string, [number, boolean]>
pipe([string$number, string$boolean] as const, Either.all)

// $ExpectType Either<string | Error, [number, boolean]>
pipe([string$number, error$boolean] as const, Either.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, {}>
Either.all({})

// $ExpectType Either<string, { a: number; }>
Either.all({ a: string$number })

// $ExpectType Either<string, { a: number; b: boolean; }>
Either.all({ a: string$number, b: string$boolean })

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
Either.all({ a: string$number, b: error$boolean })

// $ExpectType Either<string, { a: number; b: boolean; }>
pipe({ a: string$number, b: string$boolean }, Either.all)

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
pipe({ a: string$number, b: error$boolean }, Either.all)

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

declare const eitherArray: Array<Either.Either<string, number>>

// $ExpectType Either<string, number[]>
Either.all(eitherArray)

// $ExpectType Either<string, number[]>
pipe(eitherArray, Either.all)

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

declare const eitherRecord: Record<string, Either.Either<string, number>>

// $ExpectType Either<string, { [x: string]: number; }>
Either.all(eitherRecord)

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Either<string, number>
Either.andThen(string$string, string$number)

// $ExpectType Either<string, number>
Either.andThen(string$string, () => string$number)

// $ExpectType Either<string, number>
string$string.pipe(Either.andThen(string$number))

// $ExpectType Either<string, number>
string$string.pipe(Either.andThen(() => string$number))

// -------------------------------------------------------------------------------------
// filterOrLeft
// -------------------------------------------------------------------------------------

declare const error$arrayOfStrings: Either.Either<Error, Array<string>>

// $ExpectType Either<"b" | Error, [string, ...string[]]>
pipe(
  error$arrayOfStrings,
  Either.filterOrLeft(ReadonlyArray.isNonEmptyArray, (
    _s // $ExpectType string[]
  ) => "b" as const)
)

declare const error$readonlyArrayOfStrings: Either.Either<Error, ReadonlyArray<string>>

// $ExpectType Either<"b" | Error, readonly [string, ...string[]]>
pipe(
  error$readonlyArrayOfStrings,
  Either.filterOrLeft(ReadonlyArray.isNonEmptyReadonlyArray, (
    _s // $ExpectType readonly string[]
  ) => "b" as const)
)

declare const error$stringOrNumber: Either.Either<Error, string | number>

// $ExpectType Either<"b" | Error, string>
pipe(
  error$stringOrNumber,
  Either.filterOrLeft(Predicate.isString, (
    _s // $ExpectType number
  ) => "b" as const)
)

// $ExpectType Either<"b" | Error, string>
Either.filterOrLeft(error$stringOrNumber, Predicate.isString, (
  _s // $ExpectType number
) => "b" as const)

// $ExpectType Either<"b" | Error, string>
pipe(
  error$stringOrNumber,
  Either.filterOrLeft(Predicate.isString, (
    _s // $ExpectType number
  ) => "b" as const)
)

// $ExpectType Either<"b" | Error, "a">
pipe(
  error$a,
  Either.filterOrLeft(Predicate.isString, (
    _s // $ExpectType "a"
  ) => "b" as const)
)

// $ExpectType Either<"b" | Error, "a">
pipe(
  error$a,
  Either.filterOrLeft(Predicate.isString, (
    _s: string
  ) => "b" as const)
)

// $ExpectType Either<"b" | Error, "a">
pipe(
  error$a,
  Either.filterOrLeft(predicateUnknown, (
    _s // $ExpectType "a"
  ) => "b" as const)
)

// $ExpectType Either<"b" | Error, "a">
pipe(
  error$a,
  Either.filterOrLeft(predicateUnknown, (
    _s: string
  ) => "b" as const)
)
