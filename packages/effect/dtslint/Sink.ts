import { isNumber } from "effect/Number"
import type { Predicate } from "effect/Predicate"
import * as Sink from "effect/Sink"
import { isString } from "effect/String"

declare const predicate: Predicate<number | string>

// -------------------------------------------------------------------------------------
// collectAllWhile
// -------------------------------------------------------------------------------------

// $ExpectType Sink<Chunk<string | number>, string | number, string | number, never, never>
Sink.collectAllWhile(predicate)

// $ExpectType Sink<Chunk<number>, unknown, unknown, never, never>
Sink.collectAllWhile(isNumber)

// $ExpectType Sink<Chunk<string>, unknown, unknown, never, never>
Sink.collectAllWhile(isString)
