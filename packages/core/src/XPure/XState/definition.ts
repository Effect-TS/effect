// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

import type { HKT } from "../../PreludeV2/HKT/index.js"

export interface XState<S, A> extends XPure<unknown, S, S, unknown, never, A> {}

export interface XStateF<S> extends HKT {
  readonly type: XState<S, this["A"]>
}
