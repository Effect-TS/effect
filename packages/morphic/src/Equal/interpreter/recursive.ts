import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqRecursiveInterpreter = interpreter<EqURI, RecursiveURI>()(() => ({
  _F: EqURI,
  recursive: (a, config) => {
    const get = memo(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      new EqType(
        pipe(
          () => get()(env).eq,
          (getEq) => eqApplyConfig(config?.conf)({ equals: getEq().equals }, env, {})
        )
      )
    return res
  }
}))
