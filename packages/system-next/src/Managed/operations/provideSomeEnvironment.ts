import { provideSomeEnvironment_ as provideSomeEnvironmentEffect_ } from "../../Effect/operations/provideSomeEnvironment"
import type { Managed } from "../definition"
import { managedApply } from "../definition"

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Managed<R, E, A>,
  f: (r0: R0) => R,
  __trace?: string
): Managed<R0, E, A> {
  return managedApply<R0, E, A>(provideSomeEnvironmentEffect_(self.effect, f, __trace))
}

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R0, R>(f: (r0: R0) => R, __trace?: string) {
  return <E, A>(self: Managed<R, E, A>): Managed<R0, E, A> =>
    provideSomeEnvironment_(self, f, __trace)
}
