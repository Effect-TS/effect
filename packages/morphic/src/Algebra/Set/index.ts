import type { Array } from "@effect-ts/core/Array"
import type { Ord } from "@effect-ts/core/Ord"
import type { Set } from "@effect-ts/core/Set"

import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const SetURI = "SetURI" as const

export type SetURI = typeof SetURI

export interface SetConfig<L, A> {}

export interface AlgebraSet<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  set: <L, A>(
    a: Kind<F, Env, L, A>,
    ord: Ord<A>,
    config?: Named<ConfigsForType<Env, Array<L>, Set<A>, SetConfig<L, A>>>
  ) => Kind<F, Env, Array<L>, Set<A>>
}
