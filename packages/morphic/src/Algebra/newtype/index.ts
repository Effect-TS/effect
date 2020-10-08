import type { Newtype } from "@effect-ts/core/Newtype"
import type { Iso } from "@effect-ts/monocle/Iso"
import type { Prism } from "@effect-ts/monocle/Prism"

import type { AnyEnv, ConfigsForType, Named } from "../config"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export const NewtypeURI = "NewtypeURI" as const

export type NewtypeURI = typeof NewtypeURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [NewtypeURI]: AlgebraNewtype<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [NewtypeURI]: AlgebraNewtype1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [NewtypeURI]: AlgebraNewtype2<F, Env>
  }
}

export interface IsoConfig<L, A, N> {}
export interface PrismConfig<L, A, N> {}

export interface AlgebraNewtype<F, Env> {
  _F: F
  newtypeIso: {
    <E, A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: HKT2<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, IsoConfig<E, A, N>>>
    ): HKT2<F, Env, E, N>
  }
  newtypePrism: {
    <E, A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: HKT2<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, PrismConfig<E, A, N>>>
    ): HKT2<F, Env, E, N>
  }
}

export interface AlgebraNewtype1<F extends URIS, Env> {
  _F: F
  newtypeIso: {
    <A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: Kind<F, Env, A>,
      config?: Named<ConfigsForType<Env, unknown, N, IsoConfig<unknown, A, N>>>
    ): Kind<F, Env, N>
  }
  newtypePrism: {
    <A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: Kind<F, Env, A>,
      config?: Named<ConfigsForType<Env, unknown, N, PrismConfig<unknown, A, N>>>
    ): Kind<F, Env, N>
  }
}

export interface AlgebraNewtype2<F extends URIS2, Env> {
  _F: F
  newtypeIso: {
    <E, A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: Kind2<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, IsoConfig<E, A, N>>>
    ): Kind2<F, Env, E, N>
  }
  newtypePrism: {
    <E, A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: Kind2<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, PrismConfig<E, A, N>>>
    ): Kind2<F, Env, E, N>
  }
}
