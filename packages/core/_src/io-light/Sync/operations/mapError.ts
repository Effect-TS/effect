import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @tsplus fluent ets/Sync mapError
 */
export function mapError_<R, E, A, E1>(
  self: Sync<R, E, A>,
  f: (e: E) => E1
): Sync<R, E1, A> {
  concreteXPure(self);
  return self.mapError(f);
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @tsplus static ets/Sync/Aspects mapError
 */
export const mapError = Pipeable(mapError_);
