import { isNumber } from "effect/Number"
import type { Predicate } from "effect/Predicate"
import * as Sink from "effect/Sink"
import { isString } from "effect/String"

declare const predicate: Predicate<number | string>

// -------------------------------------------------------------------------------------
// collectAllWhile
// -------------------------------------------------------------------------------------

// $ExpectType Sink<never, never, string | number, string | number, Chunk<string | number>>
Sink.collectAllWhile(predicate)

// $ExpectType Sink<never, never, unknown, unknown, Chunk<number>>
Sink.collectAllWhile(isNumber)

// $ExpectType Sink<never, never, unknown, unknown, Chunk<string>>
Sink.collectAllWhile(isString)
