// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Identity } from "../../Identity"
import { fromAssociative } from "../../Identity"
import { getApplyAssociative } from "./getApplyAssociative"

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
  return fromAssociative(getApplyAssociative(M))(O.none)
}
