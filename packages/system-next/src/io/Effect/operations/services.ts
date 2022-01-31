import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import { Effect } from "../definition"

/**
 * Access a the specified services in the environment of the effect.
 *
 * @ets static ets/EffectOps services
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return Effect.environmentWith(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any
  )
}
