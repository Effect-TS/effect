import type * as T from "@effect-ts/core/Sync"

import { getApplyConfig } from "../../HKT"

export const StrictURI = "StrictURI" as const

export type StrictURI = typeof StrictURI

export const strictApplyConfig = getApplyConfig(StrictURI)

export interface Strict<A> {
  shrink: <K extends A>(u: K) => T.Sync<unknown, never, A>
}

declare module "../../HKT" {
  interface ConfigType<E, A> {
    [StrictURI]: Strict<A>
  }
  interface URItoKind<R, E, A> {
    [StrictURI]: (env: R) => StrictType<A>
  }
}

export class StrictType<A> {
  _A!: A
  _URI!: StrictURI
  constructor(public strict: Strict<A>) {}
}
