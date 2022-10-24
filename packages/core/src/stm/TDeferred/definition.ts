/**
 * @category symbol
 * @since 1.0.0
 */
export const TDeferredSym = Symbol.for("@effect/core/stm/TDeferred")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TDeferredSym = typeof TDeferredSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/stm/TDeferred/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TDeferred/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * @tsplus type effect/core/stm/TDeferred
 * @category model
 * @since 1.0.0
 */
export interface TDeferred<E, A> {
  readonly [TDeferredSym]: TDeferredSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TDeferred.Ops
 * @category model
 * @since 1.0.0
 */
export interface TDeferredOps {
  $: TDeferredAspects
}
export const TDeferred: TDeferredOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TDeferred.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TDeferredAspects {}
