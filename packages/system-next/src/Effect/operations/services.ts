import type { Has, Tag } from "../../Has"
import { accessCallTrace } from "../../Tracing"
import type { UnionToIntersection } from "../../Utils"
import { environmentWith } from "./environmentWith"

/**
 * Access a the specified services in the environment of the effect.
 *
 * @ets static ets/EffectOps services
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return environmentWith(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any,
    accessCallTrace()
  )
}
