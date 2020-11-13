import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderRecursiveInterpreter = interpreter<ReorderURI, RecursiveURI>()(
  () => ({
    _F: ReorderURI,
    recursive: (a, config) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new ReorderType(
          pipe(
            () => get()(env).reorder,
            (getReorder) =>
              reorderApplyConfig(config?.conf)(
                {
                  reorder: (u) => getReorder().reorder(u)
                },
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
