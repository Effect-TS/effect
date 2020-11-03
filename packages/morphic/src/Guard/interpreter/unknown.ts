import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"

export const guardUnknownInterpreter = interpreter<GuardURI, UnknownURI>()(() => ({
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
}))
