// ets_tracing: off

import type * as O from "@effect-ts/system/Option"

export type AOfOptions<Ts extends O.Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends O.Option<infer A> ? A : never
}[number]
