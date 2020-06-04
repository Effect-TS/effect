import type { Kind, URIS, Kind2, URIS2, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import type { Array } from "@matechs/core/Array"
import type { Ord } from "@matechs/core/Ord"
import type { Set } from "@matechs/core/Set"

export const SetURI = "@matechs/core/SetURI" as const

export type SetURI = typeof SetURI

declare module "@morphic-ts/algebras/lib/hkt" {
  export interface Algebra<F, Env> {
    [SetURI]: MatechsAlgebraSet<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [SetURI]: MatechsAlgebraSet1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [SetURI]: MatechsAlgebraSet2<F, Env>
  }
}

export interface MatechsAlgebraSet<F, Env> {
  _F: F
  set: <L, A>(
    a: HKT2<F, Env, L, A>,
    ord: Ord<A>,
    config?: ConfigsForType<Env, Array<L>, Set<A>>
  ) => HKT2<F, Env, Array<L>, Set<A>>
}

export interface MatechsAlgebraSet1<F extends URIS, Env extends AnyEnv> {
  _F: F
  set: <A>(
    a: Kind<F, Env, A>,
    ord: Ord<A>,
    config?: ConfigsForType<Env, Array<unknown>, Set<A>>
  ) => Kind<F, Env, Set<A>>
}

export interface MatechsAlgebraSet2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  set: <L, A>(
    a: Kind2<F, Env, L, A>,
    ord: Ord<A>,
    config?: ConfigsForType<Env, Array<L>, Set<A>>
  ) => Kind2<F, Env, Array<L>, Set<A>>
}
