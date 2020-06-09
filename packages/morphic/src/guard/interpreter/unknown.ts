import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraUnknown1 } from "@matechs/morphic-alg/unknown"

export const guardUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown1<GuardURI, Env> => ({
    _F: GuardURI,
    unknown: (cfg) => (env) =>
      new GuardType(
        guardApplyConfig(cfg?.conf)(
          {
            is: (u): u is unknown => true
          },
          env,
          {}
        )
      )
  })
)
