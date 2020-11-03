import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { accessFC, FastCheckType, FastCheckURI, fcApplyConfig } from "../base"

export const fcRecursiveInterpreter = interpreter<FastCheckURI, RecursiveURI>()(() => ({
  _F: FastCheckURI,
  recursive: (f, config) => {
    const get = memo(() => f(res))
    const res: any = (env: any) =>
      pipe(
        () => get()(env).arb,
        (getArb) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env)
                .constant(null)
                .chain((_) => getArb()),
              env,
              {
                getArb
              }
            )
          )
      )

    return res
  }
}))
