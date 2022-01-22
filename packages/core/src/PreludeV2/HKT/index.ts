import type { InitialVariance, MixVariance } from "./variance"

export declare const URI: unique symbol

export interface Typeclass<F extends HKT> {
  readonly [URI]?: F
}

type Param = "X" | "I" | "S" | "R" | "E" | "A"
type ParamVariance<P extends Param> = {
  X: "_"
  I: "_"
  S: "_"
  R: "-"
  E: "+"
  A: "+"
}[P]

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

// Initial type pere parameterized type depending on variance
export type Initial<P extends Param> = {
  X: InitialVariance<ParamVariance<"X">>
  I: InitialVariance<ParamVariance<"I">>
  S: InitialVariance<ParamVariance<"S">>
  R: InitialVariance<ParamVariance<"R">>
  E: InitialVariance<ParamVariance<"E">>
  A: InitialVariance<ParamVariance<"A">>
}[P]

export type Mix<P extends Param, X extends [any, ...any[]]> = {
  X: MixVariance<ParamVariance<"X">, X>
  I: MixVariance<ParamVariance<"I">, X>
  S: MixVariance<ParamVariance<"S">, X>
  R: MixVariance<ParamVariance<"R">, X>
  E: MixVariance<ParamVariance<"E">, X>
  A: MixVariance<ParamVariance<"A">, X>
}[P]
