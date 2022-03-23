import type { LazyArg } from "../../../data/Function"
import { Managed } from "../../../io/Managed"
import { Stream } from "../definition"

/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static ets/StreamOps logAnnotate
 */
export function logAnnotate(
  key: LazyArg<string>,
  value: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.managed(Managed.logAnnotate(key, value))
}
