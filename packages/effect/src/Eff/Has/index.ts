import { UnionToIntersection } from "../../Base/Overloads"
import { Branded, _brand } from "../../Branded"
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
export type ServiceMap = {}

/**
 * Encodes a Service Entry
 */
export const HasURI = "@matechs/core/Eff/Has/HasURI"
export interface Has<T> {
  [HasURI]: {
    _T: () => T
    key: symbol
    def: boolean
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

export const symbolMap = new Map<any, symbol>()
export const brandedMap = new Map<any, Map<any, symbol>>()

export const symbolForInMap = (t: any | undefined, map: Map<any, symbol>) => {
  if (t) {
    const x = map.get(t)

    if (x) {
      return x
    }

    const s = Symbol()

    map.set(t, s)

    return s
  } else {
    return Symbol()
  }
}

export const symbolFor = (t: any | undefined, k: any | undefined) => {
  if (k) {
    if (!brandedMap.has(k)) {
      brandedMap.set(k, new Map())
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return symbolForInMap(t, brandedMap.get(k)!)
  } else {
    return symbolForInMap(t, symbolMap)
  }
}

/**
 * Create a service entry from a type and a URI
 */
export function has<T extends Constructor<any>>(
  _: T
): {
  <K extends string | symbol>(k: K): Has<Branded<TypeOf<T>, K>>
  <K>(k: K): Has<Branded<TypeOf<T>, K>>
  (): Has<TypeOf<T>>
}
export function has<T>(
  _?: any
): {
  <K extends string | symbol>(k: K): Has<Branded<T, K>>
  <K>(k: K): Has<Branded<T, K>>
  (): Has<T>
}
export function has(t?: unknown): (k?: unknown) => Has<unknown> {
  return (k) => ({
    [HasURI]: {
      _T: undefined as any,
      _K: undefined as any,
      key: symbolFor(t, k),
      def: false
    }
  })
}

/**
 * Remove the brand from the type if present
 */
export type Unbrand<T> = T extends Branded<infer A, any> ? A : T

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
      [k in keyof SS]: SS[k] extends Has<infer T> ? Unbrand<T> : unknown
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
      [k in keyof SS]: SS[k] extends Has<infer T> ? Unbrand<T> : unknown
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
  f: (a: Unbrand<T>) => Effect<S, R, E, B>
) => accessM((r: Has<T>) => f(r[s[HasURI].key as any]))

/**
 * Access a service with the required Service Entry
 */
export const accessService = <T>(s: Has<T>) => <B>(f: (a: Unbrand<T>) => B) =>
  accessServiceM(s)((a) => succeedNow(f(a)))

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const provideServiceM = <T>(_: Has<T>) => <S, R, E>(
  f: Effect<S, R, E, Unbrand<T>>
) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
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
export const provideService = <T>(_: Has<T>) => (f: Unbrand<T>) => <S1, R1, E1, A1>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S1, R1, E1, A1> => provideServiceM(_)(succeedNow(f))(ma)

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM = <S, R, E, T>(
  _: Has<T>,
  f: (_: Unbrand<T>) => Effect<S, R, E, Unbrand<T>>
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
  f: (_: Unbrand<T>) => Effect<S, R, E, Unbrand<T>>
): Effect<S | S1, R & R1 & Has<T>, E | E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService = <T>(_: Has<T>, f: (_: Unbrand<T>) => Unbrand<T>) => <
  S1,
  R1,
  E1,
  A1
>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>
): Effect<S1, R1 & Has<T>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService_ = <S1, R1, E1, A1, T>(
  ma: Effect<S1, R1 & Has<T>, E1, A1>,
  _: Has<T>,
  f: (_: Unbrand<T>) => Unbrand<T>
): Effect<S1, R1 & Has<T>, E1, A1> =>
  accessServiceM(_)((t) => provideServiceM(_)(succeedNow(f(t)))(ma))

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn = <T>(_: Has<T>, f: (t: Unbrand<T>) => Unbrand<T>) => <R>(
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
  f: (t: Unbrand<T>) => Unbrand<T>
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
