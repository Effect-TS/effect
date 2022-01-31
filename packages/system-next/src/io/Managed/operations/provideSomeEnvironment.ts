import { Managed } from "../definition"

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @ets fluent ets/Managed provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Managed<R, E, A>,
  f: (r0: R0) => R,
  __etsTrace?: string
): Managed<R0, E, A> {
  return Managed(self.effect.provideSomeEnvironment(f))
}

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R0, R>(f: (r0: R0) => R, __etsTrace?: string) {
  return <E, A>(self: Managed<R, E, A>): Managed<R0, E, A> =>
    provideSomeEnvironment_(self, f)
}
