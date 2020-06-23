import { AnyEnv } from "./AnyEnv"
import { SyncR } from "./effect"
import { IRead, ISucceed } from "./primitives"

/**
 * Effectfully accesses the environment of the effect.
 */
export const access = <A, R0 extends AnyEnv = {}>(f: (_: R0) => A): SyncR<R0, A> =>
  new IRead((_: R0) => new ISucceed(f(_)))
