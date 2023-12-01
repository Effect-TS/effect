import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { hole, pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const numbers: Chunk.Chunk<number>
declare const strings: Chunk.Chunk<string>
declare const nonEmptyNumbers: Chunk.NonEmptyChunk<number>
declare const nonEmptyStrings: Chunk.NonEmptyChunk<string>
declare const numbersOrStrings: Chunk.Chunk<number | string>

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

pipe(
  numbersOrStrings,
  Chunk.every((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (Chunk.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType NonEmptyChunk<string | number>
}

pipe(
  numbersOrStrings,
  Chunk.some((
    _item // $ExpectType string | number
  ) => true)
)

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

// $ExpectType [excluded: Chunk<string | number>, satisfying: Chunk<string | number>]
Chunk.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: Chunk<string | number>, satisfying: Chunk<string | number>]
pipe(numbersOrStrings, Chunk.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: Chunk<string>, satisfying: Chunk<number>]
Chunk.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: Chunk<string>, satisfying: Chunk<number>]
pipe(numbersOrStrings, Chunk.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(numbersOrStrings, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(numbersOrStrings, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<number>
Chunk.map(numbers, (
  n,
  _i // $ExpectType number
) => n + 1)

// $ExpectType Chunk<number>
pipe(
  numbers,
  Chunk.map((
    n,
    _i // $ExpectType number
  ) => n + 1)
)

// $ExpectType NonEmptyChunk<number>
Chunk.map(nonEmptyNumbers, (
  n,
  _i // $ExpectType number
) => n + 1)

// $ExpectType NonEmptyChunk<number>
pipe(
  nonEmptyNumbers,
  Chunk.map((
    n,
    _i // $ExpectType number
  ) => n + 1)
)

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

// -------------------------------------------------------------------------------------
// findLast
// -------------------------------------------------------------------------------------

Chunk.findLast(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.findLast((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Option<string | number>
Chunk.findLast(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, Chunk.findLast(predicateNumbersOrStrings))

// $ExpectType Option<number>
Chunk.findLast(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, Chunk.findLast(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// dropWhile
// -------------------------------------------------------------------------------------

Chunk.dropWhile(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.dropWhile((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType Chunk<number>
Chunk.dropWhile(numbers, predicateNumbersOrStrings)

// $ExpectType Chunk<number>
pipe(numbers, Chunk.dropWhile(predicateNumbersOrStrings))

// $ExpectType Chunk<string | number>
Chunk.dropWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType Chunk<string | number>
pipe(numbersOrStrings, Chunk.dropWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// splitWhere
// -------------------------------------------------------------------------------------

Chunk.splitWhere(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Chunk.splitWhere((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [beforeMatch: Chunk<number>, fromMatch: Chunk<number>]
Chunk.splitWhere(numbers, predicateNumbersOrStrings)

// $ExpectType [beforeMatch: Chunk<number>, fromMatch: Chunk<number>]
pipe(numbers, Chunk.splitWhere(predicateNumbersOrStrings))

// $ExpectType [beforeMatch: Chunk<string | number>, fromMatch: Chunk<string | number>]
Chunk.splitWhere(numbersOrStrings, Predicate.isNumber)

// $ExpectType [beforeMatch: Chunk<string | number>, fromMatch: Chunk<string | number>]
pipe(numbersOrStrings, Chunk.splitWhere(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// prependAll
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<string | number>
Chunk.prependAll(strings, numbers)

// $ExpectType Chunk<string | number>
pipe(strings, Chunk.prependAll(numbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAll(nonEmptyStrings, numbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(nonEmptyStrings, Chunk.prependAll(numbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAll(strings, nonEmptyNumbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(strings, Chunk.prependAll(nonEmptyNumbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(nonEmptyStrings, Chunk.prependAll(nonEmptyNumbers))

// -------------------------------------------------------------------------------------
// appendAll
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<string | number>
Chunk.appendAll(strings, numbers)

// $ExpectType Chunk<string | number>
pipe(strings, Chunk.appendAll(numbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAll(nonEmptyStrings, numbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(nonEmptyStrings, Chunk.appendAll(numbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAll(strings, nonEmptyNumbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(strings, Chunk.appendAll(nonEmptyNumbers))

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType NonEmptyChunk<string | number>
pipe(nonEmptyStrings, Chunk.appendAll(nonEmptyNumbers))

// -------------------------------------------------------------------------------------
// flatMap
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<number>
Chunk.flatMap(strings, (
  _s, // $ExpectType string
  _i // $ExpectType number
) => Chunk.empty<number>())

// $ExpectType Chunk<number>
pipe(
  strings,
  Chunk.flatMap((
    _s, // $ExpectType string
    _i // $ExpectType number
  ) => Chunk.empty<number>())
)

// $ExpectType Chunk<number>
Chunk.flatMap(strings, (
  s, // $ExpectType string
  _i // $ExpectType number
) => Chunk.of(s.length))

// $ExpectType Chunk<number>
pipe(
  strings,
  Chunk.flatMap((
    s, // $ExpectType string
    _i // $ExpectType number
  ) => Chunk.of(s.length))
)

// $ExpectType Chunk<number>
Chunk.flatMap(nonEmptyStrings, (
  _s, // $ExpectType string
  _i // $ExpectType number
) => Chunk.empty<number>())

// $ExpectType Chunk<number>
pipe(
  nonEmptyStrings,
  Chunk.flatMap((
    _s, // $ExpectType string
    _i // $ExpectType number
  ) => Chunk.empty<number>())
)

// $ExpectType NonEmptyChunk<number>
Chunk.flatMap(nonEmptyStrings, (
  s, // $ExpectType string
  _i // $ExpectType number
) => Chunk.of(s.length))

// $ExpectType NonEmptyChunk<number>
pipe(
  nonEmptyStrings,
  Chunk.flatMap((
    s, // $ExpectType string
    _i // $ExpectType number
  ) => Chunk.of(s.length))
)

// -------------------------------------------------------------------------------------
// flatten
// -------------------------------------------------------------------------------------

// $ExpectType Chunk<number>
Chunk.flatten(hole<Chunk.Chunk<Chunk.Chunk<number>>>())

// $ExpectType Chunk<number>
pipe(hole<Chunk.Chunk<Chunk.Chunk<number>>>(), Chunk.flatten)

// $ExpectType Chunk<number>
Chunk.flatten(hole<Chunk.Chunk<Chunk.NonEmptyChunk<number>>>())

// $ExpectType Chunk<number>
pipe(hole<Chunk.Chunk<Chunk.NonEmptyChunk<number>>>(), Chunk.flatten)

// $ExpectType Chunk<number>
Chunk.flatten(hole<Chunk.NonEmptyChunk<Chunk.Chunk<number>>>())

// $ExpectType Chunk<number>
pipe(hole<Chunk.NonEmptyChunk<Chunk.Chunk<number>>>(), Chunk.flatten)

// $ExpectType NonEmptyChunk<number>
Chunk.flatten(hole<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>())

// $ExpectType NonEmptyChunk<number>
pipe(hole<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>(), Chunk.flatten)

declare const flattenChunk: Effect.Effect<never, never, Chunk.Chunk<Chunk.Chunk<number>>>
declare const flattenNonEmptyChunk: Effect.Effect<never, never, Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>

// $ExpectType Effect<never, never, Chunk<number>>
flattenChunk.pipe(Effect.map((_) => Chunk.flatten(_)))

// $ExpectType Effect<never, never, Chunk<number>>
flattenChunk.pipe(Effect.map(Chunk.flatten))

// $ExpectType Effect<never, never, NonEmptyChunk<number>>
flattenNonEmptyChunk.pipe(Effect.map((_) => Chunk.flatten(_)))

// $ExpectType Effect<never, never, NonEmptyChunk<number>>
flattenNonEmptyChunk.pipe(Effect.map(Chunk.flatten))
