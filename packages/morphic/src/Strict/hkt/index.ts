import type * as T from "@effect-ts/core/Sync"

export const StrictURI = "StrictURI" as const

export type StrictURI = typeof StrictURI

export interface Strict<A> {
  shrink: <K extends A>(u: K) => T.Sync<unknown, never, A>
}

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [StrictURI]: Strict<A>
  }
}

export class StrictType<A> {
  _A!: A
  _URI!: StrictURI
  constructor(public strict: Strict<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [StrictURI]: (env: R) => StrictType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [StrictURI]: Strict<A>
  }
}
