// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import type { Identity } from "../../Identity/index.js"

/**
 * Fold `Identity` through `Either`
 */
export const foldMap_: <M>(
  M: Identity<M>
) => <E, A>(fa: E.Either<E, A>, f: (a: A) => M) => M = (M) => (fa, f) =>
  E.isLeft(fa) ? M.identity : f(fa.right)

/**
 * Fold `Identity` through `Either`
 */
export const foldMap: <M>(
  M: Identity<M>
) => <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)
