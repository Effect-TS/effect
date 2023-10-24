import * as Chunk from "effect/Chunk"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const numbers: Chunk.Chunk<number>
declare const nonEmptyNumbers: Chunk.NonEmptyChunk<number>
declare const numbersOrStrings: Chunk.Chunk<number | string>
declare const nonEmptyNumbersOrStrings: Chunk.NonEmptyChunk<number | string>

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

// $ExpectType [Chunk<number>, Chunk<string>]
Chunk.partition(numbersOrStrings, Predicate.isString)

// $ExpectType [Chunk<number>, Chunk<string>]
numbersOrStrings.pipe(Chunk.partition(Predicate.isString))

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
