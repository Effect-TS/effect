import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"

declare const string$string: Either.Either<string, string>
declare const string$number: Either.Either<number, string>
declare const string$boolean: Either.Either<boolean, string>
declare const error$boolean: Either.Either<boolean, Error>

declare const error$a: Either.Either<"a", Error>

declare const predicateUnknown: Predicate.Predicate<unknown>

// -------------------------------------------------------------------------------------
// flip
// -------------------------------------------------------------------------------------

// $ExpectType Either<string, number>
Either.flip(string$number)

// -------------------------------------------------------------------------------------
// try
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, unknown>
Either.try(() => 1)

// $ExpectType Either<number, Error>
Either.try({ try: () => 1, catch: () => new Error() })

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Either<[], never>
Either.all([])

// $ExpectType Either<[number], string>
Either.all([string$number])

// $ExpectType Either<[number, boolean], string>
Either.all([string$number, string$boolean])

// $ExpectType Either<[number, boolean], string | Error>
Either.all([string$number, error$boolean])

// $ExpectType Either<[number, boolean], string>
pipe([string$number, string$boolean] as const, Either.all)

// $ExpectType Either<[number, boolean], string | Error>
pipe([string$number, error$boolean] as const, Either.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Either<{}, never>
Either.all({})

// $ExpectType Either<{ a: number; }, string>
Either.all({ a: string$number })

// $ExpectType Either<{ a: number; b: boolean; }, string>
Either.all({ a: string$number, b: string$boolean })

// $ExpectType Either<{ a: number; b: boolean; }, string | Error>
Either.all({ a: string$number, b: error$boolean })

// $ExpectType Either<{ a: number; b: boolean; }, string>
pipe({ a: string$number, b: string$boolean }, Either.all)

// $ExpectType Either<{ a: number; b: boolean; }, string | Error>
pipe({ a: string$number, b: error$boolean }, Either.all)

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

declare const eitherArray: Array<Either.Either<number, string>>

// $ExpectType Either<number[], string>
Either.all(eitherArray)

// $ExpectType Either<number[], string>
pipe(eitherArray, Either.all)

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

declare const eitherRecord: Record<string, Either.Either<number, string>>

// $ExpectType Either<{ [x: string]: number; }, string>
Either.all(eitherRecord)

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, string>
Either.andThen(string$string, string$number)

// $ExpectType Either<number, string>
Either.andThen(string$string, () => string$number)

// $ExpectType Either<number, string>
string$string.pipe(Either.andThen(string$number))

// $ExpectType Either<number, string>
string$string.pipe(Either.andThen(() => string$number))

// -------------------------------------------------------------------------------------
// filterOrLeft
// -------------------------------------------------------------------------------------

declare const error$arrayOfStrings: Either.Either<Array<string>, Error>

// $ExpectType Either<[string, ...string[]], "b" | Error>
pipe(
  error$arrayOfStrings,
  Either.filterOrLeft(ReadonlyArray.isNonEmptyArray, (
    _s // $ExpectType string[]
  ) => "b" as const)
)

declare const error$readonlyArrayOfStrings: Either.Either<ReadonlyArray<string>, Error>

// $ExpectType Either<readonly [string, ...string[]], "b" | Error>
pipe(
  error$readonlyArrayOfStrings,
  Either.filterOrLeft(ReadonlyArray.isNonEmptyReadonlyArray, (
    _s // $ExpectType readonly string[]
  ) => "b" as const)
)

// $ExpectType Either<"a", "b" | Error>
pipe(
  error$a,
  Either.filterOrLeft(Predicate.isString, (
    _s // $ExpectType "a"
  ) => "b" as const)
)

// $ExpectType Either<"a", "b" | Error>
pipe(
  error$a,
  Either.filterOrLeft(Predicate.isString, (
    _s: string
  ) => "b" as const)
)

// $ExpectType Either<"a", "b" | Error>
pipe(
  error$a,
  Either.filterOrLeft(predicateUnknown, (
    _s // $ExpectType "a"
  ) => "b" as const)
)

// $ExpectType Either<"a", "b" | Error>
pipe(
  error$a,
  Either.filterOrLeft(predicateUnknown, (
    _s: string
  ) => "b" as const)
)
