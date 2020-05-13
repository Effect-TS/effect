import type { Either } from "../Either/Either"
import type { Effect } from "../Support/Common/effect"

import { left, right } from "./lr"
import { map_ } from "./map"

export function or_(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => Effect<S | S2, R & R2, E | E2, Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, left) : map_(mb, right))
}

export function or<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, left) : map_(mb, right))
}
