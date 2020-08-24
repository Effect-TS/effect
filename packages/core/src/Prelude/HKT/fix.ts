import type { Erase } from "../../Utils"
import type { Auto } from "./base"
import type { Strip } from "./variance"

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

export type Unfix<C, P extends Param> = (Exclude<keyof C, "Fix"> extends never
  ? unknown
  : {
      [K in Exclude<keyof C, "Fix">]: C[K]
    }) &
  (keyof C & "Fix" extends never
    ? unknown
    : {
        [K in keyof C & "Fix"]: {
          [KK in Exclude<keyof C[K], P>]: C[K][KK]
        }
      })

export type CleanParam<C, P extends Param> = Unfix<Erase<Strip<C, P>, Auto>, P>
