// ets_tracing: off

import type { Effect } from "../Effect/index.js"
import type { Sync } from "../Sync/index.js"
import type { UnifiableIndexed } from "./index.js"

export const unifyIndex = Symbol()
export type unifyIndex = typeof unifyIndex

export type UnifiableIndexedURI = keyof UnifiableIndexed<any>

export interface Unifiable<X> {
  Sync: [X] extends [Sync<infer R, infer E, infer A>] ? Sync<R, E, A> : never
  Effect: [X] extends [Effect<infer R, infer E, infer A>]
    ? [X] extends [Sync<infer R, infer E, infer A>]
      ? never
      : Effect<R, E, A>
    : never
  Unify: [X] extends [{ readonly [unifyIndex]: infer K }]
    ? K extends UnifiableIndexedURI
      ? UnifiableIndexed<X>[K]
      : never
    : never
}

export type Unify<X> = Unifiable<X>[keyof Unifiable<any>] extends never
  ? X
  : Unifiable<X>[keyof Unifiable<any>]
