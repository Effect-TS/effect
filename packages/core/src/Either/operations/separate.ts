// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type { Identity } from "../../Identity/index.js"
import type { EitherURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { forEachF } from "./forEachF.js"

/**
 * Separate `Either<E, Either<A, B>>` given `Identity<E>`
 */
export function separate<E>(M: Identity<E>) {
  const empty = E.left(M.identity)

  return <A, B>(
    ma: Either<E, Either<A, B>>
  ): Tp.Tuple<[Either<E, A>, Either<E, B>]> => {
    return E.isLeft(ma)
      ? Tp.tuple(ma, ma)
      : E.isLeft(ma.right)
      ? Tp.tuple(E.right(ma.right.left), empty)
      : Tp.tuple(empty, E.right(ma.right.right))
  }
}

/**
 * Get `Wiltable`'s `separateF` given `Identity<E>`
 */
export function getSeparateF<E>(M: Identity<E>) {
  const sep = separate(M)
  return P.implementSeparateF<[P.URI<EitherURI>], P.Fix<"E", E>>()((_) => (G) => {
    const traverseF = forEachF(G)
    return (f) => (x) => pipe(x, traverseF(f), G.map(sep))
  })
}

/**
 * Get `Separate` instance given `Identity<E>`
 */
export function getSeparate<E>(M: Identity<E>) {
  const _separate = separate(M)
  return P.instance<P.Separate<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    separate: _separate
  })
}
