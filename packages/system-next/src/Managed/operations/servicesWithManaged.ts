import * as A from "../../Collections/Immutable/Array"
import * as D from "../../Collections/Immutable/Dictionary"
import type { Has, Tag } from "../../Has"
import type { UnionToIntersection } from "../../Utils"
import type { Managed } from "../definition"
import { environmentWithManaged } from "./environmentWithManaged"

/**
 * Access a tuple of services with the required service entries monadically.
 */
export function servicesWithManagedT<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Managed<R, E, B>
  ) =>
    environmentWithManaged(
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
export function servicesWithManagedS<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Managed<R, E, B>
  ) =>
    environmentWithManaged(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(D.map_(s, (v) => r[v.key]) as any)
    )
}
