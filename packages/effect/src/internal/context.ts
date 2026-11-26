import type { Context, Reference } from "../Context.ts"
import { defaultValueCacheKey } from "./fiberCachedKeys.ts"

/** @internal */
export interface Overlay {
  readonly key: string
  readonly value: unknown
  readonly parent: Overlay | undefined
}

/** @internal */
export interface ContextImpl<in Services> extends Context<Services> {
  cacheRoot: ContextImpl<any> | undefined
  base: ReadonlyMap<string, any>
  baseHits: number
  overlay: Overlay | undefined
  depth: number
  _flat: ReadonlyMap<string, any> | undefined
  maxDepth: number
  _lookup?(key: string): unknown
}

// A private symbol so user code cannot forge a value that reads as absent
/** @internal */
export const notFound = Symbol()

/** @internal */
export const lookup = <Services = never>(self: Context<Services>, key: string): unknown => {
  const impl = self as ContextImpl<any>
  if (impl._lookup !== undefined) return impl._lookup(key)
  const value = impl.base.get(key)
  return value === undefined && !impl.base.has(key) ? notFound : value
}

interface CachedReference<Shape> extends Reference<Shape> {
  [defaultValueCacheKey]?: Shape
}

/** @internal */
export const getDefaultValue = <Shape>(ref: Reference<Shape>): Shape => {
  const cached: CachedReference<Shape> = ref
  if (defaultValueCacheKey in cached) {
    return cached[defaultValueCacheKey] as Shape
  }
  return (cached[defaultValueCacheKey] = ref.defaultValue())
}
