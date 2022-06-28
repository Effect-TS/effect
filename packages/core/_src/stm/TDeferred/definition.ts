export const TDeferredSym = Symbol.for("@effect/core/stm/TDeferred")
export type TDeferredSym = typeof TDeferredSym

export const _E = Symbol.for("@effect/core/stm/TDeferred/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/stm/TDeferred/A")
export type _A = typeof _A

/**
 * @tsplus type effect/core/stm/TDeferred
 */
export interface TDeferred<E, A> {
  readonly [TDeferredSym]: TDeferredSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TDeferred.Ops
 */
export interface TDeferredOps {
  $: TDeferredAspects
}
export const TDeferred: TDeferredOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TDeferred.Aspects
 */
export interface TDeferredAspects {}
