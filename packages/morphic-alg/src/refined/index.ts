import type { ConfigsForType, AnyEnv } from "../config"
import type { URIS2, Kind2, URIS, Kind, HKT2 } from "../utils/hkt"

import type { Refinement, Predicate } from "@matechs/core/Function"

export const RefinedURI = "@matechs/morphic-alg/RefinedURI" as const

export type RefinedURI = typeof RefinedURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [RefinedURI]: MatechsAlgebraRefined<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [RefinedURI]: MatechsAlgebraRefined1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [RefinedURI]: MatechsAlgebraRefined2<F, Env>
  }
}

export interface RefinedConfig<E, A, B> {}
export interface PredicateConfig<E, A> {}

export interface MatechsAlgebraRefined<F, Env> {
  _F: F
  refined: {
    <E, A, B extends A>(
      a: HKT2<F, Env, E, A>,
      refinement: Refinement<A, B>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, B, RefinedConfig<E, A, B>>
      }
    ): HKT2<F, Env, E, B>
  }
  constrained: {
    <E, A>(
      a: HKT2<F, Env, E, A>,
      predicate: Predicate<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, A, PredicateConfig<E, A>>
      }
    ): HKT2<F, Env, E, A>
  }
}

export interface MatechsAlgebraRefined1<F extends URIS, Env extends AnyEnv> {
  _F: F
  refined<A, B extends A>(
    a: Kind<F, Env, A>,
    refinement: Refinement<A, B>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, unknown, B, RefinedConfig<unknown, A, B>>
    }
  ): Kind<F, Env, B>
  constrained: {
    <A>(
      a: Kind<F, Env, A>,
      predicate: Predicate<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, A, PredicateConfig<unknown, A>>
      }
    ): Kind<F, Env, A>
  }
}

export interface MatechsAlgebraRefined2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  refined<E, A, B extends A>(
    a: Kind2<F, Env, E, A>,
    refinement: Refinement<A, B>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, E, B, RefinedConfig<E, A, B>>
    }
  ): Kind2<F, Env, E, B>
  constrained: {
    <E, A>(
      a: Kind2<F, Env, E, A>,
      predicate: Predicate<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, E, A, PredicateConfig<E, A>>
      }
    ): Kind2<F, Env, E, A>
  }
}
