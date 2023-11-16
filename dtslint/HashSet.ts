import { pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Predicate from "effect/Predicate"

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

// $ExpectType [HashSet<string | number>, HashSet<string | number>]
HashSet.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [HashSet<string | number>, HashSet<string | number>]
pipe(numbersOrStrings, HashSet.partition(predicateNumbersOrStrings))

// $ExpectType [HashSet<string>, HashSet<number>]
HashSet.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [HashSet<string>, HashSet<number>]
pipe(numbersOrStrings, HashSet.partition(Predicate.isNumber))
