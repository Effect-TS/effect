import { IFail } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/Effect/Ops failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): IO<E, never> {
  return new IFail(cause, __tsplusTrace);
}
