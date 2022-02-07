// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Identity } from "../../Identity/index.js"
import { fromAssociative } from "../../Identity/index.js"
import { getApplyAssociative } from "./getApplyAssociative.js"

/**
 * `Apply` Identity
 *
 * | x       | y       | combine(y)(x)      |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 */
export function getApplyIdentity<A>(M: Identity<A>): Identity<O.Option<A>> {
  return fromAssociative(getApplyAssociative(M))(O.some(M.identity))
}
