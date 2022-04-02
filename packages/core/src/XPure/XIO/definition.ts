// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

import type { HKT } from "../../Prelude/index.js"

export interface XIO<A> extends XPure<unknown, unknown, unknown, unknown, never, A> {}

export interface XIOF extends HKT {
  readonly type: XIO<this["A"]>
}
