import * as D from "../../../collection/immutable/Dictionary"
import type { Has, Tag } from "../../../data/Has"
import type { UnionToIntersection } from "../../../data/Utils"
import { Sync } from "../definition"

/**
 * Access a record of services with the required service entries.
 *
 * @tsplus static ets/SyncOps servicesWithSyncStruct
 */
export function servicesWithSyncStruct<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Sync<R, E, B>
  ) =>
    Sync.environmentWithSync(
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
 * Access a tuple of services with the required service entries.
 *
 * @tsplus static ets/SyncOps servicesWithSyncTuple
 */
export function servicesWithSyncTuple<SS extends Tag<any>[]>(...s: SS) {
  return <S, R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Sync<R, E, B>
  ) =>
    Sync.environmentWithSync(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(s.map((v) => r[v.key]) as any))
    )
}
