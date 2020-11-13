import * as A from "@effect-ts/core/Classic/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderIntersectionInterpreter = interpreter<
  ReorderURI,
  IntersectionURI
>()(() => ({
  _F: ReorderURI,
  intersection: (...types) => (config) => (env) => {
    const reorders = types.map((getReorder) => getReorder(env).reorder)

    return new ReorderType(
      reorderApplyConfig(config?.conf)(
        {
          reorder: (u) =>
            pipe(
              reorders,
              A.foreachF(T.Applicative)((d) => d.reorder(u)),
              T.map((u) => {
                const r: any = {}
                u.forEach((o) => {
                  Object.assign(r, o)
                })
                return r
              })
            )
        },
        env,
        {
          reorders: reorders as any
        }
      )
    )
  }
}))
