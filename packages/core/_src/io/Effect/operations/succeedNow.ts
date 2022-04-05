import { ISucceedNow } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * Returns an effect that models success with the specified value.
 *
 * @tsplus static ets/Effect/Ops succeedNow
 */
export function succeedNow<A>(value: A, __tsplusTrace?: string): Effect<unknown, never, A> {
  return new ISucceedNow(value, __tsplusTrace);
}
