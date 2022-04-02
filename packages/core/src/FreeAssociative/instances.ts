// ets_tracing: off

import * as FA from "@effect-ts/system/FreeAssociative"

import { makeAssociative } from "../Associative/index.js"
import { makeIdentity } from "../Identity/index.js"
import type * as P from "../Prelude/index.js"

export interface FreeAssociativeF extends P.HKT {
  readonly type: FA.FreeAssociative<this["A"]>
}

export function getAssociative<A>() {
  return makeAssociative<FA.FreeAssociative<A>>(FA.concat_)
}

export function getIdentity<A>() {
  return makeIdentity<FA.FreeAssociative<A>>(FA.init<A>(), FA.concat_)
}
