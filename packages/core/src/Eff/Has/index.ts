import { UnionToIntersection } from "../../Base/Overloads"
import * as R from "../../Record"
import { access } from "../Effect/access"
import { accessM } from "../Effect/accessM"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { provideAll_ } from "../Effect/provideAll_"
import { succeedNow } from "../Effect/succeedNow"

/**
 * Encodes a Map of services
 */
export type ServiceMap = Map<any, any>

/**
 * Identifies the Service Map in the effect environment
 */
export const HasURI = "@matechs/core/Eff/Has/HasURI"
export interface HasRegistry {
  [HasURI]: {
    serviceMap: ServiceMap
  }
}

/**
 * An empty registry to begin environment
 */
export const empty = (): HasRegistry => ({
  [HasURI]: {
    serviceMap: new Map()
  }
})

/**
 * Encodes a Service Entry
 */
export interface Has<K, T> {
  _K: () => K
  _T: T
  get: (sm: ServiceMap) => T
  set: (sm: ServiceMap, _: T) => ServiceMap
}

/**
 * Create a service entry from a type and a URI
 */
export const has = <K>(k: K): (<T>() => Has<K, T>) => () => ({
  _K: undefined as any,
  _T: undefined as any,
  get: (sm) => sm.get(k),
  set: (sm, t) => new Map(sm).set(k, t)
})

/**
 * Extract the type of a class constructor
 */
export type TypeOf<K extends Constructor<any>> = K extends {
  prototype: infer T
}
  ? T
  : never

export type Constructor<T> = Function & { prototype: T }

/**
 * Create a service entry from a class
 */
export const hasClass = <K extends Constructor<any>, U = unknown>(
  k: K,
  u?: U
): Has<unknown extends U ? K : U, TypeOf<K>> => ({
  _K: undefined as any,
  _T: undefined as any,
  get: (sm) => sm.get(k),
  set: (sm, t) => new Map(sm).set(k, t)
})

/**
 * Refine a service entry output
 */
export const hasAs = <T>() => <K>(_: Has<K, T>): Has<K, T> => _

/**
 * Create a service entry from a scope and a service entry
 */
export const hasScoped = <K>(k: K) => <T>(_: Has<any, T>): Has<K, T> => ({
  _K: undefined as any,
  _T: undefined as any,
  get: (sm) => _.get(sm.get(k)),
  set: (sm, t) =>
    sm.get(k)
      ? new Map(sm).set(k, _.set(sm.get(k), t))
      : new Map(sm).set(k, _.set(new Map(), t))
})

/**
 * Access a record of services with the required Service Entries
 */
export const accessServicesM = <SS extends Record<string, Has<any, any>>>(s: SS) => <
  S,
  R = unknown,
  E = never,
  B = unknown
>(
  f: (
    a: {
      [k in keyof SS]: SS[k] extends Has<any, infer T> ? T : unknown
    }
  ) => Effect<S, R, E, B>
) =>
  accessM((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => v.get(r[HasURI].serviceMap)) as any)
  )

/**
 * Access a record of services with the required Service Entries
 */
export const accessServices = <SS extends Record<string, Has<any, any>>>(s: SS) => <B>(
  f: (
    a: {
      [k in keyof SS]: SS[k] extends Has<any, infer T> ? T : unknown
    }
  ) => B
) =>
  access((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => v.get(r[HasURI].serviceMap)) as any)
  )

/**
 * Access a service with the required Service Entry
 */
export const accessServiceM = <K, T>(s: Has<K, T>) => <S, R, E, B>(
  f: (a: T) => Effect<S, R, E, B>
) => accessM((r: Has<K, T>) => f(s.get(r[HasURI].serviceMap)))

/**
 * Access a service with the required Service Entry
 */
export const accessService = <K, T>(s: Has<K, T>) => <B>(f: (a: T) => B) =>
  accessServiceM(s)((a) => succeedNow(f(a)))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideServiceM = <K, T>(_: Has<K, T>) => <S, R, E>(
  f: Effect<S, R, E, T>
) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<K, T>, E1, A1>
): Effect<S | S1, R & R1, E | E1, A1> =>
  accessM((r: R & R1) =>
    chain_(f, (t) =>
      provideAll_(ma, {
        ...r,
        [HasURI]: {
          serviceMap: _.set(r[HasURI].serviceMap, t)
        }
      } as any)
    )
  )

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideService = <K, T>(_: Has<K, T>) => (f: T) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<K, T>, E1, A1>
): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeedNow(f))(ma)
