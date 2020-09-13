/**
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as A from "../Array"
import { access, accessM, chain_, provideAll_, succeed } from "../Effect/core"
import type { Effect } from "../Effect/effect"
import { provide } from "../Effect/provide"
import { pipe } from "../Function"
import type { Has, Tag } from "../Has"
import { has, mergeEnvironments } from "../Has"
import * as R from "../Record"
import type { UnionToIntersection } from "../Utils"

/**
 * Access a record of services with the required Service Entries
 */
export function accessServicesM<SS extends Record<string, Tag<any>>>(s: SS) {
  return <S, R = unknown, E = never, B = unknown>(
    f: (
      a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Effect<S, R, E, B>
  ) =>
    accessM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export const accessServicesTM = <SS extends Tag<any>[]>(...s: SS) => <
  S,
  R = unknown,
  E = never,
  B = unknown
>(
  f: (
    ...a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }
  ) => Effect<S, R, E, B>
) =>
  accessM(
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
    access(
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
    f: (
      a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => B
  ) =>
    access(
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
  return <S, R, E, B>(f: (a: T) => Effect<S, R, E, B>) =>
    accessM((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceF<T>(s: Tag<T>) {
  return <
    K extends keyof T &
      {
        [k in keyof T]: T[k] extends (...args: any[]) => Effect<any, any, any, any>
          ? k
          : never
      }[keyof T]
  >(
    k: K
  ) => (
    ...args: T[K] extends (...args: infer ARGS) => Effect<any, any, any, any>
      ? ARGS
      : unknown[]
  ): T[K] extends (...args: any[]) => Effect<infer S, infer R, infer E, infer A>
    ? Effect<S, R & Has<T>, E, A>
    : unknown[] => accessServiceM(s)((t) => (t[k] as any)(...args)) as any
}

/**
 * Access a service with the required Service Entry
 */
export function accessService<T>(s: Tag<T>) {
  return <B>(f: (a: T) => B) => accessServiceM(s)((a) => succeed(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function readService<T>(s: Tag<T>) {
  return accessServiceM(s)((a) => succeed(a))
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function provideServiceM<T>(_: Tag<T>) {
  return <S, R, E>(f: Effect<S, R, E, T>) => <S1, R1, E1, A1>(
    ma: Effect<S1, R1 & Has<T>, E1, A1>
  ): Effect<S | S1, R & R1, E | E1, A1> =>
    accessM((r: R & R1) =>
      chain_(f, (t) => provideAll_(ma, mergeEnvironments(_, r, t)))
    )
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function provideService<T>(_: Tag<T>) {
  return (f: T) => <S1, R1, E1, A1>(
    ma: Effect<S1, R1 & Has<T>, E1, A1>
  ): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeed(f))(ma)
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<S, R, E, T>(
  _: Tag<T>,
  f: (_: T) => Effect<S, R, E, T>
) {
  return <S1, R1, E1, A1>(
    ma: Effect<S1, R1 & Has<T>, E1, A1>
  ): Effect<S | S1, R & R1 & Has<T>, E | E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<S, R, E, T, S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Effect<S, R, E, T>
): Effect<S | S1, R & R1 & Has<T>, E | E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(_: Tag<T>, f: (_: T) => T) {
  return <S1, R1, E1, A1>(
    ma: Effect<S1, R1 & Has<T>, E1, A1>
  ): Effect<S1, R1 & Has<T>, E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<S1, R1, E1, A1, T>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Effect<S1, R1 & Has<T>, E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))
}

/**
 * Branding sub-environments
 */
export const RegionURI = Symbol()
export interface Region<T, K> {
  [RegionURI]: {
    _K: () => K
    _T: () => T
  }
}

export function region<K, T>(): Tag<Region<T, K>> {
  return has<Region<T, K>>()
}

export function useRegion<K, T>(h: Tag<Region<T, K>>) {
  return <S, R, E, A>(e: Effect<S, R & T, E, A>) =>
    accessServiceM(h)((a) => pipe(e, provide((a as any) as T)))
}

export function accessRegionM<K, T>(h: Tag<Region<T, K>>) {
  return <S, R, E, A>(e: (_: T) => Effect<S, R & T, E, A>) =>
    accessServiceM(h)((a) => pipe(accessM(e), provide((a as any) as T)))
}

export function accessRegion<K, T>(h: Tag<Region<T, K>>) {
  return <A>(e: (_: T) => A) =>
    accessServiceM(h)((a) => pipe(access(e), provide((a as any) as T)))
}

export function readRegion<K, T>(h: Tag<Region<T, K>>) {
  return accessServiceM(h)((a) =>
    pipe(
      access((r: T) => r),
      provide((a as any) as T)
    )
  )
}

export function readServiceIn<A>(_: Tag<A>) {
  return <K, T>(h: Tag<Region<Has<A> & T, K>>) =>
    useRegion(h)(
      accessServiceM(_)((a) =>
        pipe(
          access((r: A) => r),
          provide((a as any) as A)
        )
      )
    )
}

export function accessServiceIn<A>(_: Tag<A>) {
  return <K, T>(h: Tag<Region<Has<A> & T, K>>) => <B>(f: (_: A) => B) =>
    useRegion(h)(
      accessServiceM(_)((a) =>
        pipe(
          access((r: A) => f(r)),
          provide((a as any) as A)
        )
      )
    )
}

export function accessServiceInM<A>(_: Tag<A>) {
  return <K, T>(h: Tag<Region<Has<A> & T, K>>) => <S, R, E, B>(
    f: (_: A) => Effect<S, R, E, B>
  ) =>
    useRegion(h)(
      accessServiceM(_)((a) =>
        pipe(
          accessM((r: A) => f(r)),
          provide((a as any) as A)
        )
      )
    )
}
