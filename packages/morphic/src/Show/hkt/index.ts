import type { Show } from "@effect-ts/core/Classic/Show"

export const ShowURI = "ShowURI" as const

export type ShowURI = typeof ShowURI

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [ShowURI]: Show<A>
  }
}

export class ShowType<A> {
  _A!: A
  _URI!: ShowURI
  constructor(public show: Show<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [ShowURI]: (env: R) => ShowType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [ShowURI]: Show<A>
  }
}
