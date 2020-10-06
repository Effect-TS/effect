import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

export const guardUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<GuardURI, Env> => ({
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
