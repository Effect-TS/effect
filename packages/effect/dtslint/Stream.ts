import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import { Cause } from "../src/index.js"

declare const numbers: Stream.Stream<number>
declare const numbersOrStrings: Stream.Stream<number | string>

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

// $ExpectType Stream<string | number, never, never>
Stream.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<number, never, never>
Stream.filter(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.filter(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
pipe(numbers, Stream.filter(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
Stream.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<number, never, never>
pipe(numbersOrStrings, Stream.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// find
// -------------------------------------------------------------------------------------

Stream.find(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Stream.find((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Stream<string | number, never, never>
Stream.find(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.find(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
Stream.find(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<number, never, never>
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

// $ExpectType Effect<[excluded: Stream<string | number, never, never>, satisfying: Stream<string | number, never, never>], never, Scope>
Stream.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Effect<[excluded: Stream<string | number, never, never>, satisfying: Stream<string | number, never, never>], never, Scope>
pipe(numbersOrStrings, Stream.partition(predicateNumbersOrStrings))

// $ExpectType Effect<[excluded: Stream<string, never, never>, satisfying: Stream<number, never, never>], never, Scope>
Stream.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType Effect<[excluded: Stream<string, never, never>, satisfying: Stream<number, never, never>], never, Scope>
pipe(numbersOrStrings, Stream.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

// $ExpectType Stream<string | number, never, never>
Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
Stream.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<number, never, never>
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

// $ExpectType Stream<string | number, never, never>
Stream.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Stream<number, never, never>
Stream.takeWhile(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
pipe(numbers, Stream.takeWhile(predicateNumbersOrStrings))

// $ExpectType Stream<number, never, never>
Stream.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<number, never, never>
pipe(numbersOrStrings, Stream.takeWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// dropWhile
// -------------------------------------------------------------------------------------

// $ExpectType Stream<number, never, never>
Stream.dropWhile(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<number, never, never>
pipe(numbers, Stream.dropWhile(predicateNumbersOrStrings))

// $ExpectType Stream<string | number, never, never>
Stream.dropWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.dropWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// dropUntil
// -------------------------------------------------------------------------------------

// $ExpectType Stream<number, never, never>
Stream.dropUntil(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<number, never, never>
pipe(numbers, Stream.dropUntil(predicateNumbersOrStrings))

// $ExpectType Stream<string | number, never, never>
Stream.dropUntil(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.dropUntil(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// split
// -------------------------------------------------------------------------------------

// $ExpectType Stream<Chunk<number>, never, never>
Stream.split(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<Chunk<number>, never, never>
pipe(numbers, Stream.split(predicateNumbersOrStrings))

// $ExpectType Stream<Chunk<string>, never, never>
Stream.split(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<Chunk<string>, never, never>
pipe(numbersOrStrings, Stream.split(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeUntil
// -------------------------------------------------------------------------------------

// $ExpectType Stream<number, never, never>
Stream.takeUntil(numbers, predicateNumbersOrStrings)

// $ExpectType Stream<number, never, never>
pipe(numbers, Stream.takeUntil(predicateNumbersOrStrings))

// $ExpectType Stream<string | number, never, never>
Stream.takeUntil(numbersOrStrings, Predicate.isNumber)

// $ExpectType Stream<string | number, never, never>
pipe(numbersOrStrings, Stream.takeUntil(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

// $ExpectType Stream<{ a: number; b: string; c: boolean; }, never, never>
pipe(
  Stream.Do,
  Stream.bind("a", (
    _scope // $ExpectType {}
  ) => Stream.succeed(1)),
  Stream.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Stream.succeed("b")),
  Stream.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// $ExpectType Stream<{ a: number; b: string; c: boolean; }, never, never>
pipe(
  Stream.succeed(1),
  Stream.bindTo("a"),
  Stream.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Stream.succeed("b")),
  Stream.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// -------------------------------------------------------------------------------------
// zipLatestAll
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, never>
Stream.zipLatestAll()

// $ExpectType Stream<[number, string | number], never, never>
Stream.zipLatestAll(numbers, numbersOrStrings)

// $ExpectType Stream<[number, string | number, never], Error, never>
Stream.zipLatestAll(numbers, numbersOrStrings, Stream.fail(new Error("")))

// -------------------------------------------------------------------------------------
// merge
// -------------------------------------------------------------------------------------

// $ExpectType Stream<{ _tag: "a"; value: number; } | { _tag: "b"; value: string; }, NoSuchElementException, never>
Stream.mergeWithTag({
  a: Stream.make(0).pipe(Stream.tap(() => new Cause.NoSuchElementException())),
  b: Stream.make("")
}, { concurrency: 1 })
