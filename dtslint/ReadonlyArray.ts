import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as RA from "effect/ReadonlyArray"

declare const nonEmptyReadonlyNumbers: RA.NonEmptyReadonlyArray<number>
declare const nonEmptyNumbers: RA.NonEmptyArray<number>
declare const readonlyNumbers: ReadonlyArray<number>
declare const numbers: Array<number>
declare const numbersOrStrings: Array<number | string>
declare const nonEmptyReadonlyNumbersOrStrings: RA.NonEmptyReadonlyArray<number | string>

// -------------------------------------------------------------------------------------
// isEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (RA.isEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly []
  readonlyNumbers
}

// $ExpectType <A>(c: readonly A[]) => Option<readonly []>
Option.liftPredicate(RA.isEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isEmptyArray
// -------------------------------------------------------------------------------------

if (RA.isEmptyArray(numbers)) {
  // $ExpectType []
  numbers
}

// $ExpectType <A>(c: A[]) => Option<[]>
Option.liftPredicate(RA.isEmptyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (RA.isNonEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly [number, ...number[]]
  readonlyNumbers
}

// $ExpectType <A>(c: readonly A[]) => Option<readonly [A, ...A[]]>
Option.liftPredicate(RA.isNonEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyArray
// -------------------------------------------------------------------------------------

if (RA.isNonEmptyArray(numbers)) {
  // $ExpectType [number, ...number[]]
  numbers
}

// $ExpectType <A>(c: A[]) => Option<[A, ...A[]]>
Option.liftPredicate(RA.isNonEmptyArray)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType number[]
RA.map(readonlyNumbers, (n) => n + 1)

// $ExpectType number[]
pipe(readonlyNumbers, RA.map((n) => n + 1))

// $ExpectType number[]
RA.map(numbers, (n) => n + 1)

// $ExpectType number[]
pipe(numbers, RA.map((n) => n + 1))

// $ExpectType [number, ...number[]]
RA.map(nonEmptyReadonlyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyReadonlyNumbers, RA.map((n) => n + 1))

// $ExpectType [number, ...number[]]
RA.map(nonEmptyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyNumbers, RA.map((n) => n + 1))

// -------------------------------------------------------------------------------------
// groupBy
// -------------------------------------------------------------------------------------

// baseline
// $ExpectType Record<string, [number, ...number[]]>
RA.groupBy([1, 2, 3], String)

// should not return a struct (Record<'positive' | 'negative', ...>) when using string type literals
// $ExpectType Record<string, [number, ...number[]]>
RA.groupBy([1, 2, 3], (n) => n > 0 ? "positive" as const : "negative" as const)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (RA.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly [string | number, ...(string | number)[]]
}

if (RA.some(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly [string | number, ...(string | number)[]]
}

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (RA.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

if (RA.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
RA.append(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
RA.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType [string | number, ...(string | number)[]]
RA.appendAllNonEmpty(numbersOrStrings, nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.appendAllNonEmpty(numbersOrStrings)(nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.appendAllNonEmpty(nonEmptyReadonlyNumbersOrStrings, numbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.appendAllNonEmpty(nonEmptyReadonlyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
RA.prepend(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
RA.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType [string | number, ...(string | number)[]]
RA.prependAllNonEmpty(numbersOrStrings, nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.prependAllNonEmpty(numbersOrStrings)(nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.prependAllNonEmpty(nonEmptyReadonlyNumbersOrStrings, numbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
RA.prependAllNonEmpty(nonEmptyReadonlyNumbersOrStrings)(numbersOrStrings)
