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

export type Unfix<C, P extends Param> = {
  [K in Exclude<keyof C, "Fix">]: C[K]
} &
  {
    [K in keyof C & "Fix"]: {
      [KK in Exclude<keyof C[K], P>]: C[K][KK]
    }
  }
