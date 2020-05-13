import type { SyncRE } from "../Effect"
import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]: M[k][h] extends FunctionN<
      infer ARG,
      Effect<infer _S, infer _R, infer E, infer A>
    >
      ? unknown extends _S
        ? FunctionN<ARG, Effect<any, any, E, A>>
        : FunctionN<ARG, SyncRE<any, E, A>>
      : M[k][h] extends Effect<infer _S, infer _R, infer E, infer A>
      ? unknown extends _S
        ? Effect<any, any, E, A>
        : SyncRE<any, E, A>
      : never
  }
}
