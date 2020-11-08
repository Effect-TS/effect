import type { _A, _E, _R } from "../../Utils"
import type { Managed } from "../managed"

/**
 * Compact the union produced by the result of f
 */
export function unionFn<ARGS extends any[], Ret extends Managed<any, any, any>>(
  _: (...args: ARGS) => Ret
): (...args: ARGS) => Managed<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}

/**
 * Compact the union
 */
export function union<Ret extends Managed<any, any, any>>(
  _: Ret
): Managed<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}
