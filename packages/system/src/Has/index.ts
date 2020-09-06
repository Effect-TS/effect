/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

/**
 * URI used in Has
 */
export declare const HasURI: unique symbol

/**
 * Has signal presence of a specific service provided via Tag in the environment
 */
export interface Has<T> {
  [HasURI]: {
    _T: () => T
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

/**
 * Tag Encodes capabilities of reading and writing a service T into a generic environment
 */
export interface Tag<T> {
  _T: T
  key: symbol
  def: boolean
  overridable: () => Tag<T>
  fixed: () => Tag<T>
  refine: <T1 extends T>() => Tag<T1>
  read: (r: Has<T>) => T
  setKey: (s: symbol) => Tag<T>
  of: (_: T) => Has<T>
}

/**
 * Extract the Has type from any augumented variant
 */
export type HasType<T> = [T] extends [Tag<infer A>] ? Has<A> : never

const makeTag = <T>(def = false, key = Symbol()): Tag<T> => ({
  _T: undefined as any,
  key,
  def,
  of: (t) => ({ [key]: t } as any),
  overridable: () => makeTag(true, key),
  fixed: () => makeTag(false, key),
  refine: () => makeTag(def, key),
  read: (r: Has<T>) => r[key],
  setKey: (s: symbol) => makeTag(def, s)
})

/**
 * Create a service entry Tag from a type and a URI
 */
export function has<T extends Constructor<any>>(_: T): Tag<ConstructorType<T>>
export function has<T>(): Tag<T>
export function has(_?: any): Tag<unknown> {
  return makeTag()
}

/**
 * Get the type of a Has
 */
export type InnerHasType<T> = [T] extends [Has<infer A>] ? A : never

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn = <T>(_: Tag<T>, f: (t: T) => T) => <R>(
  r: R & Has<T>
): R & Has<T> => ({
  ...r,
  [_.key]: f(r[_.key])
})

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn_ = <R, T>(
  r: R & Has<T>,
  _: Tag<T>,
  f: (t: T) => T
): R & Has<T> =>
  ({
    ...r,
    [_.key]: f(r[_.key])
  } as any)

/**
 * Flags the current Has to be overridable, when this is used subsequently provided
 * environments will override pre-existing. Useful to provide defaults.
 */
export const overridable = <T>(h: Tag<T>): Tag<T> => ({
  ...h,
  def: true
})

export function mergeEnvironments<T, R1>(_: Tag<T>, r: R1, t: T): R1 & Has<T> {
  return _.def && r[_.key]
    ? r
    : ({
        ...r,
        [_.key]: t
      } as any)
}

export class DerivationContext {
  readonly hasMap = new Map<Tag<any>, Tag<any>>()

  derive<T, T2>(has: Tag<T>, f: () => Tag<T2>): Tag<T2> {
    const inMap = this.hasMap.get(has)

    if (inMap) {
      return inMap
    }

    const computed = f()

    this.hasMap.set(has, computed)

    return computed
  }
}
