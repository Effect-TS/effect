import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import type * as Predicate from "effect/Predicate"
import * as SortedSet from "effect/SortedSet"

declare const numbers: SortedSet.SortedSet<number>
declare const numbersOrStrings: SortedSet.SortedSet<number | string>
declare const stringIterable: Iterable<string>
declare const stringOrUndefinedOrder: Order<string | undefined>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

pipe(
  numbersOrStrings,
  SortedSet.every((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

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

// $ExpectType [excluded: SortedSet<string | number>, satisfying: SortedSet<string | number>]
SortedSet.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: SortedSet<string | number>, satisfying: SortedSet<string | number>]
pipe(numbersOrStrings, SortedSet.partition(predicateNumbersOrStrings))

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
