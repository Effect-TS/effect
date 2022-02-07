// ets_tracing: off

import type { Ord } from "@effect-ts/system/Ord"
import { makeOrd } from "@effect-ts/system/Ord"

import * as A from "../Associative/index.js"
import * as I from "../Identity/index.js"
import { Associative as OrderingAssociative } from "../Ordering/index.js"

/**
 * Returns a `Associative` such that:
 *
 * - its `combine(ord2)(ord1)` operation will order first by `ord1`, and then by `ord2`
 */
export function getAssociative<A = never>(): A.Associative<Ord<A>> {
  return A.makeAssociative((x, y) =>
    makeOrd((a, b) => OrderingAssociative.combine(x.compare(a, b), y.compare(a, b)))
  )
}

/**
 * Returns a `Identity` such that:
 *
 * - its `combine(ord2)(ord1)` operation will order first by `ord1`, and then by `ord2`
 * - its `empty` value is an `Ord` that always considers compared elements equal
 */
export function getIdentity<A = never>(): I.Identity<Ord<A>> {
  return I.makeIdentity(
    makeOrd(() => 0),
    getAssociative<A>().combine
  )
}

/**
 * Order by first, second, third, etc
 */
export function consecutive<A>(...ords: Ord<A>[]) {
  return I.fold(getIdentity<A>())(ords)
}
