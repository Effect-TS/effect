import type { URIS2, Kind2, URIS, Kind, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

import type { Refinement } from "@matechs/core/Function"

export const RefinedURI = "@matechs/core/RefinedURI" as const

export type RefinedURI = typeof RefinedURI

declare module "@morphic-ts/algebras/lib/hkt" {
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

export interface MatechsAlgebraRefined<F, Env> {
  _F: F
  refined: {
    <E, A, B extends A>(
      a: HKT2<F, Env, E, A>,
      refinement: Refinement<A, B>,
      name: string,
      config?: ConfigsForType<Env, E, B>
    ): HKT2<F, Env, E, B>
  }
}

export interface MatechsAlgebraRefined1<F extends URIS, Env extends AnyEnv> {
  _F: F
  refined<A, B extends A>(
    a: Kind<F, Env, A>,
    refinement: Refinement<A, B>,
    name: string,
    config?: ConfigsForType<Env, unknown, B>
  ): Kind<F, Env, B>
}

export interface MatechsAlgebraRefined2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  refined<E, A, B extends A>(
    a: Kind2<F, Env, E, A>,
    refinement: Refinement<A, B>,
    name: string,
    config?: ConfigsForType<Env, E, B>
  ): Kind2<F, Env, E, B>
}
