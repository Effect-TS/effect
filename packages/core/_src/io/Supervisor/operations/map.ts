import { ProxySupervisor } from "@effect/core/io/Supervisor/operations/proxy"

/**
 * Maps this supervisor to another one, which has the same effect, but whose
 * value has been transformed by the specified function.
 *
 * @tsplus fluent ets/Supervisor map
 */
export function map_<A, B>(self: Supervisor<A>, f: (a: A) => B): Supervisor<B> {
  return new ProxySupervisor(self.value.map(f), self)
}
/**
 * Maps this supervisor to another one, which has the same effect, but whose
 * value has been transformed by the specified function.
 */
export const map = Pipeable(map_)
