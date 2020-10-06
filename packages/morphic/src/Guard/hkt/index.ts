export const GuardURI = "GuardURI" as const

export type GuardURI = typeof GuardURI

export interface Guard<A> {
  is: (u: unknown) => u is A
}

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [GuardURI]: Guard<A>
  }
}

export class GuardType<A> {
  _A!: A
  _URI!: GuardURI
  constructor(public guard: Guard<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [GuardURI]: (env: R) => GuardType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [GuardURI]: Guard<A>
  }
}
