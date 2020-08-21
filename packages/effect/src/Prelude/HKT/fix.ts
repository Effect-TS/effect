export type PS = "N" | "K" | "I" | "X" | "S" | "R" | "E" | "A"

export interface Fix<P extends PS, F> {
  Fix: {
    [p in P]: {
      F: () => F
    }
  }
}

export type OrFix<P extends PS, A, B> = A extends Fix<P, infer X>
  ? P extends "N"
    ? X extends string
      ? X
      : B
    : X
  : B
