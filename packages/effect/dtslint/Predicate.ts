import { hole, pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const u: unknown
declare const anys: ReadonlyArray<any>
declare const unknowns: ReadonlyArray<unknown>
declare const numberOrNull: ReadonlyArray<number | null>
declare const numberOrUndefined: ReadonlyArray<number | undefined>
declare const numberOrNullOrUndefined: ReadonlyArray<number | null | undefined>

// -------------------------------------------------------------------------------------
// isString
// -------------------------------------------------------------------------------------

// $ExpectType string[]
unknowns.filter(Predicate.isString)

// -------------------------------------------------------------------------------------
// isNumber
// -------------------------------------------------------------------------------------

// $ExpectType number[]
unknowns.filter(Predicate.isNumber)

// -------------------------------------------------------------------------------------
// isBoolean
// -------------------------------------------------------------------------------------

// $ExpectType boolean[]
unknowns.filter(Predicate.isBoolean)

// -------------------------------------------------------------------------------------
// isBigInt
// -------------------------------------------------------------------------------------

// $ExpectType bigint[]
unknowns.filter(Predicate.isBigInt)

// -------------------------------------------------------------------------------------
// isSymbol
// -------------------------------------------------------------------------------------

// $ExpectType symbol[]
unknowns.filter(Predicate.isSymbol)

// -------------------------------------------------------------------------------------
// isUndefined
// -------------------------------------------------------------------------------------

// $ExpectType undefined[]
unknowns.filter(Predicate.isUndefined)

// -------------------------------------------------------------------------------------
// isNotUndefined
// -------------------------------------------------------------------------------------

// $ExpectType number[]
numberOrUndefined.filter(Predicate.isNotUndefined)

// $ExpectType (number | null)[]
numberOrNullOrUndefined.filter(Predicate.isNotUndefined)

// -------------------------------------------------------------------------------------
// isUndefined
// -------------------------------------------------------------------------------------

// $ExpectType null[]
unknowns.filter(Predicate.isNull)

// -------------------------------------------------------------------------------------
// isNotUndefined
// -------------------------------------------------------------------------------------

// $ExpectType number[]
numberOrNull.filter(Predicate.isNotNull)

// $ExpectType (number | undefined)[]
numberOrNullOrUndefined.filter(Predicate.isNotNull)

// -------------------------------------------------------------------------------------
// isNever
// -------------------------------------------------------------------------------------

// $ExpectType never[]
unknowns.filter(Predicate.isNever)

// -------------------------------------------------------------------------------------
// isUnknown
// -------------------------------------------------------------------------------------

// $ExpectType unknown[]
anys.filter(Predicate.isUnknown)

// -------------------------------------------------------------------------------------
// isObject
// -------------------------------------------------------------------------------------

// $ExpectType object[]
anys.filter(Predicate.isObject)

// -------------------------------------------------------------------------------------
// isTagged
// -------------------------------------------------------------------------------------

// $ExpectType { _tag: "a"; }[]
anys.filter(Predicate.isTagged("a"))

// -------------------------------------------------------------------------------------
// isNullable
// -------------------------------------------------------------------------------------

// $ExpectType null[]
numberOrNull.filter(Predicate.isNullable)

// $ExpectType undefined[]
numberOrUndefined.filter(Predicate.isNullable)

// $ExpectType (null | undefined)[]
numberOrNullOrUndefined.filter(Predicate.isNullable)

if (Predicate.isNullable(u)) {
  // $ExpectType never
  u
}

// -------------------------------------------------------------------------------------
// isNotNullable
// -------------------------------------------------------------------------------------

// $ExpectType number[]
numberOrNull.filter(Predicate.isNotNullable)

// $ExpectType number[]
numberOrUndefined.filter(Predicate.isNotNullable)

// $ExpectType number[]
numberOrNullOrUndefined.filter(Predicate.isNotNullable)

if (Predicate.isNotNullable(u)) {
  // $ExpectType {}
  u
}

// -------------------------------------------------------------------------------------
// isError
// -------------------------------------------------------------------------------------

// $ExpectType Error[]
unknowns.filter(Predicate.isError)

// -------------------------------------------------------------------------------------
// isUint8Array
// -------------------------------------------------------------------------------------

// TODO: Re-enable this test when the minimum TypeScript version used by @effect/dtslint is 5.7.2
// This test has been disabled because it is not possible to test it
// after upgrading to TypeScript 5.7.2. For versions less than 5.7.2,
// the inferred type is just `Uint8Array[]`.
// // $ExpectType Uint8Array<ArrayBufferLike>[]
// unknowns.filter(Predicate.isUint8Array)

// -------------------------------------------------------------------------------------
// isDate
// -------------------------------------------------------------------------------------

// $ExpectType Date[]
unknowns.filter(Predicate.isDate)

// -------------------------------------------------------------------------------------
// isRecord
// -------------------------------------------------------------------------------------

// $ExpectType { [x: string]: unknown; [x: symbol]: unknown; }[]
unknowns.filter(Predicate.isRecord)

// -------------------------------------------------------------------------------------
// isReadonlyRecord
// -------------------------------------------------------------------------------------

// $ExpectType { readonly [x: string]: unknown; readonly [x: symbol]: unknown; }[]
unknowns.filter(Predicate.isReadonlyRecord)

// -------------------------------------------------------------------------------------
// isTupleOf
// -------------------------------------------------------------------------------------

if (Predicate.isTupleOf(unknowns, 3)) {
  // $ExpectType [unknown, unknown, unknown]
  unknowns
}

// -------------------------------------------------------------------------------------
// isTupleOfAtLeast
// -------------------------------------------------------------------------------------

if (Predicate.isTupleOfAtLeast(unknowns, 3)) {
  // $ExpectType [unknown, unknown, unknown, ...unknown[]]
  unknowns
}

// -------------------------------------------------------------------------------------
// isRegExp
// -------------------------------------------------------------------------------------

// $ExpectType RegExp[]
unknowns.filter(Predicate.isRegExp)

// -------------------------------------------------------------------------------------
// compose
// -------------------------------------------------------------------------------------

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}

