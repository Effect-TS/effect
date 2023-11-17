import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as SortedSet from "effect/SortedSet"

declare const numbers: SortedSet.SortedSet<number>
declare const numbersOrStrings: SortedSet.SortedSet<number | string>
declare const stringIterable: Iterable<string>
declare const stringOrUndefinedOrder: Order<string | undefined>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (SortedSet.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType SortedSet<string>
}

if (SortedSet.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType SortedSet<string>
}

pipe(
  numbersOrStrings,
  SortedSet.every((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (SortedSet.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType SortedSet<string | number>
}

pipe(
  numbersOrStrings,
  SortedSet.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

SortedSet.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  SortedSet.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [SortedSet<string | number>, SortedSet<string | number>]
SortedSet.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [SortedSet<string | number>, SortedSet<string | number>]
pipe(numbersOrStrings, SortedSet.partition(predicateNumbersOrStrings))

// $ExpectType [SortedSet<string>, SortedSet<number>]
SortedSet.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [SortedSet<string>, SortedSet<number>]
pipe(numbersOrStrings, SortedSet.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// fromIterable
// -------------------------------------------------------------------------------------

// $ExpectType SortedSet<string>
SortedSet.fromIterable(stringIterable, stringOrUndefinedOrder)

// $ExpectType SortedSet<string>
pipe(stringIterable, SortedSet.fromIterable(stringOrUndefinedOrder))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

SortedSet.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  SortedSet.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType SortedSet<string | number>
SortedSet.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType SortedSet<number>
SortedSet.filter(numbers, predicateNumbersOrStrings)

// $ExpectType SortedSet<string | number>
pipe(numbersOrStrings, SortedSet.filter(predicateNumbersOrStrings))

// $ExpectType SortedSet<number>
pipe(numbers, SortedSet.filter(predicateNumbersOrStrings))

// $ExpectType SortedSet<number>
SortedSet.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType SortedSet<number>
pipe(numbersOrStrings, SortedSet.filter(Predicate.isNumber))
