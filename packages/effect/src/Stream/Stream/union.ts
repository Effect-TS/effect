import type { _A, _E, _R } from "../../Utils"
import type { Stream } from "./definitions"

/**
 * Compact the union produced by the result of f
 */
export function unionFn<ARGS extends any[], Ret extends Stream<any, any, any>>(
  _: (...args: ARGS) => Ret
): (...args: ARGS) => Stream<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}

/**
 * Compact the union
 */
export function union<Ret extends Stream<any, any, any>>(
  _: Ret
): Stream<_R<Ret>, _E<Ret>, _A<Ret>> {
  return _ as any
}
