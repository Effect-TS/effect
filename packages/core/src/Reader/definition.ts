// ets_tracing: off

import type { HKT } from "../PreludeV2/index.js"

export type Reader<R, A> = (r: R) => A

export interface ReaderF extends HKT {
  readonly type: Reader<this["R"], this["A"]>
}
