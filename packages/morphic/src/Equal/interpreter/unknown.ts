import { circularDeepEqual } from "fast-equals"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<EqURI, Env> => ({
    _F: EqURI,
    unknown: (cfg) => (env) =>
      new EqType(
        eqApplyConfig(cfg?.conf)(
          { equals: (y) => (x) => circularDeepEqual(x, y) },
          env,
          {}
        )
      )
  })
)
