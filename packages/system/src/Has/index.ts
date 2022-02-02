// ets_tracing: off

import "../Operator/index.js"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { Option } from "../Option/index.js"
import { fromNullable, none } from "../Option/index.js"

export type Flat<A> = { readonly [k in keyof A]: A[k] } extends infer X ? X : never

export function service<X extends Record<PropertyKey, unknown>>(x: X): Flat<X> {
  // @ts-expect-error
  return x
}

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
  _tag: "Tag"
  _T: T
  key: PropertyKey
  read: (r: Has<T>) => T
  readOption: (r: unknown) => Option<T>
  has: (_: T) => Has<T>
  of: (_: T) => T
  refine: <T1 extends T>() => Tag<T1>
}

/**
 * Extract the Has type from any augumented variant
 */

const makeTag = <T>(key: PropertyKey = Symbol()): Tag<T> => ({
  _tag: "Tag",
  _T: undefined as any,
  key,
  has: (t) => ({ [key]: t } as any),
  of: (t) => t,
  read: (r: Has<T>) => r[key],
  readOption: (r: unknown) =>
    typeof r === "object" && r !== null ? fromNullable(r[key]) : none,
  refine: () => makeTag(key)
})

/**
 * Create a service entry Tag from a type and a URI
 */
export function tag<T>(key?: PropertyKey): Tag<T> {
  return makeTag(key)
}

/**
 * Get the service type of a Has
 */
export type ServiceType<T> = [T] extends [Has<infer A>] ? A : never

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn =
  <T>(_: Tag<T>, f: (t: T) => T) =>
  <R>(r: R & Has<T>): R & Has<T> => ({
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
): R & Has<T> => ({
  ...r,
  ..._.has(f(r[_.key]))
})

export function mergeEnvironments<T, R1 extends {}>(
  _: Tag<T>,
  r: R1,
  t: T
): R1 & Has<T> {
  return {
    ...r,
    ..._.has(t)
  }
}
