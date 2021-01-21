import type { Auto } from "./base"
import type { V } from "./variance"

export type Param = "N" | "K" | "Q" | "W" | "I" | "X" | "S" | "R" | "E"

export interface Fix<P extends Param, F> {
  Fix: {
    [p in P]: {
      F: () => F
    }
  }
}

export type OrFix<P extends Param, A, B> = A extends Fix<P, infer X>
  ? P extends "N"
    ? X extends string
      ? X
      : B
    : X
  : B

export type CleanParam<C, P extends Param> = C extends (
  | Auto
  | V<P, "_">
  | V<P, "+">
  | Fix<P, any>
) &
  infer X
  ? X
  : C
