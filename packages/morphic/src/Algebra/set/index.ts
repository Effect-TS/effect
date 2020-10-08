import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"

import type { AnyEnv, ConfigsForType, Named } from "../config"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export const SetURI = "SetURI" as const

export type SetURI = typeof SetURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [SetURI]: AlgebraSet<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [SetURI]: AlgebraSet1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [SetURI]: AlgebraSet2<F, Env>
  }
}

export interface SetConfig<L, A> {}

export interface AlgebraSet<F, Env> {
  _F: F
  set: <L, A>(
    a: HKT2<F, Env, L, A>,
    ord: Ord<A>,
    config?: Named<ConfigsForType<Env, Array<L>, Set<A>, SetConfig<L, A>>>
  ) => HKT2<F, Env, Array<L>, Set<A>>
}

export interface AlgebraSet1<F extends URIS, Env extends AnyEnv> {
  _F: F
  set: <A>(
    a: Kind<F, Env, A>,
    ord: Ord<A>,
    config?: Named<ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>>
  ) => Kind<F, Env, Set<A>>
}

export interface AlgebraSet2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  set: <L, A>(
    a: Kind2<F, Env, L, A>,
    ord: Ord<A>,
    config?: Named<ConfigsForType<Env, Array<L>, Set<A>, SetConfig<L, A>>>
  ) => Kind2<F, Env, Array<L>, Set<A>>
}
