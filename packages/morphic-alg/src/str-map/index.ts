import type { ConfigsForType, AnyEnv } from "../config"
import type { Kind, URIS, Kind2, URIS2, HKT2 } from "../utils/hkt"

import type { Record } from "@matechs/core/Record"

export const StrMapURI = "@matechs/morphic-alg/StrMapURI" as const

export type StrMapURI = typeof StrMapURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [StrMapURI]: MatechsAlgebraStrMap<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [StrMapURI]: MatechsAlgebraStrMap1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [StrMapURI]: MatechsAlgebraStrMap2<F, Env>
  }
}

export interface StrMapConfig<L, A> {}

export interface MatechsAlgebraStrMap<F, Env> {
  _F: F
  strMap: {
    <L, A>(
      codomain: HKT2<F, Env, L, A>,
      config?: ConfigsForType<
        Env,
        Record<string, L>,
        Record<string, A>,
        StrMapConfig<L, A>
      >
    ): HKT2<F, Env, Record<string, L>, Record<string, A>>
  }
}

export interface MatechsAlgebraStrMap1<F extends URIS, Env extends AnyEnv> {
  _F: F
  strMap: <A>(
    codomain: Kind<F, Env, A>,
    config?: ConfigsForType<Env, unknown, Record<string, A>, StrMapConfig<unknown, A>>
  ) => Kind<F, Env, Record<string, A>>
}

export interface MatechsAlgebraStrMap2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  strMap: <L, A>(
    codomain: Kind2<F, Env, L, A>,
    config?: ConfigsForType<
      Env,
      Record<string, L>,
      Record<string, A>,
      StrMapConfig<L, A>
    >
  ) => Kind2<F, Env, Record<string, L>, Record<string, A>>
}
