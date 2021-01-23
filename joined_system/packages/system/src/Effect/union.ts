import type { _A, _E, _R } from "../Utils"
import type { Effect } from "./effect"

/**
 * Compact the union produced by the result of f
 *
 * @optimize identity
 */
export function unionFn<ARGS extends any[], Ret extends Effect<any, any, any>>(
  _: (...args: ARGS) => Ret
): (...args: ARGS) => Effect<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}

/**
 * Compact the union
 *
 * @optimize identity
 */
export function union<Ret extends Effect<any, any, any>>(
  _: Ret
): Effect<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}
