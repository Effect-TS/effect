import { all, fold } from "@effect-ts/core/Classic/Identity"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

export const guardIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<GuardURI, Env> => ({
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
            is: (u): u is A => fold(all)(guards.map((guard) => guard.is(u)))
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
