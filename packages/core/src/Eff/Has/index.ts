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

/**
 * Encodes a Service Entry
 */
export const HasURI = "@matechs/core/Eff/Has/HasURI"
export interface Has<T, K> {
  [HasURI]: {
    _T: () => T
    _K: (_: K) => void
    key: string
    def: boolean
  }
}

export const _symbols = new Map<any, number>()
export const _current = new AtomicNumber(0)

export const format = (n: number) => `services-${n}`

export const progressiveFor = (a: any) => {
  const maybeIndex = _symbols.get(a)

  if (maybeIndex) {
    return format(maybeIndex)
  }

  const current = _current.incrementAndGet()

  _symbols.set(a, current)

  return format(current)
}

/**
 * Create a service entry from a type and a URI
 */
export function has<K extends string | symbol>(k: K): <T>() => Has<T, K>
export function has<K>(k: K): <T>() => Has<T, K>
export function has<K>(k: K): <T>() => Has<T, K> {
  return () => ({
    [HasURI]: {
      _T: undefined as any,
      _K: undefined as any,
      key: progressiveFor(k),
      def: false
    }
  })
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

/**
 * Create a service entry from a class
 */
export function hasClass<T extends Constructor<any>>(_: T): Has<TypeOf<T>, T>
export function hasClass<T extends Constructor<any>, K extends string | symbol>(
  _: T,
  k: K
): Has<TypeOf<T>, K>
export function hasClass<T extends Constructor<any>, K>(_: T, k: K): Has<TypeOf<T>, K>
export function hasClass<T extends Constructor<any>>(
  _: T,
  k?: any
): Has<TypeOf<T>, unknown> {
  return {
    [HasURI]: {
      _T: undefined as any,
      _K: undefined as any,
      key: k ? progressiveFor(k) : progressiveFor(_),
      def: false
    }
  }
}

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
  accessM((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => r[v[HasURI].key]) as any)
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
  access((r: UnionToIntersection<SS[keyof SS]>) =>
    f(R.map_(s, (v) => r[v[HasURI].key]) as any)
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
  accessM((r: R & R1) =>
    chain_(f, (t) =>
      provideAll_(
        ma,
        _[HasURI].def && r[_[HasURI].key as any]
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
export const replaceServiceM_ = <S, R, E, T, S1, R1, E1, A1, K>(
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
