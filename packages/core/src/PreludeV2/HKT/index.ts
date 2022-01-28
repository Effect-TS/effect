export declare const URI: unique symbol

export interface Typeclass<F extends HKT> {
  readonly [URI]?: F
}

export interface HKT {
  readonly X?: unknown
  readonly I?: unknown
  readonly S?: unknown
  readonly R?: unknown
  readonly E?: unknown
  readonly A?: unknown
  readonly type?: unknown
}

export type Kind<F extends HKT, X, I, S, R, E, A> = F extends { readonly type: unknown }
  ? (F & {
      readonly X: X
      readonly I: I
      readonly S: S
      readonly R: R
      readonly E: E
      readonly A: A
    })["type"]
  : {
      readonly _F: F
      readonly X: X
      readonly I: I
      readonly S: S
      readonly _R: (_: R) => void
      readonly _E: () => E
      readonly _A: () => A
    }

export interface ComposeF<F extends HKT, G extends HKT> extends HKT {
  readonly type: Kind<
    F,
    this["X"],
    this["I"],
    this["S"],
    this["R"],
    this["E"],
    Kind<G, this["X"], this["I"], this["S"], this["R"], this["E"], this["A"]>
  >
}
