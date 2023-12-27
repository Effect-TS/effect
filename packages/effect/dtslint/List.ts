import { pipe } from "effect/Function"
import * as List from "effect/List"
import * as Predicate from "effect/Predicate"

declare const numbers: List.List<number>
declare const strings: List.List<string>
declare const nonEmptyNumbers: List.Cons<number>
declare const nonEmptyStrings: List.Cons<string>
declare const numbersOrStrings: List.List<number | string>

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

pipe(
  numbersOrStrings,
  List.every((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (List.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType Cons<string | number>
}

if (List.some(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType Cons<string | number>
}

pipe(
  numbersOrStrings,
  List.some((
    _item // $ExpectType string | number
  ) => true)
)

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

// $ExpectType [excluded: List<string | number>, satisfying: List<string | number>]
List.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: List<string | number>, satisfying: List<string | number>]
pipe(numbersOrStrings, List.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: List<string>, satisfying: List<number>]
List.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: List<string>, satisfying: List<number>]
pipe(numbersOrStrings, List.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.append(numbersOrStrings, true)

// $ExpectType Cons<string | number | boolean>
List.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.prepend(numbersOrStrings, true)

// $ExpectType Cons<string | number | boolean>
List.prepend(true)(numbersOrStrings)

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

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

List.findFirst(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  List.findFirst((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Option<string | number>
List.findFirst(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, List.findFirst(predicateNumbersOrStrings))

// $ExpectType Option<number>
List.findFirst(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, List.findFirst(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// appendAll
// -------------------------------------------------------------------------------------

// $ExpectType List<string | number>
List.appendAll(strings, numbers)

// $ExpectType List<string | number>
pipe(strings, List.appendAll(numbers))

// $ExpectType Cons<string | number>
List.appendAll(nonEmptyStrings, numbers)

// $ExpectType Cons<string | number>
pipe(nonEmptyStrings, List.appendAll(numbers))

// $ExpectType Cons<string | number>
List.appendAll(strings, nonEmptyNumbers)

// $ExpectType Cons<string | number>
pipe(strings, List.appendAll(nonEmptyNumbers))

// $ExpectType Cons<string | number>
List.appendAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType Cons<string | number>
pipe(nonEmptyStrings, List.appendAll(nonEmptyNumbers))

// -------------------------------------------------------------------------------------
// prependAll
// -------------------------------------------------------------------------------------

// $ExpectType List<string | number>
List.prependAll(strings, numbers)

// $ExpectType List<string | number>
pipe(strings, List.prependAll(numbers))

// $ExpectType Cons<string | number>
List.prependAll(nonEmptyStrings, numbers)

// $ExpectType Cons<string | number>
pipe(nonEmptyStrings, List.prependAll(numbers))

// $ExpectType Cons<string | number>
List.prependAll(strings, nonEmptyNumbers)

// $ExpectType Cons<string | number>
pipe(strings, List.prependAll(nonEmptyNumbers))

// $ExpectType Cons<string | number>
List.prependAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType Cons<string | number>
pipe(nonEmptyStrings, List.prependAll(nonEmptyNumbers))

// -------------------------------------------------------------------------------------
// flatMap
// -------------------------------------------------------------------------------------

// $ExpectType List<number>
List.flatMap(strings, (
  _s // $ExpectType string
) => List.empty<number>())

// $ExpectType List<number>
pipe(
  strings,
  List.flatMap((
    _s // $ExpectType string
  ) => List.empty<number>())
)

// $ExpectType List<number>
List.flatMap(strings, (
  s // $ExpectType string
) => List.of(s.length))

// $ExpectType List<number>
pipe(
  strings,
  List.flatMap((
    s // $ExpectType string
  ) => List.of(s.length))
)

// $ExpectType List<number>
List.flatMap(nonEmptyStrings, (
  _s // $ExpectType string
) => List.empty<number>())

// $ExpectType List<number>
pipe(
  nonEmptyStrings,
  List.flatMap((
    _s // $ExpectType string
  ) => List.empty<number>())
)

// $ExpectType Cons<number>
List.flatMap(nonEmptyStrings, (
  s // $ExpectType string
) => List.of(s.length))

// $ExpectType Cons<number>
pipe(
  nonEmptyStrings,
  List.flatMap((
    s // $ExpectType string
  ) => List.of(s.length))
)
