import type { Predicate, Refinement } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const RefinedURI = "RefinedURI" as const

export type RefinedURI = typeof RefinedURI

export interface RefinedConfig<E, A, B> {}
export interface PredicateConfig<E, A> {}

export interface AlgebraRefined<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  refined<E, A, B extends A>(
    a: Kind<F, Env, E, A>,
    refinement: Refinement<A, B>,
    config?: Named<ConfigsForType<Env, E, B, RefinedConfig<E, A, B>>>
  ): Kind<F, Env, E, B>
  constrained: {
    <E, A>(
      a: Kind<F, Env, E, A>,
      predicate: Predicate<A>,
      config?: Named<ConfigsForType<Env, E, A, PredicateConfig<E, A>>>
    ): Kind<F, Env, E, A>
  }
}
