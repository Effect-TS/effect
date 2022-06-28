export const TMapSym = Symbol.for("@effect/core/stm/TMap")
export type TMapSym = typeof TMapSym

export const _K = Symbol.for("@effect/core/stm/TMap/K")
export type _K = typeof _K

export const _V = Symbol.for("@effect/core/stm/TMap/V")
export type _V = typeof _V

/**
 * @tsplus type effect/core/stm/TMap
 */
export interface TMap<K, V> {
  readonly [TMapSym]: TMapSym
  readonly [_K]: () => K
  readonly [_V]: () => V
}

/**
 * @tsplus type effect/core/stm/TMap.Ops
 */
export interface TMapOps {
  $: TMapAspects
}
export const TMap: TMapOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TMap.Aspects
 */
export interface TMapAspects {}
