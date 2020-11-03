import { circularDeepEqual } from "fast-equals"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqUnknownInterpreter = interpreter<EqURI, UnknownURI>()(() => ({
  _F: EqURI,
  unknown: (cfg) => (env) =>
    new EqType(
      eqApplyConfig(cfg?.conf)(
        { equals: (y) => (x) => circularDeepEqual(x, y) },
        env,
        {}
      )
    )
}))
