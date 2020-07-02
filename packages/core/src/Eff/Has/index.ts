import { UnionToIntersection } from "../../Base/Overloads"
import * as R from "../../Record"
import { access } from "../Effect/access"
import { accessM } from "../Effect/accessM"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { provideAll_ } from "../Effect/provideAll_"
import { succeedNow } from "../Effect/succeedNow"
import { AtomicNumber } from "../Support/AtomicNumber"

/**
 * Encodes a Map of services
 */
export type ServiceMap = {}

export const _current = new AtomicNumber(0)

/**
 * Encodes a Service Entry
 */
export const HasURI = "@matechs/core/Eff/Has/HasURI"
export interface Has<T> {
  [HasURI]: {
    _T: T
    key: string | symbol
    def: boolean
  }
}

/**
 * Create a service entry from a type and a URI
 */
export const has = <T>(): Has<T> => ({
  [HasURI]: {
    _T: undefined as any,
    key: `@services/${_current.incrementAndGet()}`,
    def: false
  }
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
export const hasClass = <K extends Constructor<any>>(_: K): Has<TypeOf<K>> => ({
  [HasURI]: {
    _T: undefined as any,
    key: `@services/${_current.incrementAndGet()}`,
    def: false
  }
})

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
  accessM((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => r[v[HasURI].key]) as any)
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
  access((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => r[v[HasURI].key]) as any)
  )

/**
 * Access a service with the required Service Entry
 */
export const accessServiceM = <T>(s: Has<T>) => <S, R, E, B>(
  f: (a: T) => Effect<S, R, E, B>
) => accessM((r: Has<T>) => f(r[s[HasURI].key]))

/**
 * Access a service with the required Service Entry
 */
export const accessService = <T>(s: Has<T>) => <B>(f: (a: T) => B) =>
  accessServiceM(s)((a) => succeedNow(f(a)))

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
  accessM((r: R & R1) =>
    chain_(f, (t) =>
      provideAll_(
        ma,
        _[HasURI].def && r[_[HasURI].key]
          ? r
          : ({
              ...r,
              [_[HasURI].key]: t
            } as any)
      )
    )
  )

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
    [_[HasURI].key]: f(r[_[HasURI].key])
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
    [_[HasURI].key]: f(r[_[HasURI].key])
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
