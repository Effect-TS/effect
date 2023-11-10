import * as Either from "effect/Either"
import { pipe } from "effect/Function"

declare const esn: Either.Either<string, number>
declare const esb: Either.Either<string, boolean>
declare const eeb: Either.Either<Error, boolean>

// -------------------------------------------------------------------------------------
// flip
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, string>
Either.flip(esn)

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
Either.all([esn])

// $ExpectType Either<string, [number, boolean]>
Either.all([esn, esb])

// $ExpectType Either<string | Error, [number, boolean]>
Either.all([esn, eeb])

// $ExpectType Either<string, [number, boolean]>
pipe([esn, esb] as const, Either.all)

// $ExpectType Either<string | Error, [number, boolean]>
pipe([esn, eeb] as const, Either.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, {}>
Either.all({})

// $ExpectType Either<string, { a: number; }>
Either.all({ a: esn })

// $ExpectType Either<string, { a: number; b: boolean; }>
Either.all({ a: esn, b: esb })

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
Either.all({ a: esn, b: eeb })

// $ExpectType Either<string, { a: number; b: boolean; }>
pipe({ a: esn, b: esb }, Either.all)

// $ExpectType Either<string | Error, { a: number; b: boolean; }>
pipe({ a: esn, b: eeb }, Either.all)

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
