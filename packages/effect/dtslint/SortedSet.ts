import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as SortedSet from "effect/SortedSet"

declare const numberOrString: SortedSet.SortedSet<number | string>
declare const stringIterable: Iterable<string>
declare const stringOrUndefinedOrder: Order<string | undefined>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (SortedSet.every(numberOrString, Predicate.isString)) {
  numberOrString // $ExpectType SortedSet<string>
}

if (SortedSet.every(Predicate.isString)(numberOrString)) {
  numberOrString // $ExpectType SortedSet<string>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [SortedSet<number>, SortedSet<string>]
SortedSet.partition(numberOrString, Predicate.isString)

// $ExpectType [SortedSet<number>, SortedSet<string>]
numberOrString.pipe(SortedSet.partition(Predicate.isString))

// -------------------------------------------------------------------------------------
// fromIterable
// -------------------------------------------------------------------------------------

// $ExpectType SortedSet<string>
SortedSet.fromIterable(stringIterable, stringOrUndefinedOrder)

// $ExpectType SortedSet<string>
pipe(stringIterable, SortedSet.fromIterable(stringOrUndefinedOrder))
