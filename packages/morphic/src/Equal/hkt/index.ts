import type { Equal } from "@effect-ts/core/Classic/Equal"

export const EqURI = "EqURI" as const
export type EqURI = typeof EqURI

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [EqURI]: Equal<A>
  }
}

export class EqType<A> {
  _A!: A
  _URI!: EqURI
  constructor(public eq: Equal<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [EqURI]: (env: R) => EqType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [EqURI]: Equal<A>
  }
}
