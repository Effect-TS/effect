// ets_tracing: off

import * as A from "../../Collections/Immutable/Array"
import * as D from "../../Collections/Immutable/Dictionary"
import type { Has, Tag } from "../../Has"
import type { UnionToIntersection } from "../../Utils"
import type { Effect } from "../definition"
import { environmentWithEffect } from "./environmentWithEffect"

/**
 * Access a record of services with the required service entries monadically.
 */
export function servicesWithEffectS<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Effect<R, E, B>,
    __trace?: string
  ) =>
    environmentWithEffect(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(D.map_(s, (v) => r[v.key]) as any),
      __trace
    )
}

/**
 * Access a tuple of services with the required service entries monadically.
 */
export function servicesWithEffectT<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Effect<R, E, B>,
    __trace?: string
  ) =>
    environmentWithEffect(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any)),
      __trace
    )
}