type NonEmptyString = string & NonEmptyStringBrand

declare const isNonEmptyString: Predicate.Refinement<string, NonEmptyString>

// $ExpectType Refinement<unknown, NonEmptyString>
pipe(Predicate.isString, Predicate.compose(isNonEmptyString))

// $ExpectType Refinement<unknown, NonEmptyString>
Predicate.compose(Predicate.isString, isNonEmptyString)

// $ExpectType Refinement<unknown, NonEmptyString>
pipe(
  Predicate.isString,
  Predicate.compose((
    s // $ExpectType string
  ): s is NonEmptyString => s.length > 0)
)

// $ExpectType Refinement<unknown, NonEmptyString>
Predicate.compose(Predicate.isString, (
  s // $ExpectType string
): s is NonEmptyString => s.length > 0)

// $ExpectType Refinement<unknown, string>
pipe(Predicate.isString, Predicate.compose((s) => /^a/.test(s)))

// -------------------------------------------------------------------------------------
// and
// -------------------------------------------------------------------------------------

declare const isPositive: Predicate.Predicate<number>
declare const isLessThan2: Predicate.Predicate<number>

// $ExpectType Predicate<number>
pipe(isPositive, Predicate.and(isLessThan2))

// $ExpectType Predicate<number>
Predicate.and(isPositive, isLessThan2)

// $ExpectType Predicate<number>
pipe(Predicate.isNumber, Predicate.and(isPositive))

// $ExpectType Predicate<number>
Predicate.and(Predicate.isNumber, isPositive)

declare const hasa: Predicate.Refinement<unknown, { a: unknown }>
declare const hasb: Predicate.Refinement<unknown, { b: unknown }>

// $ExpectType Refinement<unknown, { a: unknown; } & { b: unknown; }>
pipe(hasa, Predicate.and(hasb))

// $ExpectType Refinement<unknown, { a: unknown; } & { b: unknown; }>
Predicate.and(hasa, hasb)

// -------------------------------------------------------------------------------------
// or
// -------------------------------------------------------------------------------------

// $ExpectType Predicate<number>
pipe(hole<Predicate.Predicate<number>>(), Predicate.or(hole<Predicate.Predicate<number>>()))

// $ExpectType Predicate<number>
Predicate.or(hole<Predicate.Predicate<number>>(), hole<Predicate.Predicate<number>>())

// $ExpectType Refinement<unknown, string | number>
pipe(Predicate.isString, Predicate.or(Predicate.isNumber))

// $ExpectType Refinement<unknown, string | number>
Predicate.or(Predicate.isString, Predicate.isNumber)

// -------------------------------------------------------------------------------------
// tuple
// -------------------------------------------------------------------------------------

const isA = hole<Predicate.Refinement<string, "a">>()
const isTrue = hole<Predicate.Refinement<boolean, true>>()
const isOdd = hole<Predicate.Predicate<number>>()

// $ExpectType Refinement<readonly [boolean, string], readonly [true, "a"]>
Predicate.tuple(isTrue, isA)

// $ExpectType Refinement<readonly [boolean, number], readonly [true, number]>
Predicate.tuple(isTrue, isOdd)

// $ExpectType Predicate<readonly [number, number]>
Predicate.tuple(isOdd, isOdd)

// $ExpectType Predicate<readonly number[]>
Predicate.tuple(...hole<Array<Predicate.Predicate<number>>>())

// $ExpectType Refinement<readonly never[], readonly never[]>
Predicate.tuple(...hole<Array<Predicate.Predicate<number> | Predicate.Refinement<boolean, true>>>())

// $ExpectType Refinement<readonly boolean[], readonly true[]>
Predicate.tuple(...hole<Array<Predicate.Refinement<boolean, true>>>())

// -------------------------------------------------------------------------------------
// struct
// -------------------------------------------------------------------------------------

// $ExpectType Refinement<{ readonly a: string; readonly true: boolean; }, { readonly a: "a"; readonly true: true; }>
Predicate.struct({
  a: isA,
  true: isTrue
})

// $ExpectType Refinement<{ readonly odd: number; readonly true: boolean; }, { readonly odd: number; readonly true: true; }>
Predicate.struct({
  odd: isOdd,
  true: isTrue
})

// $ExpectType Predicate<{ readonly odd: number; readonly odd1: number; }>
Predicate.struct({
  odd: isOdd,
  odd1: isOdd
})
