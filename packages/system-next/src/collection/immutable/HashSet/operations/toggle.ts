import type { HashSet } from "../definition"

/**
 * Checks if a value is present in the `HashSet`. If it is present, the value
 * will be removed from the `HashSet`, otherwise the value will be added to the
 * `HashSet`.
 *
 * @tsplus fluent ets/HashSet toggle
 */
export function toggle_<A>(self: HashSet<A>, value: A): HashSet<A> {
  return self.has(value) ? self.remove(value) : self.add(value)
}

/**
 * Checks if a value is present in the `HashSet`. If it is present, the value
 * will be removed from the `HashSet`, otherwise the value will be added to the
 * `HashSet`.
 *
 * @ets_data_first toggle_
 */
export function toggle<A>(value: A) {
  return (self: HashSet<A>): HashSet<A> => self.toggle(value)
}
