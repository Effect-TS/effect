// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Identity } from "../../Identity/index.js"
import { fromAssociative } from "../../Identity/index.js"
import { getFirstAssociative } from "./getFirstAssociative.js"

/**
 * `Identity` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getFirstIdentity<A>(): Identity<O.Option<A>> {
  return fromAssociative(getFirstAssociative<A>())(O.none)
}
