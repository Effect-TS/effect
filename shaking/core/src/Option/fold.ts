import type { Option } from "fp-ts/lib/Option"

import type { Effect, Stream, StreamEither, Managed } from "../Support/Common"

import { isNone } from "./isNone"

/**
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `None` the default value is
 * returned, otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @example
 * import { some, none, fold } from 'fp-ts/lib/Option'
 * import { pipe } from 'fp-ts/lib/pipeable'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     fold(() => 'a none', a => `a some containing ${a}`)
 *   ),
 *   'a some containing 1'
 * )
 *
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     fold(() => 'a none', a => `a some containing ${a}`)
 *   ),
 *   'a none'
 * )
 *
 * @since 2.0.0
 */

export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Effect<S1, R1, E1, B>,
  onSome: (a: A) => Effect<S2, R2, E2, C>
): (ma: Option<A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Stream<S1, R1, E1, B>,
  onSome: (a: A) => Stream<S2, R2, E2, C>
): (ma: Option<A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Option<A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Managed<S1, R1, E1, B>,
  onSome: (a: A) => Managed<S2, R2, E2, C>
): (ma: Option<A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<A, B, C>(
  onNone: () => B,
  onSome: (a: A) => C
): (ma: Option<A>) => B | C
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B): (ma: Option<A>) => B {
  return (ma) => (isNone(ma) ? onNone() : onSome(ma.value))
}
