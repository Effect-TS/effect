/**
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as A from "../Array"
import { access, accessM, chain_, provideAll_, succeed } from "../Effect/core"
import type { Effect } from "../Effect/effect"
import { provide } from "../Effect/provide"
import { pipe } from "../Function"
import type { Augmented, Has } from "../Has"
import { has, HasURI, mergeEnvironments } from "../Has"
import * as R from "../Record"
import type { UnionToIntersection } from "../Utils"

/**
 * Access a record of services with the required Service Entries
 */
export const accessServicesM = <SS extends Record<string, Has<any>>>(s: SS) => <
  S,
  R = unknown,
  E = never,
  B = unknown
>(
  f: (
    a: {
      [k in keyof SS]: SS[k] extends Has<infer T> ? T : unknown
    }
  ) => Effect<S, R, E, B>
) =>
  accessM(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T> ? Has<T> : unknown
        }[keyof SS]
      >
    ) => f(R.map_(s, (v) => r[v[HasURI].key]) as any)
  )

export const accessServicesTM = <SS extends Has<any>[]>(...s: SS) => <
  S,
  R = unknown,
  E = never,
  B = unknown
>(
  f: (
    ...a: {
      [k in keyof SS]: SS[k] extends Has<infer T> ? T : unknown
    }
  ) => Effect<S, R, E, B>
) =>
  accessM(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T> ? Has<T> : never
        }[keyof SS & number]
      >
    ) => f(...(A.map_(s, (v) => r[v[HasURI].key]) as any))
  )

export const accessServicesT = <SS extends Has<any>[]>(...s: SS) => <B = unknown>(
  f: (
    ...a: {
      [k in keyof SS]: SS[k] extends Has<infer T> ? T : unknown
    }
  ) => B
) =>
  access(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T> ? Has<T> : never
        }[keyof SS & number]
      >
    ) => f(...(A.map_(s, (v) => r[v[HasURI].key]) as any))
  )

/**
 * Access a record of services with the required Service Entries
 */
export const accessServices = <SS extends Record<string, Has<any>>>(s: SS) => <B>(
  f: (
    a: {
      [k in keyof SS]: SS[k] extends Has<infer T> ? T : unknown
    }
  ) => B
) =>
  access(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T> ? Has<T> : unknown
        }[keyof SS]
      >
    ) => f(R.map_(s, (v) => r[v[HasURI].key]) as any)
  )

/**
 * Access a service with the required Service Entry
 */
export const accessServiceM = <T>(s: Has<T>) => <S, R, E, B>(
  f: (a: T) => Effect<S, R, E, B>
) => accessM((r: Has<T>) => f(r[s[HasURI].key as any]))

/**
 * Access a service with the required Service Entry
 */
export const accessServiceF = <T>(s: Has<T>) => <
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

/**
 * Access a service with the required Service Entry
 */
export const accessService = <T>(s: Has<T>) => <B>(f: (a: T) => B) =>
  accessServiceM(s)((a) => succeed(f(a)))

/**
 * Access a service with the required Service Entry
 */
export const readService = <T>(s: Has<T>) => accessServiceM(s)((a) => succeed(a))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideServiceM = <T>(_: Has<T>) => <S, R, E>(f: Effect<S, R, E, T>) => <
  S1,
  R1,
  E1,
  A1
>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S | S1, R & R1, E | E1, A1> =>
  accessM((r: R & R1) => chain_(f, (t) => provideAll_(ma, mergeEnvironments(_, r, t))))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideService = <T>(_: Has<T>) => (f: T) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeed(f))(ma)

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM = <S, R, E, T>(
  _: Has<T>,
  f: (_: T) => Effect<S, R, E, T>
) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S | S1, R & R1 & Has<T>, E | E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM_ = <S, R, E, T, S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Has<T>,
  f: (_: T) => Effect<S, R, E, T>
): Effect<S | S1, R & R1 & Has<T>, E | E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService = <T>(_: Has<T>, f: (_: T) => T) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S1, R1 & Has<T>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService_ = <S1, R1, E1, A1, T>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Has<T>,
  f: (_: T) => T
): Effect<S1, R1 & Has<T>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))

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

export const region = <K, T>(): Augmented<Region<T, K>> => has<Region<T, K>>()

export const useRegion = <K, T>(h: Has<Region<T, K>>) => <S, R, E, A>(
  e: Effect<S, R & T, E, A>
) => accessServiceM(h)((a) => pipe(e, provide((a as any) as T)))

export const accessRegionM = <K, T>(h: Has<Region<T, K>>) => <S, R, E, A>(
  e: (_: T) => Effect<S, R & T, E, A>
) => accessServiceM(h)((a) => pipe(accessM(e), provide((a as any) as T)))

export const accessRegion = <K, T>(h: Has<Region<T, K>>) => <A>(e: (_: T) => A) =>
  accessServiceM(h)((a) => pipe(access(e), provide((a as any) as T)))

export const readRegion = <K, T>(h: Has<Region<T, K>>) =>
  accessServiceM(h)((a) =>
    pipe(
      access((r: T) => r),
      provide((a as any) as T)
    )
  )

export const readServiceIn = <A>(_: Has<A>) => <K, T>(h: Has<Region<Has<A> & T, K>>) =>
  useRegion(h)(
    accessServiceM(_)((a) =>
      pipe(
        access((r: A) => r),
        provide((a as any) as A)
      )
    )
  )

export const accessServiceIn = <A>(_: Has<A>) => <K, T>(
  h: Has<Region<Has<A> & T, K>>
) => <B>(f: (_: A) => B) =>
  useRegion(h)(
    accessServiceM(_)((a) =>
      pipe(
        access((r: A) => f(r)),
        provide((a as any) as A)
      )
    )
  )

export const accessServiceInM = <A>(_: Has<A>) => <K, T>(
  h: Has<Region<Has<A> & T, K>>
) => <S, R, E, B>(f: (_: A) => Effect<S, R, E, B>) =>
  useRegion(h)(
    accessServiceM(_)((a) =>
      pipe(
        accessM((r: A) => f(r)),
        provide((a as any) as A)
      )
    )
  )
