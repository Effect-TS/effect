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

export type AnyNewtype = Newtype<any, any>

export type NewtypeA<N extends AnyNewtype> = N extends Newtype<any, infer A> ? A : never

export interface NewtypeConfig<L, A, N> {}
export interface CoerceConfig<L, A, N> {}
export interface IsoConfig<L, A, N> {}
export interface PrismConfig<L, A, N> {}

export interface MatechsAlgebraNewtype<F, Env> {
  _F: F
  newtype: <N extends AnyNewtype = never>(
    name: string
  ) => {
    <E>(
      a: HKT2<F, Env, E, NewtypeA<N>>,
      config?: ConfigsForType<Env, E, N, NewtypeConfig<E, NewtypeA<N>, N>>
    ): HKT2<F, Env, E, N>
  }
  coerce: <N = never>(
    name: string
  ) => {
    <E, A>(
      a: HKT2<F, Env, E, A>,
      config?: ConfigsForType<Env, E, N, CoerceConfig<E, A, N>>
    ): HKT2<F, Env, E, N>
  }
  iso: {
    <E, A, N>(
      a: HKT2<F, Env, E, A>,
      iso: Iso<A, N>,
      name?: string,
      config?: ConfigsForType<Env, E, N, IsoConfig<E, A, N>>
    ): HKT2<F, Env, E, N>
  }
  prism: {
    <E, A, N>(
      a: HKT2<F, Env, E, A>,
      prism: Prism<A, N>,
      name?: string,
      config?: ConfigsForType<Env, E, N, PrismConfig<E, A, N>>
    ): HKT2<F, Env, E, N>
  }
}

export interface MatechsAlgebraNewtype1<F extends URIS, Env> {
  _F: F
  newtype<N extends AnyNewtype = never>(
    name: string
  ): (
    a: Kind<F, Env, NewtypeA<N>>,
    config?: ConfigsForType<Env, unknown, N, NewtypeConfig<unknown, NewtypeA<N>, N>>
  ) => Kind<F, Env, N>
  coerce: <N = never>(
    name: string
  ) => {
    <A>(
      a: Kind<F, Env, A>,
      config?: ConfigsForType<Env, unknown, N, CoerceConfig<unknown, A, N>>
    ): Kind<F, Env, N>
  }
  iso: {
    <A, N>(
      a: Kind<F, Env, A>,
      iso: Iso<A, N>,
      name?: string,
      config?: ConfigsForType<Env, unknown, N, IsoConfig<unknown, A, N>>
    ): Kind<F, Env, N>
  }
  prism: {
    <A, N>(
      a: Kind<F, Env, A>,
      prism: Prism<A, N>,
      name?: string,
      config?: ConfigsForType<Env, unknown, N, PrismConfig<unknown, A, N>>
    ): Kind<F, Env, N>
  }
}

export interface MatechsAlgebraNewtype2<F extends URIS2, Env> {
  _F: F
  newtype<N extends AnyNewtype = never>(
    name: string
  ): <E>(
    a: Kind2<F, Env, E, NewtypeA<N>>,
    config?: ConfigsForType<Env, E, N, NewtypeConfig<E, NewtypeA<N>, N>>
  ) => Kind2<F, Env, E, N>
  coerce: <N = never>(
    name: string
  ) => {
    <E, A>(
      a: Kind2<F, Env, E, A>,
      config?: ConfigsForType<Env, E, N, CoerceConfig<E, A, N>>
    ): Kind2<F, Env, E, N>
  }
  iso: {
    <E, A, N>(
      a: Kind2<F, Env, E, A>,
      iso: Iso<A, N>,
      name?: string,
      config?: ConfigsForType<Env, E, N, IsoConfig<E, A, N>>
    ): Kind2<F, Env, E, N>
  }
  prism: {
    <E, A, N>(
      a: Kind2<F, Env, E, A>,
      iso: Prism<A, N>,
      name?: string,
      config?: ConfigsForType<Env, E, N, PrismConfig<E, A, N>>
    ): Kind2<F, Env, E, N>
  }
}
