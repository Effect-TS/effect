import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"

declare const numbers: Stream.Stream<never, never, number>
declare const numbersOrStrings: Stream.Stream<never, never, number | string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

Stream.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Stream.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Stream<never, never, string | number>
Stream.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, number>
Stream.filter(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, string | number>
pipe(numbersOrStrings, Stream.filter(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
pipe(numbers, Stream.filter(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
Stream.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<never, never, number>
pipe(numbersOrStrings, Stream.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// find
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, string | number>
Stream.find(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, string | number>
pipe(numbersOrStrings, Stream.find(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
Stream.find(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<never, never, number>
pipe(numbersOrStrings, Stream.find(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

Stream.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Stream.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Effect<Scope, never, [Stream<never, never, string | number>, Stream<never, never, string | number>]>
Stream.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Effect<Scope, never, [Stream<never, never, string | number>, Stream<never, never, string | number>]>
pipe(numbersOrStrings, Stream.partition(predicateNumbersOrStrings))

// $ExpectType Effect<Scope, never, [Stream<never, never, string>, Stream<never, never, number>]>
Stream.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType Effect<Scope, never, [Stream<never, never, string>, Stream<never, never, number>]>
pipe(numbersOrStrings, Stream.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, string | number>
Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, string | number>
pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
Stream.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<never, never, number>
pipe(numbersOrStrings, Stream.takeWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

Stream.takeWhile(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Stream.takeWhile((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Stream<never, never, string | number>
Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, number>
Stream.takeWhile(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<never, never, string | number>
pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
pipe(numbers, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<never, never, number>
Stream.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<never, never, number>
pipe(numbersOrStrings, Stream.takeWhile(Predicate.isNumber))
