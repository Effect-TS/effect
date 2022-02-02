import { Effect } from "../definition"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus fluent ets/Effect absorbWith
 */
export function absorbWith_<R, A, E>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __etsTrace?: string
) {
  return self
    .sandbox()
    .foldEffect((cause) => Effect.failNow(cause.squashWith(f)), Effect.succeedNow)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @ets_data_first absorbWith_
 */
export function absorbWith<E>(f: (e: E) => unknown, __etsTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, unknown, A> => self.absorbWith(f)
}
