import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import { every_, Set } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"
import type { AOfGuard } from "./common"

export const guardSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<GuardURI, Env> => ({
    _F: GuardURI,
    set: <A>(
      a: (env: Env) => GuardType<A>,
      _: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        a(env).guard,
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
