import type { HashMap } from "../definition"

/**
 * Performs a union of this `HashMap` and that `HashMap`.
 *
 * @tsplus operator ets/HashMap +
 */
export function union<K0, V0, K1, V1>(self: HashMap<K0, V0>, that: HashMap<K1, V1>) {
  const result: HashMap<K0 | K1, V0 | V1> = self.beginMutation()

  that.forEachWithIndex((k, v) => {
    result.set(k, v)
  })

  return result.endMutation()
}
