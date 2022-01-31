import { Managed } from "../definition"

/**
 * Runs all the finalizers associated with this scope. This is useful to
 * conceptually "close" a scope when composing multiple managed effects. Note
 * that this is only safe if the result of this managed effect is valid
 * outside its scope.
 *
 * @tsplus fluent ets/Managed release
 */
export function release<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.fromEffect(self.useNow())
}
