// tracing: off

import * as FA from "@effect-ts/system/FreeAssociative"

import { makeAssociative } from "../Associative"
import { makeIdentity } from "../Identity"

export function getAssociative<A>() {
  return makeAssociative<FA.FreeAssociative<A>>(FA.concat_)
}

export function getIdentity<A>() {
  return makeIdentity<FA.FreeAssociative<A>>(FA.init<A>(), FA.concat_)
}
