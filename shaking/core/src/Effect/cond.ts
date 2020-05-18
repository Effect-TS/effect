import { Effect } from "../Support/Common/effect"

export function cond<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb)
}
