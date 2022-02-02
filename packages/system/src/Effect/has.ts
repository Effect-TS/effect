// ets_tracing: off

/**
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

import * as A from "../Collections/Immutable/Array/index.js"
import * as R from "../Collections/Immutable/Dictionary/index.js"
import * as core from "../Effect/core.js"
import type { Effect } from "../Effect/effect.js"
import type { Has, Tag } from "../Has/index.js"
import { mergeEnvironments } from "../Has/index.js"
import { accessCallTrace } from "../Tracing/index.js"
import type { UnionToIntersection } from "../Utils/index.js"

/**
 * Access a record of services with the required Service Entries
 */
export function accessServicesM<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Effect<R, E, B>,
    __trace?: string
  ) =>
    core.accessM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any),
      __trace
    )
}

/**
 * Access a tuple of services with the required Service Entries monadically
 */
export function accessServicesTM<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Effect<R, E, B>,
    __trace?: string
  ) =>
    core.accessM(
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

/**
 * Access a tuple of services with the required Service Entries
 */
export function accessServicesT<SS extends Tag<any>[]>(...s: SS) {
  return <B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => B,
    __trace?: string
  ) =>
    core.access(
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

/**
 * Access a record of services with the required Service Entries
 */
export function accessServices<SS extends Record<string, Tag<any>>>(s: SS) {
  return <B>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => B,
    __trace?: string
  ) =>
    core.access(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any),
      __trace
    )
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceM<T>(s: Tag<T>) {
  return <R, E, B>(f: (a: T) => Effect<R, E, B>, __trace?: string) =>
    core.accessM((r: Has<T>) => f(r[s.key as any]), __trace)
}

/**
 * Access a service with the required Service Entry
 */
export function accessService<T>(s: Tag<T>) {
  return <B>(f: (a: T) => B, __trace?: string) =>
    accessServiceM(s)((a) => core.succeed(f(a)), __trace)
}

/**
 * Accesses the specified service in the environment of the effect.
 */
export function service<T>(s: Tag<T>, __trace?: string) {
  return accessServiceM(s)(core.succeed, __trace)
}

/**
 * Accesses the specified services in the environment of the effect.
 *
 * @ets_trace call
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return core.access(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any,
    accessCallTrace()
  )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideServiceM<T>(_: Tag<T>) {
  return <R, E>(service: Effect<R, E, T>, __trace?: string) =>
    <R1, E1, A1>(ma: Effect<R1 & Has<T>, E1, A1>): Effect<R & R1, E | E1, A1> =>
      core.accessM((r: R & R1) =>
        core.chain_(service, (t) =>
          core.provideAll_(ma, mergeEnvironments(_, r, t), __trace)
        )
      )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideServiceM_<R1, E1, A1, R, E, T>(
  ma: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  service: Effect<R, E, T>,
  __trace?: string
): Effect<R & R1, E | E1, A1> {
  return core.accessM((r: R & R1) =>
    core.chain_(service, (t) =>
      core.provideAll_(ma, mergeEnvironments(_, r, t), __trace)
    )
  )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T, __trace?: string) =>
    <R1, E1, A1>(ma: Effect<R1 & Has<T>, E1, A1>): Effect<R1, E1, A1> =>
      provideServiceM(_)(core.succeed(service), __trace)(ma)
}

/**
 * Provides the service with the required Service Entry
 */
export function provideService_<R1, E1, A1, T>(
  ma: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  service: T,
  __trace?: string
): Effect<R1, E1, A1> {
  return provideServiceM(_)(core.succeed(service), __trace)(ma)
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __trace?: string
) {
  return <R1, E1, A1>(
    ma: Effect<R1 & Has<T>, E1, A1>
  ): Effect<R & R1 & Has<T>, E | E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(f(t), __trace)(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __trace?: string
): Effect<R & R1 & Has<T>, E | E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(f(t), __trace)(ma))
}

/**
 * Replaces the service with the required Service Entry
 *
 * @ets_data_first replaceService_
 */
export function replaceService<T>(_: Tag<T>, f: (_: T) => T, __trace?: string) {
  return <R1, E1, A1>(ma: Effect<R1 & Has<T>, E1, A1>): Effect<R1 & Has<T>, E1, A1> =>
    replaceService_(ma, _, f, __trace)
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): Effect<R1 & Has<T>, E1, A1> {
  return accessServiceM(_)((t) =>
    provideServiceM(_)(
      core.succeedWith(() => f(t)),
      __trace
    )(ma)
  )
}
