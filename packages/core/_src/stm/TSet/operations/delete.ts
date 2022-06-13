import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes binding for given key.
 *
 * @tsplus fluent ets/TSet delete
 */
export function delete_<A>(self: TSet<A>, a: A): USTM<void> {
  concreteTSet(self)
  return self.tmap.delete(a)
}

/**
 * Removes binding for given key.
 *
 * @tsplus static ets/TSet/Aspects delete
 */
export const _delete = Pipeable(delete_)

export { _delete as delete }
