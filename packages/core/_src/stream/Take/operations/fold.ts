import { concreteTake } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @tsplus fluent ets/Take fold
 */
export function fold_<E, A, Z>(
  self: Take<E, A>,
  end: Z,
  error: (cause: Cause<E>) => Z,
  value: (chunk: Chunk<A>) => Z,
  __tsplusTrace?: string
): Z {
  concreteTake(self);
  return self._exit.fold(
    (cause) => Cause.flipCauseOption(cause).fold(() => end, error),
    value
  );
}

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @tsplus static ets/Take/Aspects fold
 */
export const fold = Pipeable(fold_);
