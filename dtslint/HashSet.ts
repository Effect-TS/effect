import { pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Predicate from "effect/Predicate"

declare const numbers: HashSet.HashSet<number>
declare const numbersOrStrings: HashSet.HashSet<number | string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (HashSet.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType HashSet<string>
}

if (HashSet.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType HashSet<string>
}

pipe(
  numbersOrStrings,
  HashSet.every((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

HashSet.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  HashSet.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [excluded: HashSet<string | number>, satisfying: HashSet<string | number>]
HashSet.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: HashSet<string | number>, satisfying: HashSet<string | number>]
pipe(numbersOrStrings, HashSet.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: HashSet<string>, satisfying: HashSet<number>]
HashSet.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: HashSet<string>, satisfying: HashSet<number>]
pipe(numbersOrStrings, HashSet.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

HashSet.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  HashSet.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType HashSet<string | number>
HashSet.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType HashSet<number>
HashSet.filter(numbers, predicateNumbersOrStrings)

// $ExpectType HashSet<string | number>
pipe(numbersOrStrings, HashSet.filter(predicateNumbersOrStrings))

// $ExpectType HashSet<number>
pipe(numbers, HashSet.filter(predicateNumbersOrStrings))

// $ExpectType HashSet<number>
HashSet.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType HashSet<number>
pipe(numbersOrStrings, HashSet.filter(Predicate.isNumber))
