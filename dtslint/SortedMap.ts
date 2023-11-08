import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import * as SortedMap from "effect/SortedMap"

declare const stringAndNumberIterable: Iterable<[string, number]>
declare const stringOrUndefinedOrder: Order<string | undefined>

// -------------------------------------------------------------------------------------
// fromIterable
// -------------------------------------------------------------------------------------

// $ExpectType SortedMap<string, number>
SortedMap.fromIterable(stringAndNumberIterable, stringOrUndefinedOrder)

// $ExpectType SortedMap<string, number>
pipe(stringAndNumberIterable, SortedMap.fromIterable(stringOrUndefinedOrder))
