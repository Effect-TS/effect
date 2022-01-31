// ets_tracing: off

/**
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as A from "../Collections/Immutable/Array/index.js"
import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { Has, Tag } from "../Has/index.js"
import { mergeEnvironments } from "../Has/index.js"
import type { UnionToIntersection } from "../Utils/index.js"
import * as X from "./core.js"

/**
 * Access a record of services with the required Service Entries
 */
export function accessServicesM<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => X.Sync<R, E, B>
  ) =>
    X.accessM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export const accessServicesTM =
  <SS extends Tag<any>[]>(...s: SS) =>
  <S, R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => X.Sync<R, E, B>
  ) =>
    X.accessM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )

export function accessServicesT<SS extends Tag<any>[]>(...s: SS) {
  return <B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => B
  ) =>
    X.access(
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
 * Access a record of services with the required Service Entries
 */
export function accessServices<SS extends Record<string, Tag<any>>>(s: SS) {
  return <B>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => B
  ) =>
    X.access(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceM<T>(s: Tag<T>) {
  return <R, E, B>(f: (a: T) => X.Sync<R, E, B>) =>
    X.accessM((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function accessService<T>(s: Tag<T>) {
  return <B>(f: (a: T) => B) => accessServiceM(s)((a) => X.succeed(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function service<T>(s: Tag<T>) {
  return accessServiceM(s)((a) => X.succeed(a))
}

/**
 * Provides the service with the required Service Entry
 */
export function provideServiceM<T>(_: Tag<T>) {
  return <R, E>(f: X.Sync<R, E, T>) =>
    <R1, E1, A1>(ma: X.Sync<R1 & Has<T>, E1, A1>): X.Sync<R & R1, E | E1, A1> =>
      X.accessM((r: R & R1) =>
        X.chain_(f, (t) => X.provideAll_(ma, mergeEnvironments(_, r, t)))
      )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideService<T>(_: Tag<T>) {
  return (f: T) =>
    <R1, E1, A1>(ma: X.Sync<R1 & Has<T>, E1, A1>): X.Sync<R1, E1, A1> =>
      provideServiceM(_)(X.succeed(f))(ma)
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceServiceM<R, E, T>(_: Tag<T>, f: (_: T) => X.Sync<R, E, T>) {
  return <R1, E1, A1>(
    ma: X.Sync<R1 & Has<T>, E1, A1>
  ): X.Sync<R & R1 & Has<T>, E | E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: X.Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => X.Sync<R, E, T>
): X.Sync<R & R1 & Has<T>, E | E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceService<T>(_: Tag<T>, f: (_: T) => T) {
  return <R1, E1, A1>(ma: X.Sync<R1 & Has<T>, E1, A1>): X.Sync<R1 & Has<T>, E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(X.succeed(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: X.Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): X.Sync<R1 & Has<T>, E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(X.succeed(f(t)))(ma))
}
