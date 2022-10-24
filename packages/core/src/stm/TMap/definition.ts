/**
 * @category symbol
 * @since 1.0.0
 */
export const TMapSym = Symbol.for("@effect/core/stm/TMap")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TMapSym = typeof TMapSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _K = Symbol.for("@effect/core/stm/TMap/K")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _K = typeof _K

/**
 * @category symbol
 * @since 1.0.0
 */
export const _V = Symbol.for("@effect/core/stm/TMap/V")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _V = typeof _V

/**
 * Transactional map implemented on top of TRef and TArray. Resolves
 * conflicts via chaining.
 *
 * @tsplus type effect/core/stm/TMap
 * @category model
 * @since 1.0.0
 */
export interface TMap<K, V> {
  readonly [TMapSym]: TMapSym
  readonly [_K]: () => K
  readonly [_V]: () => V
}

/**
 * @tsplus type effect/core/stm/TMap.Ops
 * @category model
 * @since 1.0.0
 */
export interface TMapOps {
  $: TMapAspects
}
export const TMap: TMapOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TMap.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TMapAspects {}
