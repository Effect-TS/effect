import { pipe } from "effect/Function"
import * as List from "effect/List"
import * as Predicate from "effect/Predicate"

declare const numbers: List.List<number>
declare const nonEmptyNumbers: List.Cons<number>
declare const numbersOrStrings: List.List<number | string>
declare const nonEmptyNumbersOrStrings: List.Cons<number | string>

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

// $ExpectType [List<number>, List<string>]
List.partition(numbersOrStrings, Predicate.isString)

// $ExpectType [List<number>, List<string>]
numbersOrStrings.pipe(List.partition(Predicate.isString))

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
