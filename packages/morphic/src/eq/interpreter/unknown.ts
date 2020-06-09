import { circularDeepEqual } from "fast-equals"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraUnknown1 } from "@matechs/morphic-alg/unknown"

export const eqUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown1<EqURI, Env> => ({
    _F: EqURI,
    unknown: (cfg) => (env) =>
      new EqType(eqApplyConfig(cfg?.conf)({ equals: circularDeepEqual }, env, {}))
  })
)
