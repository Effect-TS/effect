import * as Chunk from 'effect/Chunk'
import * as Predicate from 'effect/Predicate'

declare const nss: Chunk.Chunk<number | string>
declare const nonEmptynss: Chunk.NonEmptyChunk<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (Chunk.every(nss, Predicate.isString)) {
  nss // $ExpectType Chunk<string>
}

if (Chunk.every(Predicate.isString)(nss)) {
  nss // $ExpectType Chunk<string>
}

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (Chunk.some(nss, Predicate.isString)) {
  nss // $ExpectType NonEmptyChunk<string | number>
}

if (Chunk.some(Predicate.isString)(nss)) {
  nss // $ExpectType NonEmptyChunk<string | number>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [Chunk<number>, Chunk<string>]
Chunk.partition(nss, Predicate.isString)

// $ExpectType [Chunk<number>, Chunk<string>]
nss.pipe(Chunk.partition(Predicate.isString))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(nss, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.append(true)(nss)

// -------------------------------------------------------------------------------------
// mapNonEmpty
// -------------------------------------------------------------------------------------

 // $ExpectType NonEmptyChunk<string>
Chunk.mapNonEmpty(nonEmptynss, (s) => `${s}`)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nss, nonEmptynss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nss)(nonEmptynss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nonEmptynss, nss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.appendAllNonEmpty(nonEmptynss)(nss)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(nss, true)

// $ExpectType NonEmptyChunk<string | number | boolean>
Chunk.prepend(true)(nss)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nss, nonEmptynss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nss)(nonEmptynss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nonEmptynss, nss)

// $ExpectType NonEmptyChunk<string | number>
Chunk.prependAllNonEmpty(nonEmptynss)(nss)
