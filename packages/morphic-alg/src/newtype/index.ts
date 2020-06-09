import type { ConfigsForType, AnyEnv } from "../config"
import type { URIS2, Kind2, URIS, Kind, HKT2 } from "../utils/hkt"

import type { Iso } from "@matechs/core/Monocle/Iso"
import type { Prism } from "@matechs/core/Monocle/Prism"
import type { Newtype } from "@matechs/core/Newtype"

export const NewtypeURI = "@matechs/morphic-alg/NewtypeURI" as const

export type NewtypeURI = typeof NewtypeURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [NewtypeURI]: MatechsAlgebraNewtype<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [NewtypeURI]: MatechsAlgebraNewtype1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [NewtypeURI]: MatechsAlgebraNewtype2<F, Env>
  }
}

export interface IsoConfig<L, A, N> {}
export interface PrismConfig<L, A, N> {}

export interface MatechsAlgebraNewtype<F, Env> {
  _F: F
  newtypeIso: {
    <E, A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: HKT2<F, Env, E, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, N, IsoConfig<E, A, N>>
      }
    ): HKT2<F, Env, E, N>
  }
  newtypePrism: {
    <E, A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: HKT2<F, Env, E, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, N, PrismConfig<E, A, N>>
      }
    ): HKT2<F, Env, E, N>
  }
}

export interface MatechsAlgebraNewtype1<F extends URIS, Env> {
  _F: F
  newtypeIso: {
    <A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: Kind<F, Env, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, N, IsoConfig<unknown, A, N>>
      }
    ): Kind<F, Env, N>
  }
  newtypePrism: {
    <A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: Kind<F, Env, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, N, PrismConfig<unknown, A, N>>
      }
    ): Kind<F, Env, N>
  }
}

export interface MatechsAlgebraNewtype2<F extends URIS2, Env> {
  _F: F
  newtypeIso: {
    <E, A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: Kind2<F, Env, E, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, N, IsoConfig<E, A, N>>
      }
    ): Kind2<F, Env, E, N>
  }
  newtypePrism: {
    <E, A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: Kind2<F, Env, E, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, N, PrismConfig<E, A, N>>
      }
    ): Kind2<F, Env, E, N>
  }
}
