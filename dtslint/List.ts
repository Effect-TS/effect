import { pipe } from "effect/Function"
import * as List from "effect/List"
import * as Predicate from "effect/Predicate"

declare const numbers: List.List<number>
declare const nonEmptyNumbers: List.Cons<number>
declare const numbersOrStrings: List.List<number | string>
declare const nonEmptyNumbersOrStrings: List.Cons<number | string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (List.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType List<string>
}

if (List.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType List<string>
}

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (List.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType Cons<string | number>
}

if (List.some(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType Cons<string | number>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

List.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  List.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [List<string | number>, List<string | number>]
List.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [List<string | number>, List<string | number>]
pipe(numbersOrStrings, List.partition(predicateNumbersOrStrings))

// $ExpectType [List<string>, List<number>]
List.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [List<string>, List<number>]
pipe(numbersOrStrings, List.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.append(numbersOrStrings, true)

// $ExpectType Cons<string | number | boolean>
List.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(numbersOrStrings, nonEmptyNumbersOrStrings)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(numbersOrStrings)(nonEmptyNumbersOrStrings)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nonEmptyNumbersOrStrings, numbersOrStrings)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nonEmptyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.prepend(numbersOrStrings, true)

// $ExpectType Cons<string | number | boolean>
List.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(numbersOrStrings, nonEmptyNumbersOrStrings)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(numbersOrStrings)(nonEmptyNumbersOrStrings)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nonEmptyNumbersOrStrings, numbersOrStrings)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nonEmptyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType List<number>
List.map(numbers, (n) => n + 1)

// $ExpectType List<number>
pipe(numbers, List.map((n) => n + 1))

// $ExpectType Cons<number>
List.map(nonEmptyNumbers, (n) => n + 1)

// $ExpectType Cons<number>
pipe(nonEmptyNumbers, List.map((n) => n + 1))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

List.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  List.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType List<string | number>
List.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType List<number>
List.filter(numbers, predicateNumbersOrStrings)

// $ExpectType List<string | number>
pipe(numbersOrStrings, List.filter(predicateNumbersOrStrings))

// $ExpectType List<number>
pipe(numbers, List.filter(predicateNumbersOrStrings))

// $ExpectType List<number>
List.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType List<number>
pipe(numbersOrStrings, List.filter(Predicate.isNumber))
