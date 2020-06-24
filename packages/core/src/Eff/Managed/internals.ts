import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap, FinalizerT, Sequential } from "./releaseMap"

export function internalEffect<S, R, E, A>(
  self: Managed<S, R, E, A>
): T.Effect<S, [R, ReleaseMap], E, [FinalizerT<E>, A]> {
  return T.coerceSE<S, E>()(self.effect)
}

export function releaseAll<S, E>(
  rm: ReleaseMap,
  ex: T.Exit<any, any>
): T.Effect<S, unknown, E, any> {
  return T.coerceSE<S, E>()(rm.releaseAll(ex, new Sequential()))
}
