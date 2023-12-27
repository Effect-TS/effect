import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const u: unknown
declare const anys: Array<any>
declare const unknowns: Array<unknown>
declare const numberOrNull: Array<number | null>
declare const numberOrUndefined: Array<number | undefined>
declare const numberOrNullOrUndefined: Array<number | null | undefined>

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

// $ExpectType Uint8Array[]
unknowns.filter(Predicate.isUint8Array)

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
