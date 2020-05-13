import type { Effect } from "../Support/Common"

export type InferR<F> = F extends (...args: any[]) => Effect<any, infer Q, any, any>
  ? Q
  : F extends Effect<any, infer Q, any, any>
  ? Q
  : never
