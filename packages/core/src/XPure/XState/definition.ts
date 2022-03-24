// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

import type * as P from "../../PreludeV2/index.js"

export interface XState<S, A> extends XPure<unknown, S, S, unknown, never, A> {}

export interface XStateF<S> extends P.HKT {
  readonly type: XState<S, this["A"]>
}
