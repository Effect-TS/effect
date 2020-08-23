export type Param = "N" | "K" | "I" | "X" | "S" | "R" | "E"

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
