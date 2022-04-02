// ets_tracing: off

import type * as O from "@effect-ts/system/Option"

import type * as P from "../Prelude/index.js"

export type AOfOptions<Ts extends O.Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends O.Option<infer A> ? A : never
}[number]

export interface OptionF extends P.HKT {
  readonly type: O.Option<this["A"]>
}
