import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import { Managed } from "../definition"

/**
 * Accesses the specified services in the environment of the effect.
 *
 * @tsplus static ets/ManagedOps services
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return Managed.environmentWith(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >,
      __tsplusTrace?: string
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any
  )
}
