import * as Chunk from "effect/Chunk"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const numbers: Chunk.Chunk<number>
declare const nonEmptyNumbers: Chunk.NonEmptyChunk<number>
declare const numbersOrStrings: Chunk.Chunk<number | string>
declare const nonEmptyNumbersOrStrings: Chunk.NonEmptyChunk<number | string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (Chunk.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType Chunk<string>
}

if (Chunk.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType Chunk<string>
}

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (Chunk.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType NonEmptyChunk<string | number>
}

if (Chunk.some(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType NonEmptyChunk<string | number>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

Chunk.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [Chunk<string | number>, Chunk<string | number>]
Chunk.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [Chunk<string | number>, Chunk<string | number>]
pipe(numbersOrStrings, Chunk.partition(predicateNumbersOrStrings))

// $ExpectType [Chunk<string>, Chunk<number>]
Chunk.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [Chunk<string>, Chunk<number>]
pipe(numbersOrStrings, Chunk.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(numbersOrStrings, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(numbersOrStrings, nonEmptyNumbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(numbersOrStrings)(nonEmptyNumbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nonEmptyNumbersOrStrings, numbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nonEmptyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(numbersOrStrings, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(numbersOrStrings, nonEmptyNumbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(numbersOrStrings)(nonEmptyNumbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nonEmptyNumbersOrStrings, numbersOrStrings)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nonEmptyNumbersOrStrings)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<number>
Chunk.map(numbers, (n) => n + 1)

// $ExpectType Chunk<number>
pipe(numbers, Chunk.map((n) => n + 1))

// $ExpectType NonEmptyChunk<number>
Chunk.map(nonEmptyNumbers, (n) => n + 1)

// $ExpectType NonEmptyChunk<number>
pipe(nonEmptyNumbers, Chunk.map((n) => n + 1))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

Chunk.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.filter((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Chunk<string | number>
Chunk.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Chunk<number>
Chunk.filter(numbers, predicateNumbersOrStrings)

// $ExpectType Chunk<string | number>
pipe(numbersOrStrings, Chunk.filter(predicateNumbersOrStrings))

// $ExpectType Chunk<number>
pipe(numbers, Chunk.filter(predicateNumbersOrStrings))

// $ExpectType Chunk<number>
Chunk.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType Chunk<number>
pipe(numbersOrStrings, Chunk.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

Chunk.takeWhile(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.takeWhile((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Chunk<string | number>
Chunk.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Chunk<number>
Chunk.takeWhile(numbers, predicateNumbersOrStrings)

// $ExpectType Chunk<string | number>
pipe(numbersOrStrings, Chunk.takeWhile(predicateNumbersOrStrings))

// $ExpectType Chunk<number>
pipe(numbers, Chunk.takeWhile(predicateNumbersOrStrings))

// $ExpectType Chunk<number>
Chunk.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Chunk<number>
pipe(numbersOrStrings, Chunk.takeWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

Chunk.findFirst(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.findFirst((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Option<string | number>
Chunk.findFirst(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, Chunk.findFirst(predicateNumbersOrStrings))

// $ExpectType Option<number>
Chunk.findFirst(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, Chunk.findFirst(Predicate.isNumber))
