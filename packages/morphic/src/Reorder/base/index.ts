import type * as T from "@effect-ts/core/Sync"

import { getApplyConfig } from "../../HKT"

export const ReorderURI = "ReorderURI" as const

export type ReorderURI = typeof ReorderURI

export const reorderApplyConfig = getApplyConfig(ReorderURI)

export interface Reorder<A> {
  reorder: (u: A) => T.Sync<unknown, never, A>
}

declare module "../../HKT" {
  interface ConfigType<E, A> {
    [ReorderURI]: Reorder<A>
  }
  interface URItoKind<R, E, A> {
    [ReorderURI]: (env: R) => ReorderType<A>
  }
}

export class ReorderType<A> {
  _A!: A
  _URI!: ReorderURI
  constructor(public reorder: Reorder<A>) {}
}
