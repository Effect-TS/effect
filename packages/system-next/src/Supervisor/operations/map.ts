// ets_tracing: off

import * as T from "../../Effect"
import type { Supervisor } from "../definition"
import { ProxySupervisor } from "./_internal"

/**
 * Maps this supervisor to another one, which has the same effect, but whose
 * value has been transformed by the specified function.
 */
export function map_<A, B>(self: Supervisor<A>, f: (a: A) => B): Supervisor<B> {
  return new ProxySupervisor(T.map_(self.value, f), self)
}
/**
 * Maps this supervisor to another one, which has the same effect, but whose
 * value has been transformed by the specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: Supervisor<A>): Supervisor<B> => map_(self, f)
}
