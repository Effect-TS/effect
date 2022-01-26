import type { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Run an effect while acquiring the resource before and releasing it after.
 * This does not provide the resource to the function.
 *
 * @ets fluent ets/Managed useDiscard
 */
export function useDiscard_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A2> {
  return self.use(() => f)
}

/**
 * Run an effect while acquiring the resource before and releasing it after.
 * This does not provide the resource to the function.
 *
 * @ets_data_first useDiscard_
 */
export function useDiscard<R2, E2, A2>(f: Effect<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Effect<R & R2, E | E2, A2> =>
    useDiscard_(self, f)
}
