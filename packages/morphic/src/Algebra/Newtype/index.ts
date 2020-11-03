import type { Newtype } from "@effect-ts/core/Newtype"
import type { Iso } from "@effect-ts/monocle/Iso"
import type { Prism } from "@effect-ts/monocle/Prism"

import type { ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const NewtypeURI = "NewtypeURI" as const
export type NewtypeURI = typeof NewtypeURI

export interface IsoConfig<L, A, N> {}
export interface PrismConfig<L, A, N> {}

export interface AlgebraNewtypes<F extends InterpreterURIS, Env> {
  _F: F
  newtypeIso: {
    <E, A, N extends Newtype<any, A>>(
      iso: Iso<A, N>,
      a: Kind<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, IsoConfig<E, A, N>>>
    ): Kind<F, Env, E, N>
  }
  newtypePrism: {
    <E, A, N extends Newtype<any, A>>(
      prism: Prism<A, N>,
      a: Kind<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, E, N, PrismConfig<E, A, N>>>
    ): Kind<F, Env, E, N>
  }
}
