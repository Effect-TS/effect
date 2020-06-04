import type { Show } from "@matechs/core/Show"

export const ShowURI = "@matechs/morphic/ShowURI" as const

export type ShowURI = typeof ShowURI

declare module "@morphic-ts/common/lib/config" {
  export interface ConfigType<E, A> {
    [ShowURI]: Show<A>
  }
}

export class ShowType<A> {
  _A!: A
  _URI!: ShowURI
  constructor(public show: Show<A>) {}
}

declare module "@morphic-ts/common/lib/HKT" {
  interface URItoKind<R, A> {
    [ShowURI]: (env: R) => ShowType<A>
  }
}
