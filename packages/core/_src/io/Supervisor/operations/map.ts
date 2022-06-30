import { ProxySupervisor } from "@effect/core/io/Supervisor/operations/proxy"

/**
 * Maps this supervisor to another one, which has the same effect, but whose
 * value has been transformed by the specified function.
 *
 * @tsplus static effect/core/io/Supervisor.Aspects map
 * @tsplus pipeable effect/core/io/Supervisor map
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: Supervisor<A>): Supervisor<B> => new ProxySupervisor(self.value.map(f), self)
}
