import type { AnyEnv, ConfigsForType } from "../config"
import type { URIS, Kind, URIS2, Kind2, HKT2 } from "../utils/hkt"

export const RecursiveURI = "@matechs/morphic-alg/RecursiveURI" as const

export type RecursiveURI = typeof RecursiveURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [RecursiveURI]: MatechsAlgebraRecursive<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [RecursiveURI]: MatechsAlgebraRecursive1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [RecursiveURI]: MatechsAlgebraRecursive2<F, Env>
  }
}

export interface RecursiveConfig<L, A> {}

export interface MatechsAlgebraRecursive<F, Env> {
  _F: F
  recursive: <L, A>(
    a: (x: HKT2<F, Env, L, A>) => HKT2<F, Env, L, A>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, L, A, RecursiveConfig<L, A>>
    }
  ) => HKT2<F, Env, L, A>
}

export interface MatechsAlgebraRecursive1<F extends URIS, Env extends AnyEnv> {
  _F: F
  recursive: <A>(
    a: (x: Kind<F, Env, A>) => Kind<F, Env, A>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
    }
  ) => Kind<F, Env, A>
}

export interface MatechsAlgebraRecursive2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  recursive: <L, A>(
    a: (x: Kind2<F, Env, L, A>) => Kind2<F, Env, L, A>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, L, A, RecursiveConfig<L, A>>
    }
  ) => Kind2<F, Env, L, A>
}
