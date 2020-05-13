import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

import type { EnvOf } from "./EnvOf"
import type { Implementation } from "./Implementation"
import type { ModuleShape } from "./ModuleShape"

export type OnlyNew<M extends ModuleShape<M>, I extends Implementation<M>> = {
  [k in keyof I & keyof M]: {
    [h in keyof I[k] & keyof M[k] & string]: I[k][h] extends FunctionN<
      infer ARG,
      Effect<infer S, infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? FunctionN<ARG, Effect<S, R, E, A>>
      : I[k][h] extends Effect<infer S, infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? Effect<S, R, E, A>
      : never
  }
}
