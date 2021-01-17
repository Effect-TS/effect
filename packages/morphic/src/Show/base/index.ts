import type { Show } from "@effect-ts/core/Show"

import { getApplyConfig } from "../../HKT"

export const ShowURI = "ShowURI" as const

export type ShowURI = typeof ShowURI

export const showApplyConfig = getApplyConfig(ShowURI)

declare module "../../HKT" {
  interface ConfigType<E, A> {
    [ShowURI]: Show<A>
  }
  interface URItoKind<R, E, A> {
    [ShowURI]: (env: R) => ShowType<A>
  }
}

export class ShowType<A> {
  _A!: A
  _URI!: ShowURI
  constructor(public show: Show<A>) {}
}
