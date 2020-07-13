import { UnionToIntersection } from "../../Base/Overloads"
import * as R from "../../Record"
import { access } from "../Effect/access"
import { accessM } from "../Effect/accessM"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
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
export interface Has<T, K> {
  [HasURI]: {
    _T: () => T
    _K: () => K
    key: symbol
    def: boolean
    name?: string
    brand: string
  }
}

/**
 * Extract the type of a class constructor
 */
export type TypeOf<K extends Constructor<any>> = K extends {
  prototype: infer T
}
  ? T
  : never

export type Constructor<T> = Function & { prototype: T }

export type Augumented<T, K> = Has<T, K> & {
  overridable: () => Augumented<T, K>
  fixed: () => Augumented<T, K>
  refine: <T1 extends T>() => Augumented<T1, K>
  read: (r: Has<T, K>) => T
  at: (s: symbol) => Augumented<T, K>
}

/**
 * Extract Has the type from any augumented variant
 */
export type HasType<T> = T extends Has<infer A, infer K> ? Has<A, K> : never

/**
 * Create a service entry from a type and a URI
 */
export function has<T extends Constructor<any>>(
  _: T
): {
  <K extends string>(k: K): Augumented<TypeOf<T>, K>
  (): Augumented<TypeOf<T>, {}>
}
export function has<T>(): {
  <K extends string>(k: K): Augumented<T, K>
  (): Augumented<T, {}>
}
export function has(_?: any): (k?: string) => Augumented<unknown, unknown> {
  return (k) => {
    const inner = (def = false, key = Symbol()) => {
      const h = {
        [HasURI]: {
          _T: undefined as any,
          _K: undefined as any,
          key,
          def,
          brand: k || "n/a"
        }
      }
      return {
        ...h,
        overridable: () => inner(true),
        fixed: () => inner(false),
        refine: () => inner(def),
        read: (r: any) => r[key],
        at: (s: symbol) => inner(def, s)
      }
    }

    return inner()
  }
}

/**
 * Get the type of a Has
 */
export type InnerHasType<T> = T extends Has<infer A, any> ? A : never

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
      [k in keyof SS]: SS[k] extends Has<infer T, any> ? T : unknown
    }
  ) => Effect<S, R, E, B>
) =>
  accessM(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T, infer K> ? Has<T, K> : unknown
        }[keyof SS]
      >
    ) => f(R.map_(s, (v) => r[v[HasURI].key]) as any)
  )

/**
 * Access a record of services with the required Service Entries
 */
export const accessServices = <SS extends Record<string, Has<any, any>>>(s: SS) => <B>(
  f: (
    a: {
      [k in keyof SS]: SS[k] extends Has<infer T, any> ? T : unknown
    }
  ) => B
) =>
  access(
    (
      r: UnionToIntersection<
        {
          [k in keyof SS]: SS[k] extends Has<infer T, infer K> ? Has<T, K> : unknown
        }[keyof SS]
      >
    ) => f(R.map_(s, (v) => r[v[HasURI].key]) as any)
  )

/**
 * Access a service with the required Service Entry
 */
export const accessServiceM = <T, K>(s: Has<T, K>) => <S, R, E, B>(
  f: (a: T) => Effect<S, R, E, B>
) => accessM((r: Has<T, K>) => f(r[s[HasURI].key as any]))

/**
 * Access a service with the required Service Entry
 */
export const accessService = <T, K>(s: Has<T, K>) => <B>(f: (a: T) => B) =>
  accessServiceM(s)((a) => succeedNow(f(a)))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideServiceM = <T, K>(_: Has<T, K>) => <S, R, E>(
  f: Effect<S, R, E, T>
) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>
): Effect<S | S1, R & R1, E | E1, A1> =>
  accessM((r: R & R1) => chain_(f, (t) => provideAll_(ma, mergeEnvironments(_, r, t))))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideService = <T, K>(_: Has<T, K>) => (f: T) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>
): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeedNow(f))(ma)

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM = <S, R, E, T, K>(
  _: Has<T, K>,
  f: (_: T) => Effect<S, R, E, T>
) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>
): Effect<S | S1, R & R1 & Has<T, K>, E | E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM_ = <S, R, E, T, K, S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>,
  _: Has<T, K>,
  f: (_: T) => Effect<S, R, E, T>
): Effect<S | S1, R & R1 & Has<T, K>, E | E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService = <T, K>(_: Has<T, K>, f: (_: T) => T) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>
): Effect<S1, R1 & Has<T, K>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService_ = <S1, R1, E1, A1, T, K>(
  ma: Effect<S1, R1 & Has<T, K>, E1, A1>,
  _: Has<T, K>,
  f: (_: T) => T
): Effect<S1, R1 & Has<T, K>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn = <T, K>(_: Has<T, K>, f: (t: T) => T) => <R>(
  r: R & Has<T, K>
): R & Has<T, K> =>
  ({
    ...r,
    [_[HasURI].key]: f(r[_[HasURI].key as any])
  } as any)

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn_ = <R, T, K>(
  r: R & Has<T, K>,
  _: Has<T, K>,
  f: (t: T) => T
): R & Has<T, K> =>
  ({
    ...r,
    [_[HasURI].key]: f(r[_[HasURI].key as any])
  } as any)

/**
 * Flags the current Has to be overridable, when this is used subsequently provided
 * environments will override pre-existing. Useful to provide defaults.
 */
export const overridable = <T, K>(h: Has<T, K>): Has<T, K> => ({
  [HasURI]: {
    ...h[HasURI],
    def: true
  }
})

export function mergeEnvironments<T, K, R1>(_: Has<T, K>, r: R1, t: T): R1 & Has<T, K> {
  return _[HasURI].def && r[_[HasURI].key as any]
    ? r
    : ({
        ...r,
        [_[HasURI].key]: t
      } as any)
}

export class DerivationContext {
  readonly hasMap = new Map<Augumented<any, any>, Augumented<any, any>>()

  derive<T, K, T2, K2>(
    has: Augumented<T, K>,
    f: (k: K) => Augumented<T2, K2>
  ): Augumented<T2, K2> {
    const inMap = this.hasMap.get(has)

    if (inMap) {
      return inMap
    }

    const computed = f(has[HasURI].brand as any)

    this.hasMap.set(has, computed)

    return computed
  }
}
