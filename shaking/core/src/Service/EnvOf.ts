import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

export type EnvOf<F> = F extends FunctionN<
  infer _ARG,
  Effect<infer _S, infer R, infer _E, infer _A>
>
  ? R
  : F extends Effect<infer _S, infer R, infer _E, infer _A>
  ? R
  : never
