import * as A from "../../../collection/immutable/Array"
import * as D from "../../../collection/immutable/Dictionary"
import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import { STM } from "../definition"

// TODO(Mike/Max): Improve naming

/**
 * Access a record of services with the required service entries monadically.
 *
 * @tsplus static ets/STMOps servicesWithSTMS
 */
export function servicesWithSTMS<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => STM<R, E, B>
  ) =>
    STM.environmentWithSTM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(D.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a tuple of services with the required service entries monadically.
 *
 * @tsplus static ets/STMOps servicesWithSTMT
 */
export function servicesWithSTMT<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => STM<R, E, B>
  ) =>
    STM.environmentWithSTM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}
