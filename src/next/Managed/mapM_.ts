import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap } from "./releaseMap"

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapM_ = <S, R, E, A, S2, R2, E2, B>(
  self: Managed<S, R, E, A>,
  f: (a: A) => T.Effect<S2, R2, E2, B>
) =>
  new Managed<S | S2, R & R2, E | E2, B>(
    T.chain_(self.effect, ([fin, a]) =>
      T.provideSome_(
        T.map_(f(a), (b) => [fin, b]),
        ([r]: [R & R2, ReleaseMap]) => r
      )
    )
  )

export const mapM = <A, S2, R2, E2, B>(f: (a: A) => T.Effect<S2, R2, E2, B>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
) =>
  new Managed<S | S2, R & R2, E | E2, B>(
    T.chain_(self.effect, ([fin, a]) =>
      T.provideSome_(
        T.map_(f(a), (b) => [fin, b]),
        ([r]: [R & R2, ReleaseMap]) => r
      )
    )
  )
