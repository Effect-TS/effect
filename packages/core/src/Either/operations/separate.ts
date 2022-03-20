// ets_tracing: off

import type { EitherFixedLeftF } from "@effect-ts/core/Either"
import type { Either } from "@effect-ts/system/Either"
import * as EI from "@effect-ts/system/Either"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type { Identity } from "../../Identity/index.js"
import * as P from "../../PreludeV2/index.js"
import { forEachF } from "./forEachF.js"

/**
 * Separate `Either<E, Either<A, B>>` given `Identity<E>`
 */
export function separate<E>(M: Identity<E>) {
  const empty = EI.left(M.identity)

  return <A, B>(
    ma: Either<E, Either<A, B>>
  ): Tp.Tuple<[Either<E, A>, Either<E, B>]> => {
    return EI.isLeft(ma)
      ? Tp.tuple(ma, ma)
      : EI.isLeft(ma.right)
      ? Tp.tuple(EI.right(ma.right.left), empty)
      : Tp.tuple(empty, EI.right(ma.right.right))
  }
}

/**
 * Get `Wiltable`'s `separateF` given `Identity<E>`
 */
export function getSeparateF<E>(M: Identity<E>): P.Wilt<EitherFixedLeftF<E>> {
  const sep = separate(M)

  return (G_) => (f) => (x) => {
    const traverseF = forEachF(G_)
    return pipe(x, traverseF(f), G_.map(sep))
  }
}

/**
 * Get `Separate` instance given `Identity<E>`
 */
export function getSeparate<E>(M: Identity<E>) {
  const _separate = separate(M)
  return P.instance<P.Separate<EitherFixedLeftF<E>>>({
    separate: _separate
  })
}
