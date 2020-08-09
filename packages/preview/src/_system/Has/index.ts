/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

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

export interface Agumentation<T> {
  overridable: () => Agumented<T>
  fixed: () => Agumented<T>
  refine: <T1 extends T>() => Agumented<T1>
  read: (r: Has<T>) => T
  at: (s: symbol) => Agumented<T>
}

export interface Agumented<T> extends Has<T>, Agumentation<T> {}

/**
 * Extract the Has type from any augumented variant
 */
export type HasType<T> = T extends Has<infer A> ? Has<A> : never

const makeAugumented = <T>(def = false, key = Symbol()): Agumented<T> => ({
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
export function has<T extends Constructor<any>>(_: T): Agumented<ConstructorType<T>>
export function has<T>(): Agumented<T>
export function has(_?: any): Agumented<unknown> {
  return makeAugumented()
}

/**
 * Get the type of a Has
 */
export type InnerHasType<T> = T extends Has<infer A> ? A : never

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
  readonly hasMap = new Map<Agumented<any>, Agumented<any>>()

  derive<T, T2>(has: Agumented<T>, f: () => Agumented<T2>): Agumented<T2> {
    const inMap = this.hasMap.get(has)

    if (inMap) {
      return inMap
    }

    const computed = f()

    this.hasMap.set(has, computed)

    return computed
  }
}
