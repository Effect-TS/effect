import type { Equal } from "@effect-ts/core/Classic/Equal"

import { getApplyConfig } from "../../HKT"

export const EqURI = "Eq" as const
export type EqURI = typeof EqURI

export const eqApplyConfig = getApplyConfig(EqURI)

declare module "../../HKT" {
  interface URItoKind<R, E, A> {
    [EqURI]: (env: R) => EqType<A>
  }
  interface ConfigType<E, A> {
    [EqURI]: Equal<A>
  }
}

export class EqType<A> {
  _A!: A
  _URI!: EqURI
  constructor(public eq: Equal<A>) {}
}
