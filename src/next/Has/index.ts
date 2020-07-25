import { UnionToIntersection } from "../../Base/Overloads"
import { pipe } from "../../Function"
import * as R from "../../Record"
import { access } from "../Effect/access"
import { accessM } from "../Effect/accessM"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { provide } from "../Effect/provide"
import { provideAll_ } from "../Effect/provideAll_"
import { succeedNow } from "../Effect/succeedNow"

/**
 * URI used in Has
 */
export const HasURI = Symbol()

/**
 * Has encodes a capability to read and write a service to the
 * environment, additionally encodes if the service should be
 * overridable or not
 */
export interface Has<T> {
  [HasURI]: {
    _T: () => T
    key: symbol
    def: boolean
    name?: string
  }
}

/**
 * Extract the type of a class constructor
 */
export type ConstructorType<K extends Constructor<any>> = K extends {
  prototype: infer T
}
  ? T
  : never

export type Constructor<T> = Function & { prototype: T }

export interface Augumentation<T> {
  overridable: () => Augumented<T>
  fixed: () => Augumented<T>
  refine: <T1 extends T>() => Augumented<T1>
  read: (r: Has<T>) => T
  at: (s: symbol) => Augumented<T>
}

export interface Augumented<T> extends Has<T>, Augumentation<T> {}

/**
 * Extract the Has type from any augumented variant
 */
export type HasType<T> = T extends Has<infer A> ? Has<A> : never

const makeAugumented = <T>(def = false, key = Symbol()): Augumented<T> => ({
  [HasURI]: {
    _T: undefined as any,
    key,
    def
  },
  overridable: () => makeAugumented(true, key),
  fixed: () => makeAugumented(false, key),
  refine: () => makeAugumented(def, key),
  read: (r: any) => r[key],
  at: (s: symbol) => makeAugumented(def, s)
})

/**
 * Create a service entry from a type and a URI
 */
export function has<T extends Constructor<any>>(_: T): Augumented<ConstructorType<T>>
export function has<T>(): Augumented<T>
export function has(_?: any): Augumented<unknown> {
  return makeAugumented()
}

/**
 * Get the type of a Has
 */
export type InnerHasType<T> = T extends Has<infer A> ? A : never

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
  accessServiceM(s)((a) => succeedNow(f(a)))

/**
 * Access a service with the required Service Entry
 */
export const readService = <T>(s: Has<T>) => accessServiceM(s)((a) => succeedNow(a))

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
): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeedNow(f))(ma)

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
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService_ = <S1, R1, E1, A1, T>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Has<T>,
  f: (_: T) => T
): Effect<S1, R1 & Has<T>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn = <T>(_: Has<T>, f: (t: T) => T) => <R>(
  r: R & Has<T>
): R & Has<T> =>
  ({
    ...r,
    [_[HasURI].key]: f(r[_[HasURI].key as any])
  } as any)

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn_ = <R, T>(
  r: R & Has<T>,
  _: Has<T>,
  f: (t: T) => T
): R & Has<T> =>
  ({
    ...r,
    [_[HasURI].key]: f(r[_[HasURI].key as any])
  } as any)

/**
 * Flags the current Has to be overridable, when this is used subsequently provided
 * environments will override pre-existing. Useful to provide defaults.
 */
export const overridable = <T>(h: Has<T>): Has<T> => ({
  [HasURI]: {
    ...h[HasURI],
    def: true
  }
})

export function mergeEnvironments<T, R1>(_: Has<T>, r: R1, t: T): R1 & Has<T> {
  return _[HasURI].def && r[_[HasURI].key as any]
    ? r
    : ({
        ...r,
        [_[HasURI].key]: t
      } as any)
}

export class DerivationContext {
  readonly hasMap = new Map<Augumented<any>, Augumented<any>>()

  derive<T, T2>(has: Augumented<T>, f: () => Augumented<T2>): Augumented<T2> {
    const inMap = this.hasMap.get(has)

    if (inMap) {
      return inMap
    }

    const computed = f()

    this.hasMap.set(has, computed)

    return computed
  }
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

export const region = <K, T>(): Augumented<Region<T, K>> => has<Region<T, K>>()

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
