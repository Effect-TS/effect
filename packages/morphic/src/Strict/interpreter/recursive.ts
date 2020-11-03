import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictRecursiveInterpreter = interpreter<StrictURI, RecursiveURI>()(
  () => ({
    _F: StrictURI,
    recursive: (a, config) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new StrictType(
          pipe(
            () => get()(env).strict,
            (getStrict) =>
              strictApplyConfig(config?.conf)(
                {
                  shrink: (u) => getStrict().shrink(u)
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
