import * as A from "../../../collection/immutable/Array"
import * as D from "../../../collection/immutable/Dictionary"
import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import type { Effect } from "./_internal/effect-api"
import { environmentWithEffect } from "./environmentWithEffect"

/**
 * Access a tuple of services with the required service entries monadically.
 */
export function servicesWithEffectT<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Effect<R, E, B>
  ) =>
    environmentWithEffect(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required service entries monadically.
 */
export function servicesWithEffectS<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Effect<R, E, B>
  ) =>
    environmentWithEffect(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(D.map_(s, (v) => r[v.key]) as any)
    )
}
