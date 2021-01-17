import { all, fold } from "@effect-ts/core/Identity"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"

export const guardIntersectionInterpreter = interpreter<GuardURI, IntersectionURI>()(
  () => ({
    _F: GuardURI,
    intersection: (...types) => (config) => (env) => {
      const guards = types.map((getGuard) => getGuard(env).guard)
      return new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is any => fold(all)(guards.map((guard) => guard.is(u)))
          },
          env,
          {
            guards: guards as any
          }
        )
      )
    }
  })
)
