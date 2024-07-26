import type * as Array from "../src/Array.js"
import type { Chunk } from "../src/index.js"
import * as Random from "../src/Random.js"

declare const array: Array<number>
declare const nonEmptyArray: Array.NonEmptyArray<number>

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(array)

// $ExpectType Effect<number, never, never>
Random.choice(nonEmptyArray)

declare const readonlyArray: Array<number>
declare const nonEmptyReadonlyArray: Array.NonEmptyArray<number>

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(readonlyArray)

// $ExpectType Effect<number, never, never>
Random.choice(nonEmptyReadonlyArray)

declare const chunk: Chunk.Chunk<number>
declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(chunk)

// $ExpectType Effect<number, never, never>
Random.choice(nonEmptyChunk)
