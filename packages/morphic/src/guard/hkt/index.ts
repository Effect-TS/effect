export const GuardURI = "@matechs/morphic/GuardURI" as const

export type GuardURI = typeof GuardURI

export interface Guard<A> {
  is: (u: unknown) => u is A
}

declare module "@matechs/morphic-alg/config" {
  export interface ConfigType<E, A> {
    [GuardURI]: Guard<A>
  }
}

export class GuardType<A> {
  _A!: A
  _URI!: GuardURI
  constructor(public guard: Guard<A>) {}
}

declare module "@matechs/morphic-alg/utils/hkt" {
  interface URItoKind<R, A> {
    [GuardURI]: (env: R) => GuardType<A>
  }
}

declare module "@matechs/core/Base/HKT" {
  interface URItoKind<A> {
    [GuardURI]: Guard<A>
  }
}
