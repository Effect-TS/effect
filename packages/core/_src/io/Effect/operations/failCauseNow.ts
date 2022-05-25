import { IFail } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/Effect/Ops failCauseNow
 */
export function failCauseNow<E>(cause: Cause<E>, __tsplusTrace?: string): Effect.IO<E, never> {
  return new IFail(() => cause, __tsplusTrace)
}
