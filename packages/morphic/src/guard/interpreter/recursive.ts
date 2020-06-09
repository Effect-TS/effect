import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { AOfGuard } from "./common"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive1,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

export const guardRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<GuardURI, Env> => ({
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
          introduce(() => get()(env).guard)((getGuard) =>
            guardApplyConfig(config?.config)(
              {
                is: (u): u is AOfGuard<ReturnType<typeof getGuard>> => getGuard().is(u)
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
