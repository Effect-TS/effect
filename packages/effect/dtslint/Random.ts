import type * as Array from "../src/Array.js"
import * as Random from "../src/Random.js"

declare const arr1: Array<number>
declare const arr2: Array.NonEmptyArray<number>

// $ExpectType Effect<number, NoSuchElementException, never>
Random.choice(arr1)

// $ExpectType Effect<number, never, never>
Random.choice(arr2)
