export declare const URI: unique symbol

export interface Typeclass<F extends HKT> {
  readonly [URI]?: F
}

export interface HKT {
  readonly X?: unknown
  readonly I?: unknown
  readonly R?: unknown
  readonly E?: unknown
  readonly A?: unknown
  readonly type?: unknown
}

export type Kind<F extends HKT, X, I, R, E, A> = F extends { readonly type: unknown }
  ? (F & {
      readonly X: X
      readonly I: I
      readonly R: R
      readonly E: E
      readonly A: A
    })["type"]
  : {
      readonly _F: F
      readonly X: X
      readonly I: I
      readonly _R: (_: R) => void
      readonly _E: () => E
      readonly _A: () => A
    }

export interface ComposeF<F extends HKT, G extends HKT> extends HKT {
  readonly type: Kind<
    F,
    this["X"],
    this["I"],
    this["R"],
    this["E"],
    Kind<G, this["X"], this["I"], this["R"], this["E"], this["A"]>
  >
}

/**
 * @ets_optimize identity
 */
export function instance<T>(_: T): T {
  return _ as any
}
