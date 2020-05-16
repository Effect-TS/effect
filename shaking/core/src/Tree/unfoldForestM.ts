import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"
import type { Monad, Monad1, Monad2, Monad2C, Monad3, Monad3C } from "fp-ts/lib/Monad"

import { array } from "../Array"

import type { Forest } from "./Tree"
import { unfoldTreeM } from "./unfoldTreeM"

/**
 * Monadic forest builder, in depth-first order
 *
 * @since 2.0.0
 */

export function unfoldForestM<M extends URIS3>(
  M: Monad3<M>
): <R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Forest<A>>
export function unfoldForestM<M extends URIS3, E>(
  M: Monad3C<M, E>
): <R, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Forest<A>>
export function unfoldForestM<M extends URIS2>(
  M: Monad2<M>
): <R, E, B>(
  bs: Array<B>,
  f: (b: B) => Kind2<M, R, [E, Array<B>]>
) => Kind2<M, R, Forest<E>>
export function unfoldForestM<M extends URIS2, E>(
  M: Monad2C<M, E>
): <A, B>(
  bs: Array<B>,
  f: (b: B) => Kind2<M, E, [A, Array<B>]>
) => Kind2<M, E, Forest<A>>
export function unfoldForestM<M extends URIS>(
  M: Monad1<M>
): <A, B>(bs: Array<B>, f: (b: B) => Kind<M, [A, Array<B>]>) => Kind<M, Forest<A>>
export function unfoldForestM<M>(
  M: Monad<M>
): <A, B>(bs: Array<B>, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Forest<A>>
export function unfoldForestM<M>(
  M: Monad<M>
): <A, B>(bs: Array<B>, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Forest<A>> {
  const traverseM = array.traverse(M)
  return (bs, f) => traverseM(bs, (b) => unfoldTreeM(M)(b, f))
}
