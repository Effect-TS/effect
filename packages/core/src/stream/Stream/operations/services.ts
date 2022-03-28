import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import { Stream } from "../definition"

/**
 * Accesses the specified services.
 *
 * @tsplus static ets/StreamOps services
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return Stream.environmentWith(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any
  )
}
