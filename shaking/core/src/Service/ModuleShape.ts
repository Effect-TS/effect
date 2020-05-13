import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

export type ModuleShape<M> = {
  [k in keyof M]: {
    [h in Exclude<keyof M[k], symbol>]:
      | FunctionN<any, Effect<any, any, any, any>>
      | Effect<any, any, any, any>
  } &
    {
      [h in Extract<keyof M[k], symbol>]: never
    }
}
