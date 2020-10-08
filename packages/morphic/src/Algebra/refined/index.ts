import type { Predicate, Refinement } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType, Named } from "../config"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export const RefinedURI = "RefinedURI" as const

export type RefinedURI = typeof RefinedURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [RefinedURI]: AlgebraRefined<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [RefinedURI]: AlgebraRefined1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [RefinedURI]: AlgebraRefined2<F, Env>
  }
}

export interface RefinedConfig<E, A, B> {}
export interface PredicateConfig<E, A> {}

export interface AlgebraRefined<F, Env> {
  _F: F
  refined: {
    <E, A, B extends A>(
      a: HKT2<F, Env, E, A>,
      refinement: Refinement<A, B>,
      config?: Named<ConfigsForType<Env, E, B, RefinedConfig<E, A, B>>>
    ): HKT2<F, Env, E, B>
  }
  constrained: {
    <E, A>(
      a: HKT2<F, Env, E, A>,
      predicate: Predicate<A>,
      config?: Named<ConfigsForType<Env, E, A, PredicateConfig<E, A>>>
    ): HKT2<F, Env, E, A>
  }
}

export interface AlgebraRefined1<F extends URIS, Env extends AnyEnv> {
  _F: F
  refined<A, B extends A>(
    a: Kind<F, Env, A>,
    refinement: Refinement<A, B>,
    config?: Named<ConfigsForType<Env, unknown, B, RefinedConfig<unknown, A, B>>>
  ): Kind<F, Env, B>
  constrained: {
    <A>(
      a: Kind<F, Env, A>,
      predicate: Predicate<A>,
      config?: Named<ConfigsForType<Env, unknown, A, PredicateConfig<unknown, A>>>
    ): Kind<F, Env, A>
  }
}

export interface AlgebraRefined2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  refined<E, A, B extends A>(
    a: Kind2<F, Env, E, A>,
    refinement: Refinement<A, B>,
    config?: Named<ConfigsForType<Env, E, B, RefinedConfig<E, A, B>>>
  ): Kind2<F, Env, E, B>
  constrained: {
    <E, A>(
      a: Kind2<F, Env, E, A>,
      predicate: Predicate<A>,
      config?: Named<ConfigsForType<Env, E, A, PredicateConfig<E, A>>>
    ): Kind2<F, Env, E, A>
  }
}
