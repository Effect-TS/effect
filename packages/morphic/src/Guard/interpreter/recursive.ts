import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"
import type { AOfGuard } from "./common"

export const guardRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<GuardURI, Env> => ({
    _F: GuardURI,
    recursive: <A>(
      a: (x: (env: Env) => GuardType<A>) => (env: Env) => GuardType<A>,
      config?: {
        name?: string
        config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new GuardType(
          pipe(
            () => get()(env).guard,
            (getGuard) =>
              guardApplyConfig(config?.config)(
                {
                  is: (u): u is AOfGuard<ReturnType<typeof getGuard>> =>
                    getGuard().is(u)
                },
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
