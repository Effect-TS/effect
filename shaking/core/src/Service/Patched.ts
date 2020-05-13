import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

export type Patched<A, B> = B extends FunctionN<
  infer ARG,
  Effect<infer S, infer R, infer E, infer RET>
>
  ? FunctionN<ARG, Effect<S, R, E, RET>> extends B
    ? FunctionN<ARG, Effect<S, R & A, E, RET>>
    : "polymorphic signature not supported"
  : B extends Effect<infer S, infer R, infer E, infer RET>
  ? Effect<S, R, E, RET> extends B
    ? Effect<S, R & A, E, RET>
    : never
  : never
