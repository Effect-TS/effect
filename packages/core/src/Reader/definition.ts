// ets_tracing: off

import type { HKT } from "../Prelude/index.js"

export type Reader<R, A> = (r: R) => A

export interface ReaderF extends HKT {
  readonly type: Reader<this["R"], this["A"]>
}
