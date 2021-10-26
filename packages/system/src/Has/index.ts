// ets_tracing: off

import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { Option } from "../Option"
import { fromNullable, none } from "../Option"

/**
 * URI used in Has
 */
export declare const HasURI: unique symbol

export interface Service<T extends symbol> {
  readonly serviceId: T
}

export interface AnyService extends Service<symbol> {}

export function BaseService<T extends symbol>(serviceId: T) {
  return class BaseService implements Service<T> {
    readonly serviceId: T = serviceId
  }
}

export type Flat<A> = { readonly [k in keyof A]: A[k] } extends infer X ? X : never

export function service<T extends symbol, X extends Record<PropertyKey, unknown>>(
  t: T,
  x: X
): Flat<X & { readonly serviceId: T }> {
  // @ts-expect-error
  return { ...x, serviceId: t }
}

/**
 * Has signal presence of a specific service provided via Tag in the environment
 */
export type Has<T extends AnyService> = {
  [k in T["serviceId"]]: T
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
export interface Tag<T extends AnyService> {
  _tag: "Tag"
  _T: T
  key: T["serviceId"]
  def: boolean
  overridable: () => Tag<T>
  fixed: () => Tag<T>
  read: (r: Has<T>) => T
  readOption: (r: unknown) => Option<T>
  of: (_: T) => Has<T>
}

/**
 * Extract the Has type from any augumented variant
 */

const makeTag = <T extends AnyService>(def = false, key: T["serviceId"]): Tag<T> => ({
  _tag: "Tag",
  _T: undefined as any,
  key,
  def,
  of: (t) => ({ [key]: t } as any),
  overridable: () => makeTag(true, key),
  fixed: () => makeTag(false, key),
  read: (r: Has<T>) => r[key],
  readOption: (r: unknown) =>
    // @ts-expect-error
    typeof r === "object" && r !== null && key in r ? fromNullable(r[key]) : none
})

/**
 * Create a service entry Tag from a type and a URI
 */
export function tag<T extends AnyService>(_: T["serviceId"]): Tag<T> {
  return makeTag(false, _)
}

/**
 * Get the service type of a Has
 */
export type ServiceType<T> = [T] extends [Has<infer A>] ? A : never

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn =
  <T extends AnyService>(_: Tag<T>, f: (t: T) => T) =>
  <R>(r: R & Has<T>): R & Has<T> => ({
    ...r,
    [_.key]: f(r[_.key])
  })

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export const replaceServiceIn_ = <R, T extends AnyService>(
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
export const overridable = <T extends AnyService>(h: Tag<T>): Tag<T> => ({
  ...h,
  def: true
})

export function mergeEnvironments<T extends AnyService, R1 extends {}>(
  _: Tag<T>,
  r: R1,
  t: T
): R1 & Has<T> {
  // @ts-expect-error
  return _.def && r[_.key]
    ? r
    : ({
        ...r,
        [_.key]: t
      } as any)
}
