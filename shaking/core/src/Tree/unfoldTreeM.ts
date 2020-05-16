import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"
import type { Monad, Monad1, Monad2, Monad2C, Monad3, Monad3C } from "fp-ts/lib/Monad"

import type { Tree } from "./Tree"
import { unfoldForestM } from "./unfoldForestM"

/**
 * Monadic tree builder, in depth-first order
 *
 * @since 2.0.0
 */

export function unfoldTreeM<M extends URIS3>(
  M: Monad3<M>
): <R, E, A, B>(
  b: B,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS3, E>(
  M: Monad3C<M, E>
): <R, A, B>(
  b: B,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS2>(
  M: Monad2<M>
): <E, A, B>(b: B, f: (b: B) => Kind2<M, E, [A, Array<B>]>) => Kind2<M, E, Tree<A>>
export function unfoldTreeM<M extends URIS2, E>(
  M: Monad2C<M, E>
): <A, B>(b: B, f: (b: B) => Kind2<M, E, [A, Array<B>]>) => Kind2<M, E, Tree<A>>
export function unfoldTreeM<M extends URIS>(
  M: Monad1<M>
): <A, B>(b: B, f: (b: B) => Kind<M, [A, Array<B>]>) => Kind<M, Tree<A>>
export function unfoldTreeM<M>(
  M: Monad<M>
): <A, B>(b: B, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Tree<A>>
export function unfoldTreeM<M>(
  M: Monad<M>
): <A, B>(b: B, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Tree<A>> {
  const unfoldForestMM = unfoldForestM(M)
  return (b, f) =>
    M.chain(f(b), ([a, bs]) =>
      M.chain(unfoldForestMM(bs, f), (ts) => M.of({ value: a, forest: ts }))
    )
}
