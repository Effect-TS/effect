import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const RecursiveURI = "RecursiveURI" as const

export type RecursiveURI = typeof RecursiveURI

export interface RecursiveConfig<L, A> {}

export interface AlgebraRecursive<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  recursive: <L, A>(
    a: (x: Kind<F, Env, L, A>) => Kind<F, Env, L, A>,
    config?: Named<ConfigsForType<Env, L, A, RecursiveConfig<L, A>>>
  ) => Kind<F, Env, L, A>
}
