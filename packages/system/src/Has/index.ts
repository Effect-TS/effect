// ets_tracing: off

import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { Option } from "../Option"
import { fromNullable, none } from "../Option"
import type { IsEqualTo, UnionToIntersection } from "../Utils"

/**
 * URI used in Has
 */
export declare const HasURI: unique symbol

export interface Service<T extends PropertyKey> {
  readonly serviceId: T
}

export interface AnyService extends Service<PropertyKey> {}

export function BaseService<T extends PropertyKey>(serviceId: T) {
  return class BaseService implements Service<T> {
    readonly serviceId: T = serviceId
  }
}

export type Flat<A> = { readonly [k in keyof A]: A[k] } extends infer X ? X : never

export function service<T extends PropertyKey, X extends Record<PropertyKey, unknown>>(
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
  readonly [k in T["serviceId"]]: T
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

export type ServiceConstructor<T extends AnyService> = Omit<T, "serviceId"> & {
  readonly serviceId?: T["serviceId"]
}

/**
 * Tag Encodes capabilities of reading and writing a service T into a generic environment
 */
export interface Tag<T extends AnyService> {
  _tag: "Tag"
  _T: T
  key: T["serviceId"]
  read: (r: Has<T>) => T
  readOption: (r: unknown) => Option<T>
  has: (_: ServiceConstructor<T>) => Has<T>
  of: (_: ServiceConstructor<T>) => T
}

/**
 * Extract the Has type from any augumented variant
 */

const makeTag = <T extends AnyService>(key: T["serviceId"]): Tag<T> => ({
  _tag: "Tag",
  _T: undefined as any,
  key,
  has: (t) => ({ [key]: "serviceId" in t ? t : { ...t, serviceId: key } } as any),
  of: (t) => ("serviceId" in t ? t : ({ ...t, serviceId: key } as any)),
  read: (r: Has<T>) => r[key],
  readOption: (r: unknown) =>
    // @ts-expect-error
    typeof r === "object" && r !== null && key in r ? fromNullable(r[key]) : none
})

/**
 * Create a service entry Tag from a type and a URI
 */
export function tag<T extends AnyService>(_: T["serviceId"]): Tag<T> {
  return makeTag(_)
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
  f: (t: T) => ServiceConstructor<T>
): R & Has<T> => ({
  ...r,
  ..._.has(f(r[_.key]))
})

export function mergeEnvironments<T extends AnyService, R1 extends {}>(
  _: Tag<T>,
  r: R1,
  t: ServiceConstructor<T>
): R1 & Has<T> {
  return {
    ...r,
    ..._.has(t)
  }
}

export interface Taggable<T> {
  String: [T] extends [string]
    ? IsEqualTo<T, string> extends true
      ? `String<${T}>`
      : "String"
    : never
  Number: [T] extends [number]
    ? [IsEqualTo<T, number>] extends [true]
      ? "Number"
      : `Number<${T}>`
    : never
  Unknown: [T] extends [unknown] ? ([unknown] extends [T] ? "Unknown" : never) : never
}

export declare const _typeTag: unique symbol
export type _typeTag = typeof _typeTag

export type TypeTag<T> = UnionToIntersection<
  [T] extends [never]
    ? "Never"
    : [Taggable<T>[keyof Taggable<any>]] extends [never]
    ? [T] extends [{ readonly serviceId: string }]
      ? T["serviceId"]
      : [T] extends [{ readonly [_typeTag]: string }]
      ? T[_typeTag]
      : [T] extends [{ readonly _tag: string }]
      ? T["_tag"]
      : never
    : Taggable<T>[keyof Taggable<any>]
> extends infer X
  ? X extends string
    ? X
    : never
  : never
