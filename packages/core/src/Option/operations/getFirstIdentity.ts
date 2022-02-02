// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Identity } from "../../Identity"
import { fromAssociative } from "../../Identity"
import { getFirstAssociative } from "./getFirstAssociative"

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
