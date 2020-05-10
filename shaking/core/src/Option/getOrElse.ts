import type { Option } from "fp-ts/lib/Option"

import type { Effect, Stream, StreamEither, Managed } from "../Support/Common"

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @example
 * import { some, none, getOrElse } from 'fp-ts/lib/Option'
 * import { pipe } from 'fp-ts/lib/pipeable'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     getOrElse(() => 0)
 *   ),
 *   1
 * )
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     getOrElse(() => 0)
 *   ),
 *   0
 * )
 *
 * @since 2.0.0
 */

export function getOrElse<S2, R2, E2, B>(
  onNone: () => Effect<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Effect<S, R, E, A>>) => Effect<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Managed<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<Managed<S, R, E, A>>
) => Managed<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Stream<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Stream<S, R, E, A>>) => Stream<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => StreamEither<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<StreamEither<S, R, E, A>>
) => StreamEither<S | S2, R & R2, E | E2, A | B>
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B
export function getOrElse<A>(onNone: () => A): (ma: Option<A>) => A {
  return (o) => (o._tag === "None" ? onNone() : o.value)
}
