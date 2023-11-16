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

declare const pimitiveNumber: number
declare const pimitiveNumerOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// isEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly []
  readonlyNumbers
}

// $ExpectType <A>(a: readonly A[]) => Option<readonly []>
Option.liftPredicate(ReadonlyArray.isEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isEmptyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isEmptyArray(numbers)) {
  // $ExpectType []
  numbers
}

// $ExpectType <A>(a: A[]) => Option<[]>
Option.liftPredicate(ReadonlyArray.isEmptyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isNonEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly [number, ...number[]]
  readonlyNumbers
}

// $ExpectType <A>(a: readonly A[]) => Option<readonly [A, ...A[]]>
Option.liftPredicate(ReadonlyArray.isNonEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyArray
// -------------------------------------------------------------------------------------

if (ReadonlyArray.isNonEmptyArray(numbers)) {
  // $ExpectType [number, ...number[]]
  numbers
}

// $ExpectType <A>(a: A[]) => Option<[A, ...A[]]>
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

pipe(
  numbersOrStrings,
  ReadonlyArray.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (ReadonlyArray.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

if (ReadonlyArray.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

pipe(
  numbersOrStrings,
  ReadonlyArray.every((
    _item // $ExpectType string | number
  ) => true)
)

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

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

ReadonlyArray.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [(string | number)[], (string | number)[]]
ReadonlyArray.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [(string | number)[], (string | number)[]]
pipe(numbersOrStrings, ReadonlyArray.partition(predicateNumbersOrStrings))

// $ExpectType [string[], number[]]
ReadonlyArray.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [string[], number[]]
pipe(numbersOrStrings, ReadonlyArray.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

ReadonlyArray.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType (string | number)[]
ReadonlyArray.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType number[]
ReadonlyArray.filter(numbers, predicateNumbersOrStrings)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, ReadonlyArray.filter(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(numbers, ReadonlyArray.filter(predicateNumbersOrStrings))

// $ExpectType number[]
ReadonlyArray.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType number[]
pipe(numbersOrStrings, ReadonlyArray.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

ReadonlyArray.takeWhile(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.takeWhile((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType (string | number)[]
ReadonlyArray.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType number[]
ReadonlyArray.takeWhile(numbers, predicateNumbersOrStrings)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, ReadonlyArray.takeWhile(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(numbers, ReadonlyArray.takeWhile(predicateNumbersOrStrings))

// $ExpectType number[]
ReadonlyArray.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType number[]
pipe(numbersOrStrings, ReadonlyArray.takeWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

ReadonlyArray.findFirst(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.findFirst((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Option<string | number>
ReadonlyArray.findFirst(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, ReadonlyArray.findFirst(predicateNumbersOrStrings))

// $ExpectType Option<number>
ReadonlyArray.findFirst(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, ReadonlyArray.findFirst(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findLast
// -------------------------------------------------------------------------------------

ReadonlyArray.findLast(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.findLast((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Option<string | number>
ReadonlyArray.findLast(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, ReadonlyArray.findLast(predicateNumbersOrStrings))

// $ExpectType Option<number>
ReadonlyArray.findLast(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, ReadonlyArray.findLast(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// liftPredicate
// -------------------------------------------------------------------------------------

// $ExpectType string[]
pipe(pimitiveNumerOrString, ReadonlyArray.liftPredicate(Predicate.isString))

pipe(
  pimitiveNumerOrString,
  ReadonlyArray.liftPredicate(
    (
      n // $ExpectType string | number
    ): n is number => typeof n === "number"
  )
)

// $ExpectType (string | number)[]
pipe(pimitiveNumerOrString, ReadonlyArray.liftPredicate(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(pimitiveNumber, ReadonlyArray.liftPredicate(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(
  pimitiveNumber,
  ReadonlyArray.liftPredicate(
    (
      _n // $ExpectType number
    ) => true
  )
)

// -------------------------------------------------------------------------------------
// span
// -------------------------------------------------------------------------------------

ReadonlyArray.span(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  ReadonlyArray.span((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [init: (string | number)[], rest: (string | number)[]]
ReadonlyArray.span(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [init: number[], rest: number[]]
ReadonlyArray.span(numbers, predicateNumbersOrStrings)

// $ExpectType [init: (string | number)[], rest: (string | number)[]]
pipe(numbersOrStrings, ReadonlyArray.span(predicateNumbersOrStrings))

// $ExpectType [init: number[], rest: number[]]
pipe(numbers, ReadonlyArray.span(predicateNumbersOrStrings))

// $ExpectType [init: number[], rest: string[]]
ReadonlyArray.span(numbersOrStrings, Predicate.isNumber)

// $ExpectType [init: number[], rest: string[]]
pipe(numbersOrStrings, ReadonlyArray.span(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// dropWhile
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyArray.dropWhile(numbers, predicateNumbersOrStrings)

// $ExpectType number[]
pipe(numbers, ReadonlyArray.dropWhile(predicateNumbersOrStrings))

// $ExpectType (string | number)[]
ReadonlyArray.dropWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, ReadonlyArray.dropWhile(Predicate.isNumber))
