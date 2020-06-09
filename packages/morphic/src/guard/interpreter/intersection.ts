import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { fold, monoidAll } from "@matechs/core/Monoid"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  IntersectionConfig,
  MatechsAlgebraIntersection1
} from "@matechs/morphic-alg/intersection"

export const guardIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection1<GuardURI, Env> => ({
    _F: GuardURI,
    intersection: <A>(
      types: ((env: Env) => GuardType<A>)[],
      config?: {
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const guards = types.map((getGuard) => getGuard(env).guard)
      return new GuardType<A>(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is A => fold(monoidAll)(guards.map((guard) => guard.is(u)))
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
