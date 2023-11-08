import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import * as RedBlackTree from "effect/RedBlackTree"

declare const stringAndNumberIterable: Iterable<[string, number]>
declare const stringOrUndefinedOrder: Order<string | undefined>

// -------------------------------------------------------------------------------------
// fromIterable
// -------------------------------------------------------------------------------------

// $ExpectType RedBlackTree<string, number>
RedBlackTree.fromIterable(stringAndNumberIterable, stringOrUndefinedOrder)

// $ExpectType RedBlackTree<string, number>
pipe(stringAndNumberIterable, RedBlackTree.fromIterable(stringOrUndefinedOrder))
