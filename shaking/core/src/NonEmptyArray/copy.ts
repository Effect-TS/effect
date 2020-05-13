import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export function copy<A>(nea: NonEmptyArray<A>): NonEmptyArray<A> {
  const l = nea.length
  const as = Array(l)
  for (let i = 0; i < l; i++) {
    as[i] = nea[i]
  }
  return as as any
}
