// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

import type { HKT } from "../../Prelude/index.js"

export interface XReader<R, A> extends XPure<unknown, unknown, unknown, R, never, A> {}

export interface XReaderF extends HKT {
  readonly type: XReader<this["R"], this["A"]>
}
