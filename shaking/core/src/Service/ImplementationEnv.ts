import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

import type { UnionToIntersection } from "./UnionToIntersection"

export type ImplementationEnv<I> = UnionToIntersection<
  {
    [k in keyof I]: {
      [h in keyof I[k]]: I[k][h] extends FunctionN<any, infer K>
        ? K extends Effect<any, infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : never
        : I[k][h] extends Effect<any, infer R, any, any>
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof I[k]]
  }[keyof I]
>
