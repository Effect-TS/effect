// ets_tracing: off

import type { Param } from "./fix.js"
import type { Kind, URIS } from "./kind.js"

export type Infer<F extends URIS, C, P extends Param | "A" | "C", K> = [K] extends [
  Kind<
    F,
    C,
    infer K,
    infer Q,
    infer W,
    infer X,
    infer I,
    infer S,
    infer R,
    infer E,
    infer A
  >
]
  ? P extends "C"
    ? C
    : P extends "K"
    ? K
    : P extends "Q"
    ? Q
    : P extends "W"
    ? W
    : P extends "X"
    ? X
    : P extends "I"
    ? I
    : P extends "S"
    ? S
    : P extends "R"
    ? R
    : P extends "E"
    ? E
    : P extends "A"
    ? A
    : never
  : never
