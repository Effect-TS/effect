import type { Arbitrary } from "fast-check"

export const FastCheckURI = "@matechs/morphic/FastCheckURI" as const

export type FastCheckURI = typeof FastCheckURI

declare module "@morphic-ts/common/lib/config" {
  export interface ConfigType<E, A> {
    [FastCheckURI]: Arbitrary<A>
  }
}

export class FastCheckType<A> {
  _A!: A
  _URI!: FastCheckURI
  constructor(public arb: Arbitrary<A>) {}
}

declare module "@morphic-ts/common/lib/HKT" {
  interface URItoKind<R, A> {
    [FastCheckURI]: (env: R) => FastCheckType<A>
  }
}
