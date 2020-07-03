import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap } from "./releaseMap"

/**
 * Like provideSome_ for effect but for Managed
 */
export const provideSome_ = <S, R, E, A, R0>(
  self: Managed<S, R, E, A>,
  f: (r0: R0) => R
): Managed<S, R0, E, A> =>
  new Managed(
    T.accessM(([r0, rm]: [R0, ReleaseMap]) => T.provideAll_(self.effect, [f(r0), rm]))
  )
