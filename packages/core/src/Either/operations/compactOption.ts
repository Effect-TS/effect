// ets_tracing: off

import type { EitherFixedLeftF } from "../instances.js"
import type { Either } from "@effect-ts/system/Either"
import * as EI from "@effect-ts/system/Either"

import { pipe } from "../../Function/index.js"
import type { Identity } from "../../Identity/index.js"
import type { Option } from "../../Option/index.js"
import * as P from "../../PreludeV2/index.js"
import { forEachF } from "./forEachF.js"

/**
 * Compact `Either<E, Option<A>>` given `Identity<E>`
 */
export function compactOption<E>(M: Identity<E>) {
  return <A>(ma: Either<E, Option<A>>): Either<E, A> => {
    return EI.isLeft(ma)
      ? ma
      : ma.right._tag === "None"
      ? EI.left(M.identity)
      : EI.right(ma.right.value)
  }
}

/**
 * Get `Witherable`'s `compactF` given `Identity<E>`
 */
export function getCompactF<E>(M: Identity<E>): P.Wither<EitherFixedLeftF<E>> {
  const com = compactOption(M)
  return (G) => (f) => (x) => {
    const traverseF = forEachF(G)
    return pipe(x, traverseF(f), G.map(com))
  }
}

/**
 * Get `Compact` instance given `Identity<E>`
 */
export function getCompact<E>(M: Identity<E>) {
  const _compact = compactOption(M)
  return P.instance<P.Compact<EitherFixedLeftF<E>>>({
    compact: _compact
  })
}
