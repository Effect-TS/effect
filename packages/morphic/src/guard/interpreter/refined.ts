import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { AOfGuard } from "./common"

import { introduce, Refinement } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

type BOfRefinement<X> = X extends Refinement<infer A, infer B> ? B : never

export const guardRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<GuardURI, Env> => ({
    _F: GuardURI,
    refined: (getGuard, ref, config) => (env) =>
      introduce(getGuard(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is BOfRefinement<typeof ref> => guard.is(u) && ref(u)
              },
              env,
              { guard }
            )
          )
      ),
    constrained: (getGuard, ref, config) => (env) =>
      introduce(getGuard(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is AOfGuard<typeof guard> => guard.is(u) && ref(u)
              },
              env,
              { guard }
            )
          )
      )
  })
)
