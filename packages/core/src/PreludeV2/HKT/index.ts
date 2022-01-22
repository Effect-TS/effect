import type { UnionToIntersection } from "../../Utils/index.js"

export declare const URI: unique symbol

export interface Typeclass<F extends HKT> {
  readonly [URI]?: F
}

export interface HKT {
  readonly R?: unknown
  readonly E?: unknown
  readonly A?: unknown
  readonly type?: unknown
}

export type Kind<F extends HKT, R, E, A> = F extends { readonly type: unknown }
  ? (F & {
      readonly R: R
      readonly E: E
      readonly A: A
    })["type"]
  : {
      readonly _F: F
      readonly _R: (_: R) => void
      readonly _E: () => E
      readonly _A: () => A
    }

// @todo: re-check this with fixed types
export type Infer<F extends HKT, P extends "R" | "E" | "A", K> = [K] extends [
  Kind<F, infer R, infer E, infer A>
]
  ? P extends "R"
    ? R
    : P extends "E"
    ? E
    : P extends "A"
    ? A
    : never
  : never

export interface ComposeF<F extends HKT, G extends HKT> extends HKT {
  readonly type: Kind<F, this["R"], this["E"], Kind<G, this["R"], this["E"], this["A"]>>
}

/**
 * @ets_optimize identity
 */
export function instance<T>(_: T): T {
  return _ as any
}

export function intersect<As extends any[]>(
  ...as: As
): UnionToIntersection<As[number]> {
  const y = {}
  for (let i = 0; i < as.length; i++) {
    Object.assign(y, as[i])
  }
  // @ts-expect-error
  return y
}
