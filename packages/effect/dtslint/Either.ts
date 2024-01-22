import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const string$string: Either.Either<string, string>
declare const string$number: Either.Either<string, number>
declare const string$boolean: Either.Either<string, boolean>
declare const error$boolean: Either.Either<Error, boolean>

declare const error$numberOrString: Either.Either<Error, number | string>
declare const error$number: Either.Either<Error, number>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

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
// filter
// -------------------------------------------------------------------------------------

Either.filterOrLeft(error$numberOrString, (
  _item // $ExpectType string | number
) => true, (
  _a // $ExpectType string | number
) => "a")

// @ts-expect-error
ReadonlyArray.filter(error$numberOrString, (
  _item: string
) => true)

pipe(
  error$numberOrString,
  Either.filterOrLeft((
    _item // $ExpectType string | number
  ) => true, (
    _a // $ExpectType string | number
  ) => "a")
)

pipe(
  error$numberOrString,
  // @ts-expect-error
  Either.filterOrLeft((
    _item: string
  ) => true, () => "a")
)

// $ExpectType Either<string | Error, string | number>
Either.filterOrLeft(error$numberOrString, predicateNumbersOrStrings, (
  _a // $ExpectType string | number
) => "a")

// $ExpectType Either<string | Error, number>
Either.filterOrLeft(error$number, predicateNumbersOrStrings, (
  _a // $ExpectType number
) => "a")

// $ExpectType Either<string | Error, string | number>
pipe(
  error$numberOrString,
  Either.filterOrLeft(predicateNumbersOrStrings, (
    _a // $ExpectType string | number
  ) => "a")
)

// $ExpectType Either<string | Error, number>
pipe(
  error$number,
  Either.filterOrLeft(predicateNumbersOrStrings, (
    _a // $ExpectType number
  ) => "a")
)

// $ExpectType Either<string | Error, number>
Either.filterOrLeft(error$numberOrString, Predicate.isNumber, (
  _a // $ExpectType string | number
) => "a")

// $ExpectType Either<string | Error, number>
pipe(
  error$numberOrString,
  Either.filterOrLeft(Predicate.isNumber, (
    _a // $ExpectType string | number
  ) => "a")
)
