import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import * as SortedSet from "effect/SortedSet"

declare const stringIterable: Iterable<string>
declare const stringOrUndefinedOrder: Order<string | undefined>

// -------------------------------------------------------------------------------------
// fromIterable
// -------------------------------------------------------------------------------------

// $ExpectType SortedSet<string>
SortedSet.fromIterable(stringIterable, stringOrUndefinedOrder)

// $ExpectType SortedSet<string>
pipe(stringIterable, SortedSet.fromIterable(stringOrUndefinedOrder))
