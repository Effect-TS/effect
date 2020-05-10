import { AsyncFn, IAsync } from "../Support/Common"
import { AsyncE } from "../Support/Common/effect"

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(op: AsyncFn<E, A>): AsyncE<E, A> {
  return new IAsync(op) as any
}
