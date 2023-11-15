import { pipe } from "effect/Function"
import { isNumber } from "effect/Number"
import type { Predicate } from "effect/Predicate"
import * as Stream from "effect/Stream"
import { isString } from "effect/String"

declare const predicate: Predicate<number | string>

declare const stream: Stream.Stream<never, never, number | string>

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, string | number>
Stream.filter(stream, predicate)

// $ExpectType Stream<never, never, string | number>
pipe(stream, Stream.filter(predicate))

// $ExpectType Stream<never, never, number>
Stream.filter(stream, isNumber)

// $ExpectType Stream<never, never, number>
pipe(stream, Stream.filter(isNumber))

// $ExpectType Stream<never, never, string>
Stream.filter(stream, isString)

// $ExpectType Stream<never, never, string>
pipe(stream, Stream.filter(isString))

// -------------------------------------------------------------------------------------
// find
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, string | number>
Stream.find(stream, predicate)

// $ExpectType Stream<never, never, string | number>
pipe(stream, Stream.find(predicate))

// $ExpectType Stream<never, never, number>
Stream.find(stream, isNumber)

// $ExpectType Stream<never, never, number>
pipe(stream, Stream.find(isNumber))

// $ExpectType Stream<never, never, string>
Stream.find(stream, isString)

// $ExpectType Stream<never, never, string>
pipe(stream, Stream.find(isString))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType Effect<Scope, never, [Stream<never, never, string | number>, Stream<never, never, string | number>]>
Stream.partition(stream, predicate)

// $ExpectType Effect<Scope, never, [Stream<never, never, string | number>, Stream<never, never, string | number>]>
pipe(stream, Stream.partition(predicate))

// $ExpectType Effect<Scope, never, [Stream<never, never, string>, Stream<never, never, number>]>
Stream.partition(stream, isNumber)

// $ExpectType Effect<Scope, never, [Stream<never, never, string>, Stream<never, never, number>]>
pipe(stream, Stream.partition(isNumber))

// $ExpectType Effect<Scope, never, [Stream<never, never, number>, Stream<never, never, string>]>
Stream.partition(stream, isString)

// $ExpectType Effect<Scope, never, [Stream<never, never, number>, Stream<never, never, string>]>
pipe(stream, Stream.partition(isString))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

// $ExpectType Stream<never, never, string | number>
Stream.takeWhile(stream, predicate)

// $ExpectType Stream<never, never, string | number>
pipe(stream, Stream.takeWhile(predicate))

// $ExpectType Stream<never, never, number>
Stream.takeWhile(stream, isNumber)

// $ExpectType Stream<never, never, number>
pipe(stream, Stream.takeWhile(isNumber))

// $ExpectType Stream<never, never, string>
Stream.takeWhile(stream, isString)

// $ExpectType Stream<never, never, string>
pipe(stream, Stream.takeWhile(isString))
