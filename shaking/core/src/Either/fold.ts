import type { StreamEither, Effect, Stream, Managed } from "../Support/Common"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @example
 * import { fold, left, right } from 'fp-ts/lib/Either'
 * import { pipe } from 'fp-ts/lib/pipeable'
 *
 * function onLeft(errors: Array<string>): string {
 *   return `Errors: ${errors.join(', ')}`
 * }
 *
 * function onRight(value: number): string {
 *   return `Ok: ${value}`
 * }
 *
 * assert.strictEqual(
 *   pipe(
 *     right(1),
 *     fold(onLeft, onRight)
 *   ),
 *   'Ok: 1'
 * )
 * assert.strictEqual(
 *   pipe(
 *     left(['error 1', 'error 2']),
 *     fold(onLeft, onRight)
 *   ),
 *   'Errors: error 1, error 2'
 * )
 *
 * @since 2.0.0
 */
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => StreamEither<S1, R1, E1, B>,
  onRight: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Either<E, A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Stream<S1, R1, E1, B>,
  onRight: (a: A) => Stream<S2, R2, E2, C>
): (ma: Either<E, A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Managed<S1, R1, E1, B>,
  onRight: (a: A) => Managed<S2, R2, E2, C>
): (ma: Either<E, A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Effect<S1 | S2, R1, E1, B>,
  onRight: (a: A) => Effect<S1 | S2, R2, E2, C>
): (ma: Either<E, A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<E, A, B, C>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): (ma: Either<E, A>) => B | C
export function fold<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B
): (ma: Either<E, A>) => B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : onRight(ma.right))
}
