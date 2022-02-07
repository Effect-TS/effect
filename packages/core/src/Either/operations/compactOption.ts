// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import { pipe } from "../../Function/index.js"
import type { Identity } from "../../Identity/index.js"
import type { EitherURI } from "../../Modules/index.js"
import type { Option } from "../../Option/index.js"
import * as P from "../../Prelude/index.js"
import { forEachF } from "./forEachF.js"

/**
 * Compact `Either<E, Option<A>>` given `Identity<E>`
 */
export function compactOption<E>(M: Identity<E>) {
  return <A>(ma: Either<E, Option<A>>): Either<E, A> => {
    return E.isLeft(ma)
      ? ma
      : ma.right._tag === "None"
      ? E.left(M.identity)
      : E.right(ma.right.value)
  }
}

/**
 * Get `Witherable`'s `compactF` given `Identity<E>`
 */
export function getCompactF<E>(M: Identity<E>) {
  const com = compactOption(M)
  return P.implementCompactF<[P.URI<EitherURI>], P.Fix<"E", E>>()((_) => (G) => {
    const traverseF = forEachF(G)
    return (f) => (x) => pipe(x, traverseF(f), G.map(com))
  })
}

/**
 * Get `Compact` instance given `Identity<E>`
 */
export function getCompact<E>(M: Identity<E>) {
  const _compact = compactOption(M)
  return P.instance<P.Compact<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    compact: _compact
  })
}
