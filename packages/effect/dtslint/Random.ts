import type * as Array from "../src/Array.js"
import type { Chunk } from "../src/index.js"
import * as Random from "../src/Random.js"

declare const arr1: Array<number>
declare const arr2: Array.NonEmptyArray<number>
declare const chunk: Chunk.Chunk<number>

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(arr1)

// $ExpectType Effect<number, never, never>
Random.choice(arr2)

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(chunk)
