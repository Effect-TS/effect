/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus fluent ets/Effect absorbWith
 */
export function absorbWith_<R, A, E>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
) {
  return self
    .sandbox()
    .foldEffect((cause) => Effect.failNow(cause.squashWith(f)), Effect.succeedNow);
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus static ets/Effect/Aspects absorbWith
 */
export const absorbWith = Pipeable(absorbWith_);
