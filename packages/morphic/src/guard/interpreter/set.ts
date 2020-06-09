import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { AOfGuard } from "./common"

import type { Array } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import type { Ord } from "@matechs/core/Ord"
import { Set, every_ } from "@matechs/core/Set"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet1, SetConfig } from "@matechs/morphic-alg/set"

export const guardSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<GuardURI, Env> => ({
    _F: GuardURI,
    set: <A>(
      a: (env: Env) => GuardType<A>,
      _: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      introduce(a(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Set<AOfGuard<typeof guard>> =>
                  u instanceof Set && every_(u, guard.is)
              },
              env,
              { guard }
            )
          )
      )
  })
)
