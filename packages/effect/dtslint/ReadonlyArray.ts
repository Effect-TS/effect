import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import type * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"

declare const nonEmptyReadonlyNumbers: ReadonlyArray.NonEmptyReadonlyArray<number>
declare const nonEmptyNumbers: ReadonlyArray.NonEmptyArray<number>
declare const readonlyNumbers: ReadonlyArray<number>
declare const numbers: Array<number>
declare const numbersOrStrings: Array<number | string>
declare const nonEmptyReadonlyNumbersOrStrings: ReadonlyArray.NonEmptyReadonlyArray<number | string>

// -------------------------------------------------------------------------------------
// isEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly []
  readonlyNumbers
}

// $ExpectType <A>(c: readonly A[]) => Option<readonly []>
Option.liftPredicate(ReadonlyArray.isEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isEmptyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isEmptyArray(numbers)) {
  // $ExpectType []
  numbers
}

// $ExpectType <A>(c: A[]) => Option<[]>
Option.liftPredicate(ReadonlyArray.isEmptyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isNonEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly [number, ...number[]]
  readonlyNumbers
}

// $ExpectType <A>(c: readonly A[]) => Option<readonly [A, ...A[]]>
Option.liftPredicate(ReadonlyArray.isNonEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isNonEmptyArray(numbers)) {
  // $ExpectType [number, ...number[]]
  numbers
}

// $ExpectType <A>(c: A[]) => Option<[A, ...A[]]>
Option.liftPredicate(ReadonlyArray.isNonEmptyArray)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyArray.map(readonlyNumbers, (n) => n + 1)

// $ExpectType number[]
pipe(readonlyNumbers, ReadonlyArray.map((n) => n + 1))

// $ExpectType number[]
ReadonlyArray.map(numbers, (n) => n + 1)

// $ExpectType number[]
pipe(numbers, ReadonlyArray.map((n) => n + 1))

// $ExpectType [number, ...number[]]
ReadonlyArray.map(nonEmptyReadonlyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyReadonlyNumbers, ReadonlyArray.map((n) => n + 1))

// $ExpectType [number, ...number[]]
ReadonlyArray.map(nonEmptyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyNumbers, ReadonlyArray.map((n) => n + 1))

// -------------------------------------------------------------------------------------
// groupBy
// -------------------------------------------------------------------------------------

// baseline
// $ExpectType Record<string, [number, ...number[]]>
ReadonlyArray.groupBy([1, 2, 3], String)

// should not return a struct (Record<'positive' | 'negative', ...>) when using string type literals
// $ExpectType Record<string, [number, ...number[]]>
ReadonlyArray.groupBy([1, 2, 3], (n) => n > 0 ? "positive" as const : "negative" as const)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (ReadonlyArray.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly [string | number, ...(string | number)[]]
}

if (ReadonlyArray.some(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly [string | number, ...(string | number)[]]
}

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (ReadonlyArray.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

if (ReadonlyArray.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
ReadonlyArray.append(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
ReadonlyArray.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.appendAllNonEmpty(numbersOrStrings, nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.appendAllNonEmpty(numbersOrStrings)(nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.appendAllNonEmpty(nonEmptyReadonlyNumbersOrStrings, numbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.appendAllNonEmpty(nonEmptyReadonlyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
ReadonlyArray.prepend(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
ReadonlyArray.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.prependAllNonEmpty(numbersOrStrings, nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.prependAllNonEmpty(numbersOrStrings)(nonEmptyReadonlyNumbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.prependAllNonEmpty(nonEmptyReadonlyNumbersOrStrings, numbersOrStrings)

// $ExpectType [string | number, ...(string | number)[]]
ReadonlyArray.prependAllNonEmpty(nonEmptyReadonlyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// sort
// -------------------------------------------------------------------------------------

declare const ordera: Order.Order<{ readonly a: string }>
interface AB {
  readonly a: string
  readonly b: number
}
declare const abs: ReadonlyArray<AB>

// $ExpectType AB[]
ReadonlyArray.sort(abs, ordera)

// $ExpectType AB[]
pipe(abs, ReadonlyArray.sort(ordera))

// $ExpectType AB[]
ReadonlyArray.sort(ordera)(abs)

// // $ExpectType AB[]
// pipe(abs, ReadonlyArray.sort(Order.mapInput(Order.reverse(Order.string), ({ a }) => a)))
