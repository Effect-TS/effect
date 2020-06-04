import type { Eq } from "@matechs/core/Eq"

export const EqURI = "@matechs/morphic/EqURI" as const

export type EqURI = typeof EqURI

declare module "@morphic-ts/common/lib/config" {
  export interface ConfigType<E, A> {
    [EqURI]: Eq<A>
  }
}

export class EqType<A> {
  _A!: A
  _URI!: EqURI
  constructor(public eq: Eq<A>) {}
}

declare module "@morphic-ts/common/lib/HKT" {
  interface URItoKind<R, A> {
    [EqURI]: (env: R) => EqType<A>
  }
}
