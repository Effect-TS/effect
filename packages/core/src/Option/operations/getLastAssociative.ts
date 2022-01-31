// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Associative } from "../../Associative/index.js"
import { makeAssociative } from "../../Associative/index.js"

/**
 * `Associative` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getLastAssociative<A>(): Associative<O.Option<A>> {
  return makeAssociative((x, y) => (O.isNone(x) ? x : y))
}
