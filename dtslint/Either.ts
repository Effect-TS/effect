import * as Either from "effect/Either"
import { pipe } from "effect/Function"

declare const stringOrString: Either.Either<string, string>
declare const stringOrNumber: Either.Either<string, number>
declare const stringOrBoolean: Either.Either<string, boolean>
declare const errorOrBoolean: Either.Either<Error, boolean>

// -------------------------------------------------------------------------------------
// flip
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, string>
Either.flip(stringOrNumber)

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
Either.all([stringOrNumber])

// $ExpectType Either<string, [number, boolean]>
Either.all([stringOrNumber, stringOrBoolean])

// $ExpectType Either<string | Error, [number, boolean]>
Either.all([stringOrNumber, errorOrBoolean])

// $ExpectType Either<string, [number, boolean]>
pipe([stringOrNumber, stringOrBoolean] as const, Either.all)

// $ExpectType Either<string | Error, [number, boolean]>
pipe([stringOrNumber, errorOrBoolean] as const, Either.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, {}>
Either.all({})

// $ExpectType Either<string, { a: number; }>
Either.all({ a: stringOrNumber })

// $ExpectType Either<string, { a: number; b: boolean; }>
Either.all({ a: stringOrNumber, b: stringOrBoolean })

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
Either.all({ a: stringOrNumber, b: errorOrBoolean })

// $ExpectType Either<string, { a: number; b: boolean; }>
pipe({ a: stringOrNumber, b: stringOrBoolean }, Either.all)

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
pipe({ a: stringOrNumber, b: errorOrBoolean }, Either.all)

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
Either.andThen(stringOrString, stringOrNumber)

// $ExpectType Either<string, number>
Either.andThen(stringOrString, () => stringOrNumber)

// $ExpectType Either<string, number>
stringOrString.pipe(Either.andThen(stringOrNumber))

// $ExpectType Either<string, number>
stringOrString.pipe(Either.andThen(() => stringOrNumber))
